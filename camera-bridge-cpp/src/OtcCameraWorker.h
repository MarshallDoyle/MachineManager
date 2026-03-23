#pragma once

#include <string>
#include <vector>
#include <mutex>
#include <atomic>
#include <iostream>
#include <memory>
#include <cstring>

#include "otcsdk/Sdk.h"
#include "otcsdk/IRImager.h"
#include "otcsdk/IRImagerClient.h"
#include "otcsdk/IRImagerFactory.h"
#include "otcsdk/IRImagerConfig.h"
#include "otcsdk/ImageBuilder.h"
#include "otcsdk/enumeration/EnumerationManager.h"

#include "FrameMetadata.h"

// stb_image_write.h implementation is in CameraWorker.cpp
#include "stb_image_write.h"

/**
 * OtcCameraWorker: Uses the OTC SDK (optris::IRImager) for Ethernet cameras (Xi 410).
 * This replaces the raw UDP EthernetCameraWorker with proper SDK-managed streaming,
 * calibration, temperature conversion, and NUC handling.
 */
class OtcCameraWorker : public optris::IRImagerClient
{
public:
    OtcCameraWorker(const std::string& name, unsigned long serialNumber, int wsPort,
                    const std::string& ipAddress = "192.168.0.101", int udpPort = 50101)
        : _name(name)
        , _serialNumber(serialNumber)
        , _wsPort(wsPort)
        , _ipAddress(ipAddress)
        , _udpPort(udpPort)
        , _running(false)
        , _frameCount(0)
        , _meanTemp(0.0f)
        , _initialized(false)
        , _imageBuilder(optris::ColorFormat::RGB, optris::WidthAlignment::OneByte)
    {
        _imageBuilder.setPalette(optris::ColoringPalette::Iron);
        _imageBuilder.setPaletteScalingMethod(optris::PaletteScalingMethod::Sigma3);
    }

    ~OtcCameraWorker() { stop(); }

    bool init()
    {
        try
        {
            // Create IRImager via factory
            _imager = optris::IRImagerFactory::getInstance().create("native");
            _imager->addClient(this);

            // Build config with explicit Ethernet connection details
            optris::IRImagerConfig config;
            config.serialNumber = _serialNumber;
            config.connectionInterface = "ethernet";
            config.ipAddress = optris::IpAddress(_ipAddress);
            config.port = static_cast<unsigned short>(_udpPort);
            config.checkIp = true;
            config.connectionTimeout = 10;
            config.autoFlag = true;
            config.minInterval = 15.0f;
            config.maxInterval = 0.0f;

            std::cout << "[" << _name << "] Connecting to camera (serial: " << _serialNumber
                      << ", ip: " << _ipAddress << ", port: " << _udpPort << ")..." << std::endl;
            _imager->connect(config);

            std::cout << "[" << _name << "] Connected via OTC SDK" << std::endl;
            _initialized = true;
            return true;
        }
        catch (const optris::SDKException& ex)
        {
            std::cerr << "[" << _name << "] OTC SDK error: " << ex.what() << std::endl;
            return false;
        }
        catch (const std::exception& ex)
        {
            std::cerr << "[" << _name << "] Error: " << ex.what() << std::endl;
            return false;
        }
    }

    void start()
    {
        if (!_imager || !_initialized) return;
        _running = true;
        try
        {
            _imager->runAsync();
            std::cout << "[" << _name << "] Capture loop started (ws://localhost:" << _wsPort << ")" << std::endl;
        }
        catch (const optris::SDKException& ex)
        {
            std::cerr << "[" << _name << "] Failed to start: " << ex.what() << std::endl;
            _running = false;
        }
    }

    void stop()
    {
        _running = false;
        if (_imager)
        {
            try { _imager->disconnect(); } catch (...) {}
            _imager.reset();
        }
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

    // Camera control methods
    void setPalette(int palette)
    {
        _imageBuilder.setPalette(static_cast<optris::ColoringPalette>(palette));
        std::cout << "[" << _name << "] Palette set to " << palette << std::endl;
    }

    void setScalingMethod(int method)
    {
        _imageBuilder.setPaletteScalingMethod(static_cast<optris::PaletteScalingMethod>(method));
        std::cout << "[" << _name << "] Scaling method set to " << method << std::endl;
    }

    void setManualRange(float min, float max)
    {
        _imageBuilder.setManualTemperatureRange(min, max);
        std::cout << "[" << _name << "] Manual range set to " << min << " - " << max << std::endl;
    }

    void setEmissivity(float emissivity)
    {
        if (_imager)
        {
            try
            {
                optris::RadiationParameters params;
                params.emissivity = emissivity;
                params.transmissivity = 1.0f;
                params.ambientTemperature = -100.0f; // SDK auto-estimates
                _imager->setRadiationParameters(params);
                std::cout << "[" << _name << "] Emissivity set to " << emissivity << std::endl;
            }
            catch (const optris::SDKException& ex)
            {
                std::cerr << "[" << _name << "] Failed to set emissivity: " << ex.what() << std::endl;
            }
        }
    }

    void forceFlagCycle()
    {
        if (_imager)
        {
            try
            {
                _imager->forceFlagEvent();
                std::cout << "[" << _name << "] Flag cycle forced" << std::endl;
            }
            catch (const optris::SDKException& ex)
            {
                std::cerr << "[" << _name << "] Failed to force flag: " << ex.what() << std::endl;
            }
        }
    }

private:
    static void stbiWriteCallback(void* context, void* data, int size)
    {
        auto* vec = static_cast<std::vector<unsigned char>*>(context);
        auto* bytes = static_cast<unsigned char*>(data);
        vec->insert(vec->end(), bytes, bytes + size);
    }

    // OTC SDK callback — called from the imager's async thread
    void onThermalFrame(const optris::ThermalFrame& thermal, const optris::FrameMetadata& meta) override
    {
        if (!_running) return;

        int w = thermal.getWidth();
        int h = thermal.getHeight();

        // Set thermal frame in ImageBuilder for false color conversion
        _imageBuilder.setThermalFrame(thermal);

        // Convert to false color image
        _imageBuilder.convertTemperatureToPaletteImage();

        // Get the rendered image data
        const optris::Image& image = _imageBuilder.getImage();
        int imgW = image.getWidth();
        int imgH = image.getHeight();
        int stride = image.getStride();
        int sizeBytes = image.getSizeInBytes();

        // Copy image data — strip stride padding if present
        std::vector<unsigned char> rgb(imgW * imgH * 3);
        if (stride == imgW * 3)
        {
            // No padding, direct copy
            image.copyDataTo(rgb.data(), sizeBytes);
        }
        else
        {
            // Has padding, copy row by row
            std::vector<unsigned char> rawImg(sizeBytes);
            image.copyDataTo(rawImg.data(), sizeBytes);
            for (int y = 0; y < imgH; y++)
                memcpy(&rgb[y * imgW * 3], &rawImg[y * stride], imgW * 3);
        }

        // Compute metadata
        FrameMetadata fmeta;

        // Mean temperature of entire frame
        optris::TemperatureRegion meanRegion(0, 0, w - 1, h - 1);
        if (_imageBuilder.getMeanTemperatureInRegion(meanRegion))
            fmeta.mean = meanRegion.temperature;
        else
            fmeta.mean = thermal.getTemperature(w / 2, h / 2);

        // Hot/cold spots
        optris::TemperatureRegion minRegion, maxRegion;
        if (_imageBuilder.getMinMaxRegions(3, minRegion, maxRegion))
        {
            fmeta.hotX = (maxRegion.x1 + maxRegion.x2) / 2;
            fmeta.hotY = (maxRegion.y1 + maxRegion.y2) / 2;
            fmeta.hotT = maxRegion.temperature;
            fmeta.coldX = (minRegion.x1 + minRegion.x2) / 2;
            fmeta.coldY = (minRegion.y1 + minRegion.y2) / 2;
            fmeta.coldT = minRegion.temperature;
            fmeta.min = minRegion.temperature;
            fmeta.max = maxRegion.temperature;
        }

        fmeta.scaleMin = _imageBuilder.getIsothermalMin();
        fmeta.scaleMax = _imageBuilder.getIsothermalMax();
        fmeta.palette = static_cast<int>(_imageBuilder.getPalette());
        fmeta.scaling = static_cast<int>(_imageBuilder.getPaletteScalingMethod());

        _meanTemp = fmeta.mean;

        // Encode to JPEG
        std::vector<unsigned char> jpegBuf;
        jpegBuf.reserve(imgW * imgH);
        stbi_write_jpg_to_func(stbiWriteCallback, &jpegBuf, imgW, imgH, 3, rgb.data(), 85);

        // Store frame packet
        {
            std::lock_guard<std::mutex> lock(_frameMutex);
            _latestPacket.jpeg = std::move(jpegBuf);
            _latestPacket.metadata = fmeta;
        }

        unsigned int fc = ++_frameCount;
        if (fc % 150 == 0)
        {
            std::cout << "[" << _name << "] " << fc << " frames, mean temp: "
                      << _meanTemp.load() << " C" << std::endl;
        }
    }

    void onFlagStateChange(optris::FlagState flagState) override
    {
        std::cout << "[" << _name << "] Flag state: " << flagState << std::endl;
    }

    std::string     _name;
    unsigned long   _serialNumber;
    int             _wsPort;
    std::string     _ipAddress;
    int             _udpPort;
    std::atomic<bool> _running;
    std::atomic<unsigned int> _frameCount;
    std::atomic<float> _meanTemp;
    bool            _initialized;

    std::shared_ptr<optris::IRImager> _imager;
    optris::ImageBuilder _imageBuilder;

    FramePacket     _latestPacket;
    std::mutex      _frameMutex;
};
