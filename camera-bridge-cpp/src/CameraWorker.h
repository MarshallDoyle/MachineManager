#pragma once

// winsock2.h MUST come before windows.h (pulled in by IRDeviceDS.h -> dshow.h)
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>

#include <string>
#include <vector>
#include <mutex>
#include <atomic>
#include <thread>
#include <functional>

#include "IRImager.h"
#include "IRImagerClient.h"
#include "IRDeviceDS.h"
#include "IRDeviceParams.h"
#include "VideoCapture.h"
#include "ImageBuilder.h"
#include "IRCalibrationManager.h"
#include "IRLogger.h"
#include "FrameMetadata.h"

/**
 * CameraWorker: manages a single Optris thermal camera using the Direct SDK.
 * Inherits IRImagerClient to receive raw/thermal frame callbacks.
 * Encodes thermal frames as JPEG and stores them for WebSocket broadcast.
 *
 * DirectShow requires an STA COM thread with a message pump for callbacks
 * to fire. The entire init + streaming runs on a dedicated thread.
 */
class CameraWorker : public evo::IRImagerClient
{
public:
    CameraWorker(const std::string& name, const std::wstring& xmlPath, int wsPort);
    ~CameraWorker();

    /** Initialize and start on a dedicated STA thread. Non-blocking. */
    bool init();

    /** Signal that init succeeded and streaming can begin. Called internally. */
    void start();

    /** Stop streaming and clean up. */
    void stop();

    /** Get the latest frame packet with metadata (thread-safe). */
    FramePacket getLatestFrame();

    /** Get camera name. */
    const std::string& getName() const { return _name; }

    /** Get WebSocket port. */
    int getPort() const { return _wsPort; }

    /** Is the camera streaming? */
    bool isRunning() const { return _running.load(); }

    /** Get mean temperature from the last frame. */
    float getMeanTemp() const { return _meanTemp.load(); }

    /** Get frame count. */
    unsigned int getFrameCount() const { return _frameCount.load(); }

    /** Camera control methods */
    void setPalette(int palette);
    void setScalingMethod(int method);
    void setManualRange(float min, float max);
    void setEmissivity(float emissivity);
    void forceFlagCycle();
    void setTransmissivity(float transmissivity);
    std::string getDeviceTemps();

    // --- IRImagerClient callbacks ---
    void onRawFrame(unsigned char* data, int size) override;
    void onThermalFrame(unsigned short* data, unsigned int w, unsigned int h,
                        evo::IRFrameMetadata meta, void* arg) override;
    void onFlagStateChange(unsigned int flagstate, void* arg) override;

private:
    /** Thread entry: CoInitialize STA, init device, start streaming, run message pump. */
    void threadFunc();

    std::string     _name;
    std::wstring    _xmlPath;
    int             _wsPort;

    evo::IRDeviceParams _params;
    evo::VideoCapture*  _vc;
    evo::IRDeviceDS*    _device;
    evo::IRImager*      _imager;
    evo::ImageBuilder   _iBuilder;

    // Frame output
    FramePacket                _latestPacket;
    std::mutex                 _frameMutex;
    std::atomic<float>         _meanTemp{0.0f};
    std::atomic<unsigned int>  _frameCount{0};
    std::atomic<bool>          _running{false};
    float                      _lastEmissivity{1.0f};
    std::atomic<bool>          _initSuccess{false};

    // RGB buffer for palette conversion
    unsigned char*  _rgbBuffer;
    unsigned int    _thermalW;
    unsigned int    _thermalH;

    // Dedicated STA thread for DirectShow
    std::thread     _dsThread;
};
