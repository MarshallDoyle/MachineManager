#pragma once

// winsock2.h MUST come before windows.h
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>

#include <string>
#include <vector>
#include <mutex>
#include <atomic>
#include <thread>
#include <cstring>
#include <iostream>

#include "ImageBuilder.h"
#include "FrameMetadata.h"

// stb_image_write.h implementation is in CameraWorker.cpp
#include "stb_image_write.h"

/**
 * EthernetCameraWorker: receives raw UDP thermal frames from an Optris Xi 410 Ethernet camera.
 * Based on the Xi410Ethernet EasyComm SDK sample.
 *
 * The Xi 410 sends UDP packets of 770 bytes each:
 *   - byte[0]: row index (0-241)
 *   - byte[1]: frame counter
 *   - byte[2..769]: 384 pixels * 2 bytes (uint16 little-endian temperature data)
 *
 * Row 240 = metadata, Row 241 = end-of-frame marker.
 * Image dimensions: 384 wide x 240 high (242 total rows, 240 image rows).
 * Temperature formula: (highByte * 256 + lowByte - 1000) / 10.0
 */
class EthernetCameraWorker
{
public:
    static const int UDP_PACKAGE_LENGTH = 770;
    static const int PIXELS_PER_ROW = 384;  // image width
    static const int TOTAL_ROWS = 242;      // total rows per frame
    static const int IMAGE_ROWS = 240;      // actual image rows
    static const int META_DATA_ROW = 240;
    static const int END_OF_FRAME_ROW = 241;
    static const int FLAG_INDEX_IN_METADATA = 11;
    static const int IS_TEMPERATURE_MODE_BYTE = 33;
    static const int IS_TEMPERATURE_MODE_BIT = 3;

    EthernetCameraWorker(const std::string& name, int udpPort, int wsPort)
        : _name(name)
        , _udpPort(udpPort)
        , _wsPort(wsPort)
        , _running(false)
        , _frameCount(0)
        , _meanTemp(0.0f)
        , _iBuilder()  // match PI 1M: default stride alignment
    {
        _iBuilder.setPalette(evo::eIron);
        _iBuilder.setPaletteScalingMethod(evo::eSigma3);
        _thermalU16.resize(PIXELS_PER_ROW * IMAGE_ROWS, 0);
    }

    ~EthernetCameraWorker() { stop(); }

    bool init()
    {
        std::cout << "[" << _name << "] Ethernet camera on UDP port " << _udpPort << std::endl;
        return true;
    }

    void start()
    {
        _running = true;
        _udpThread = std::thread(&EthernetCameraWorker::udpReceiveLoop, this);
        std::cout << "[" << _name << "] Capture loop started (ws://localhost:" << _wsPort << ")" << std::endl;
    }

    void stop()
    {
        _running = false;
        if (_sock != INVALID_SOCKET)
        {
            closesocket(_sock);
            _sock = INVALID_SOCKET;
        }
        if (_udpThread.joinable()) _udpThread.join();
        std::cout << "[" << _name << "] Stopped" << std::endl;
    }

    FramePacket getLatestFrame()
    {
        std::lock_guard<std::mutex> lock(_frameMutex);
        return _latestPacket;
    }

    const std::string& getName() const { return _name; }
    int getPort() const { return _wsPort; }
    bool isRunning() const { return _running.load(); }
    float getMeanTemp() const { return _meanTemp.load(); }
    unsigned int getFrameCount() const { return _frameCount.load(); }

    /** Camera control methods */
    void setPalette(int palette)
    {
        _iBuilder.setPalette(static_cast<evo::EnumOptrisColoringPalette>(palette));
        std::cout << "[" << _name << "] Palette set to " << palette << std::endl;
    }

    void setScalingMethod(int method)
    {
        _iBuilder.setPaletteScalingMethod(static_cast<evo::EnumOptrisPaletteScalingMethod>(method));
        std::cout << "[" << _name << "] Scaling method set to " << method << std::endl;
    }

    void setManualRange(float min, float max)
    {
        _iBuilder.setManualTemperatureRange(min, max);
        std::cout << "[" << _name << "] Manual range set to " << min << " - " << max << std::endl;
    }

private:
    static void stbiWriteCallback(void* context, void* data, int size)
    {
        auto* vec = static_cast<std::vector<unsigned char>*>(context);
        auto* bytes = static_cast<unsigned char*>(data);
        vec->insert(vec->end(), bytes, bytes + size);
    }

    void udpReceiveLoop()
    {
        _sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
        if (_sock == INVALID_SOCKET)
        {
            std::cerr << "[" << _name << "] Failed to create UDP socket" << std::endl;
            return;
        }

        int optval = 1;
        setsockopt(_sock, SOL_SOCKET, SO_REUSEADDR, (const char*)&optval, sizeof(optval));

        sockaddr_in listenAddr{};
        listenAddr.sin_family = AF_INET;
        listenAddr.sin_port = htons(static_cast<unsigned short>(_udpPort));
        listenAddr.sin_addr.s_addr = INADDR_ANY;

        if (bind(_sock, (sockaddr*)&listenAddr, sizeof(listenAddr)) == SOCKET_ERROR)
        {
            std::cerr << "[" << _name << "] Failed to bind UDP port " << _udpPort
                      << " (error " << WSAGetLastError() << ")" << std::endl;
            closesocket(_sock);
            _sock = INVALID_SOCKET;
            return;
        }

        std::cout << "[" << _name << "] Listening on UDP port " << _udpPort << std::endl;

        // Frame buffers
        std::vector<double> newImg(TOTAL_ROWS * PIXELS_PER_ROW, 0.0);
        std::vector<double> lastImg(TOTAL_ROWS * PIXELS_PER_ROW, 0.0);
        std::vector<unsigned short> newU16(PIXELS_PER_ROW * IMAGE_ROWS, 0);
        std::vector<unsigned short> lastU16(PIXELS_PER_ROW * IMAGE_ROWS, 0);
        unsigned char metaData[UDP_PACKAGE_LENGTH - 2] = {};
        bool checkedTempMode = false;

        sockaddr_in senderAddr{};
        int senderLen = sizeof(senderAddr);
        unsigned char packet[UDP_PACKAGE_LENGTH];

        while (_running)
        {
            int received = recvfrom(_sock, (char*)packet, UDP_PACKAGE_LENGTH, 0,
                                     (sockaddr*)&senderAddr, &senderLen);

            if (received != UDP_PACKAGE_LENGTH) continue;

            int rowIndex = packet[0];

            // Decode temperature data for image rows
            if (rowIndex < IMAGE_ROWS)
            {
                int offset = rowIndex * PIXELS_PER_ROW;
                for (int i = 0; i < PIXELS_PER_ROW; i++)
                {
                    unsigned short raw = (packet[i * 2 + 3] << 8) | packet[i * 2 + 2];
                    newU16[offset + i] = raw;
                    newImg[i + rowIndex * PIXELS_PER_ROW] = (raw - 1000.0) / 10.0;
                }
            }

            if (rowIndex == META_DATA_ROW)
            {
                memcpy(metaData, &packet[2], UDP_PACKAGE_LENGTH - 2);

                // Check temperature mode on first metadata row
                if (!checkedTempMode)
                {
                    checkedTempMode = true;
                    bool isTempMode = (metaData[IS_TEMPERATURE_MODE_BYTE] & (1 << IS_TEMPERATURE_MODE_BIT)) != 0;
                    if (!isTempMode)
                    {
                        std::cerr << "WARNING: [" << _name << "] Camera appears to be in ADU mode, not Temperature mode. "
                                  << "Set Temperature mode in PIX Connect for correct readings." << std::endl;
                    }
                }
            }

            if (rowIndex == END_OF_FRAME_ROW)
            {
                unsigned char flagstate = metaData[FLAG_INDEX_IN_METADATA];
                if (flagstate == 0)
                {
                    std::copy(newImg.begin(), newImg.end(), lastImg.begin());
                    std::copy(newU16.begin(), newU16.end(), lastU16.begin());
                }

                processFrame(lastImg, lastU16);
            }
        }

        if (_sock != INVALID_SOCKET)
        {
            closesocket(_sock);
            _sock = INVALID_SOCKET;
        }
    }

    void processFrame(const std::vector<double>& img, const std::vector<unsigned short>& thermalU16)
    {
        const int imgW = PIXELS_PER_ROW;  // 384
        const int imgH = IMAGE_ROWS;      // 240

        // Compute statistics directly from the double temperature array
        // (don't rely on ImageBuilder for scale — it may misinterpret raw UDP data)
        int count = imgW * imgH;
        double sum = 0.0;
        for (int i = 0; i < count; i++) sum += img[i];
        double mean = sum / count;

        double varSum = 0.0;
        for (int i = 0; i < count; i++)
        {
            double d = mean - img[i];
            varSum += d * d;
        }
        double sigma3 = std::sqrt(varSum / count) * 3.0;
        double dataMin = mean - sigma3;
        double dataMax = mean + sigma3;

        // Find actual min/max and hot/cold spot locations
        double absMin = img[0], absMax = img[0];
        int minIdx = 0, maxIdx = 0;
        for (int i = 1; i < count; i++)
        {
            if (img[i] < absMin) { absMin = img[i]; minIdx = i; }
            if (img[i] > absMax) { absMax = img[i]; maxIdx = i; }
        }

        FrameMetadata meta;
        meta.mean = static_cast<float>(mean);
        meta.min = static_cast<float>(absMin);
        meta.max = static_cast<float>(absMax);
        meta.scaleMin = static_cast<float>(dataMin);
        meta.scaleMax = static_cast<float>(dataMax);
        meta.hotX = maxIdx % imgW;
        meta.hotY = maxIdx / imgW;
        meta.hotT = static_cast<float>(absMax);
        meta.coldX = minIdx % imgW;
        meta.coldY = minIdx / imgW;
        meta.coldT = static_cast<float>(absMin);
        meta.palette = static_cast<int>(_iBuilder.getPalette());
        meta.scaling = static_cast<int>(_iBuilder.getPaletteScalingMethod());
        _meanTemp = meta.mean;

        // Build RGB image manually using palette table + 3-sigma scale range
        evo::paletteTable palette;
        _iBuilder.getPaletteTable(palette);

        float scaleMin = meta.scaleMin;
        float scaleMax = meta.scaleMax;
        float range = scaleMax - scaleMin;
        if (range < 0.1f) range = 0.1f;

        std::vector<unsigned char> rgb(imgW * imgH * 3);
        for (int y = 0; y < imgH; y++)
        {
            for (int x = 0; x < imgW; x++)
            {
                int srcIdx = y * imgW + x;
                float temp = static_cast<float>(img[srcIdx]);
                float normalized = (temp - scaleMin) / range;
                if (normalized < 0.0f) normalized = 0.0f;
                if (normalized > 1.0f) normalized = 1.0f;
                int palIdx = static_cast<int>(normalized * 255.0f);
                if (palIdx > 255) palIdx = 255;

                int dstIdx = (y * imgW + x) * 3;
                rgb[dstIdx]     = palette[palIdx][0];
                rgb[dstIdx + 1] = palette[palIdx][1];
                rgb[dstIdx + 2] = palette[palIdx][2];
            }
        }

        // Encode to JPEG
        std::vector<unsigned char> jpegBuf;
        jpegBuf.reserve(imgW * imgH);
        stbi_write_jpg_to_func(stbiWriteCallback, &jpegBuf, imgW, imgH, 3, rgb.data(), 85);

        // Store frame packet
        {
            std::lock_guard<std::mutex> lock(_frameMutex);
            _latestPacket.jpeg = std::move(jpegBuf);
            _latestPacket.metadata = meta;
        }

        unsigned int fc = ++_frameCount;
        if (fc % 150 == 0)
        {
            std::cout << "[" << _name << "] " << fc << " frames, mean temp: "
                      << _meanTemp.load() << " C" << std::endl;
        }
    }

    std::string     _name;
    int             _udpPort;
    int             _wsPort;
    std::atomic<bool> _running;
    std::atomic<unsigned int> _frameCount;
    std::atomic<float> _meanTemp;

    SOCKET          _sock = INVALID_SOCKET;
    std::thread     _udpThread;

    FramePacket     _latestPacket;
    std::mutex      _frameMutex;

    // ImageBuilder for SDK-correct palette rendering
    evo::ImageBuilder _iBuilder;
    std::vector<unsigned short> _thermalU16;
};
