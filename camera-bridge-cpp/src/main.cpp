// winsock2.h MUST come before windows.h to avoid winsock.h conflict
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>

#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <chrono>
#include <fstream>
#include <sstream>

#include "IRLogger.h"
#include "CameraWorker.h"
#include "OtcCameraWorker.h"
#include "WebSocketServer.h"
#include "CommandReader.h"
#include "FrameMetadata.h"

#include <nlohmann/json.hpp>
using json = nlohmann::json;

// Track if OTC SDK has been initialized
static bool g_otcSdkInitialized = false;

// Global state for graceful shutdown
static std::atomic<bool> g_running{true};

BOOL WINAPI ctrlHandler(DWORD fdwCtrlType)
{
    switch (fdwCtrlType) {
    case CTRL_C_EVENT:
    case CTRL_CLOSE_EVENT:
    case CTRL_BREAK_EVENT:
        std::cout << "\nShutting down..." << std::endl;
        g_running = false;
        return TRUE;
    default:
        return FALSE;
    }
}

static std::wstring toWide(const std::string& s)
{
    if (s.empty()) return L"";
    int needed = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, nullptr, 0);
    std::wstring result(needed - 1, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, &result[0], needed);
    return result;
}

// Check if XML config has <device_api>5</device_api> (Ethernet camera)
static bool isEthernetCamera(const std::string& xmlPath)
{
    std::ifstream f(xmlPath);
    if (!f.is_open()) return false;
    std::stringstream buf;
    buf << f.rdbuf();
    std::string content = buf.str();
    return content.find("<device_api>5</device_api>") != std::string::npos;
}

// Extract UDP port from XML: <local_udp_port>50101</local_udp_port>
static int getEthernetUdpPort(const std::string& xmlPath)
{
    std::ifstream f(xmlPath);
    if (!f.is_open()) return 50101;
    std::stringstream buf;
    buf << f.rdbuf();
    std::string content = buf.str();
    auto pos = content.find("<local_udp_port>");
    if (pos != std::string::npos)
    {
        pos += 16; // length of "<local_udp_port>"
        auto end = content.find("</local_udp_port>", pos);
        if (end != std::string::npos)
        {
            return std::stoi(content.substr(pos, end - pos));
        }
    }
    return 50101; // default
}

// Extract IP address from XML: <device_ip_address>192.168.0.101</device_ip_address>
static std::string getEthernetIpAddress(const std::string& xmlPath)
{
    std::ifstream f(xmlPath);
    if (!f.is_open()) return "192.168.0.101";
    std::stringstream buf;
    buf << f.rdbuf();
    std::string content = buf.str();
    auto pos = content.find("<device_ip_address>");
    if (pos != std::string::npos)
    {
        pos += 19; // length of "<device_ip_address>"
        auto end = content.find("</device_ip_address>", pos);
        if (end != std::string::npos)
            return content.substr(pos, end - pos);
    }
    return "192.168.0.101";
}

// Extract serial number from XML: <serial>25124018</serial>
static unsigned long getSerialNumber(const std::string& xmlPath)
{
    std::ifstream f(xmlPath);
    if (!f.is_open()) return 0;
    std::stringstream buf;
    buf << f.rdbuf();
    std::string content = buf.str();
    auto pos = content.find("<serial>");
    if (pos != std::string::npos)
    {
        pos += 8; // length of "<serial>"
        auto end = content.find("</serial>", pos);
        if (end != std::string::npos)
        {
            try { return std::stoul(content.substr(pos, end - pos)); }
            catch (...) { return 0; }
        }
    }
    return 0;
}

static void printUsage(const char* argv0)
{
    std::cout << "Usage: " << argv0 << " [--wait] <cam1.xml> [cam2.xml] ..." << std::endl;
    std::cout << std::endl;
    std::cout << "  --wait    Retry camera init indefinitely (for use with Electron)" << std::endl;
    std::cout << "  Each XML config gets a WebSocket port starting at 9801" << std::endl;
    std::cout << "  USB cameras use Direct SDK, Ethernet cameras (device_api=5) use UDP" << std::endl;
}

// Map palette name strings to enum values
static int paletteFromString(const std::string& name)
{
    if (name == "alarmBlue")   return 1;
    if (name == "alarmBlueHi") return 2;
    if (name == "grayBW")      return 3;
    if (name == "grayWB")      return 4;
    if (name == "alarmGreen")  return 5;
    if (name == "iron")        return 6;
    if (name == "ironHi")      return 7;
    if (name == "medical")     return 8;
    if (name == "rainbow")     return 9;
    if (name == "rainbowHi")   return 10;
    if (name == "alarmRed")    return 11;
    return 6; // default: iron
}

static int scalingFromString(const std::string& name)
{
    if (name == "manual") return 1;
    if (name == "minmax") return 2;
    if (name == "sigma1") return 3;
    if (name == "sigma3") return 4;
    return 2; // default: minmax
}

// Abstract interface so we can manage both camera types uniformly
struct ICameraSource {
    virtual ~ICameraSource() = default;
    virtual bool init() = 0;
    virtual void start() = 0;
    virtual void stop() = 0;
    virtual FramePacket getLatestFrame() = 0;
    virtual const std::string& getName() const = 0;
    virtual int getPort() const = 0;
    virtual void setPalette(int palette) = 0;
    virtual void setScalingMethod(int method) = 0;
    virtual void setManualRange(float min, float max) = 0;
    virtual void setEmissivity(float emissivity) = 0;
    virtual void forceFlagCycle() = 0;
};

struct USBCameraAdapter : ICameraSource {
    CameraWorker worker;
    USBCameraAdapter(const std::string& name, const std::wstring& xml, int port) : worker(name, xml, port) {}
    bool init() override { return worker.init(); }
    void start() override { worker.start(); }
    void stop() override { worker.stop(); }
    FramePacket getLatestFrame() override { return worker.getLatestFrame(); }
    const std::string& getName() const override { return worker.getName(); }
    int getPort() const override { return worker.getPort(); }
    void setPalette(int palette) override { worker.setPalette(palette); }
    void setScalingMethod(int method) override { worker.setScalingMethod(method); }
    void setManualRange(float min, float max) override { worker.setManualRange(min, max); }
    void setEmissivity(float emissivity) override { worker.setEmissivity(emissivity); }
    void forceFlagCycle() override { worker.forceFlagCycle(); }
};

struct OtcCameraAdapter : ICameraSource {
    OtcCameraWorker worker;
    OtcCameraAdapter(const std::string& name, unsigned long serial, int wsPort,
                     const std::string& ip, int udpPort) : worker(name, serial, wsPort, ip, udpPort) {}
    bool init() override { return worker.init(); }
    void start() override { worker.start(); }
    void stop() override { worker.stop(); }
    FramePacket getLatestFrame() override { return worker.getLatestFrame(); }
    const std::string& getName() const override { return worker.getName(); }
    int getPort() const override { return worker.getPort(); }
    void setPalette(int palette) override { worker.setPalette(palette); }
    void setScalingMethod(int method) override { worker.setScalingMethod(method); }
    void setManualRange(float min, float max) override { worker.setManualRange(min, max); }
    void setEmissivity(float value) override { worker.setEmissivity(value); }
    void forceFlagCycle() override { worker.forceFlagCycle(); }
};

static void processCommand(const std::string& cmdLine, std::vector<ICameraSource*>& cameras,
                           const std::vector<size_t>& activeIndices)
{
    try {
        auto j = json::parse(cmdLine);
        std::string cmd = j.value("cmd", "");
        int camIdx = j.value("camera", 0);

        if (camIdx < 0 || static_cast<size_t>(camIdx) >= cameras.size()) {
            std::cout << "CMD_ERR: invalid camera index " << camIdx << std::endl;
            return;
        }

        auto* cam = cameras[camIdx];

        if (cmd == "setPalette") {
            std::string value = j.value("value", "iron");
            cam->setPalette(paletteFromString(value));
        } else if (cmd == "setScaling") {
            std::string value = j.value("value", "minmax");
            cam->setScalingMethod(scalingFromString(value));
        } else if (cmd == "setManualRange") {
            float minT = j.value("min", 0.0f);
            float maxT = j.value("max", 500.0f);
            cam->setManualRange(minT, maxT);
        } else if (cmd == "setEmissivity") {
            float value = j.value("value", 1.0f);
            cam->setEmissivity(value);
        } else if (cmd == "forceFlagCycle") {
            cam->forceFlagCycle();
        } else {
            std::cout << "CMD_ERR: unknown command '" << cmd << "'" << std::endl;
            return;
        }

        std::cout << "CMD_OK: " << cmd << " camera=" << camIdx << std::endl;
    } catch (const std::exception& e) {
        std::cout << "CMD_ERR: " << e.what() << std::endl;
    }
}

int main(int argc, char* argv[])
{
    std::cout << "============================================================" << std::endl;
    std::cout << "  Camera Bridge - Direct SDK (Multi-Camera)" << std::endl;
    std::cout << "============================================================" << std::endl;

    // Parse arguments
    bool waitMode = false;
    std::vector<std::string> xmlPaths;

    for (int i = 1; i < argc; i++)
    {
        std::string arg = argv[i];
        if (arg == "--wait") {
            waitMode = true;
        } else if (arg == "--help" || arg == "-h") {
            printUsage(argv[0]);
            return 0;
        } else {
            xmlPaths.push_back(arg);
        }
    }

    if (xmlPaths.empty())
    {
        std::cerr << "ERROR: No XML config files specified" << std::endl;
        printUsage(argv[0]);
        return 1;
    }

    // Set SDK log verbosity
    evo::IRLogger::setVerbosity(evo::IRLOG_ERROR, evo::IRLOG_OFF);

    // Register Ctrl+C handler
    SetConsoleCtrlHandler(ctrlHandler, TRUE);

    // Initialize COM on main thread
    CoInitializeEx(nullptr, COINIT_MULTITHREADED);

    // Initialize Winsock (Ethernet cameras)
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);

    // Create camera workers based on type
    const int BASE_PORT = 9801;
    std::vector<ICameraSource*> cameras;
    std::vector<WebSocketBroadcaster*> servers;

    for (size_t i = 0; i < xmlPaths.size(); i++)
    {
        int wsPort = BASE_PORT + static_cast<int>(i);
        std::string name = "Camera " + std::to_string(i + 1);

        if (isEthernetCamera(xmlPaths[i]))
        {
            // Initialize OTC SDK once for Ethernet cameras
            if (!g_otcSdkInitialized)
            {
                optris::Sdk::init(optris::Verbosity::Info, optris::Verbosity::Off, "CameraBridge");
                optris::EnumerationManager::getInstance().addEthernetDetector("192.168.0.0/24");
                g_otcSdkInitialized = true;
                // Give the enumeration manager time to find devices
                std::this_thread::sleep_for(std::chrono::seconds(3));
            }

            unsigned long serial = getSerialNumber(xmlPaths[i]);
            std::string ip = getEthernetIpAddress(xmlPaths[i]);
            int udpPort = getEthernetUdpPort(xmlPaths[i]);
            std::cout << "[" << name << "] Detected Ethernet camera (serial: " << serial
                      << ", ip: " << ip << ", port: " << udpPort << ") — using OTC SDK" << std::endl;
            cameras.push_back(new OtcCameraAdapter(name, serial, wsPort, ip, udpPort));
        }
        else
        {
            std::cout << "[" << name << "] Detected USB camera" << std::endl;
            std::wstring wpath = toWide(xmlPaths[i]);
            cameras.push_back(new USBCameraAdapter(name, wpath, wsPort));
        }
        servers.push_back(new WebSocketBroadcaster(wsPort, name));
    }

    // Initialize cameras (with retry in wait mode)
    std::vector<size_t> activeIndices;
    int maxRetries = waitMode ? 999 : 3;

    for (size_t i = 0; i < cameras.size(); i++)
    {
        bool initialized = false;
        for (int attempt = 0; attempt < maxRetries && g_running; attempt++)
        {
            if (cameras[i]->init())
            {
                initialized = true;
                break;
            }

            if (attempt + 1 < maxRetries)
            {
                int delay = (attempt < 3) ? 2 : 5;
                std::cout << "[" << cameras[i]->getName() << "] Retry in "
                          << delay << "s (attempt " << (attempt + 1)
                          << "/" << maxRetries << ")..." << std::endl;

                for (int s = 0; s < delay && g_running; s++)
                    std::this_thread::sleep_for(std::chrono::seconds(1));
            }
        }

        if (initialized) {
            activeIndices.push_back(i);
        } else {
            std::cerr << "WARNING: " << cameras[i]->getName() << " failed to connect" << std::endl;
        }
    }

    if (activeIndices.empty())
    {
        std::cerr << "ERROR: No cameras connected!" << std::endl;
        for (auto* s : servers) delete s;
        for (auto* c : cameras) delete c;
        WSACleanup();
        return 1;
    }

    // Start WebSocket servers and camera streaming
    for (size_t idx : activeIndices)
    {
        servers[idx]->start();
        cameras[idx]->start();
    }

    // Start command reader for stdin
    CommandReader commandReader;
    commandReader.start();

    std::cout << std::endl;
    std::cout << activeIndices.size() << " camera(s) active:" << std::endl;
    for (size_t idx : activeIndices)
    {
        std::cout << "  " << cameras[idx]->getName()
                  << ": ws://localhost:" << cameras[idx]->getPort() << std::endl;
    }
    std::cout << std::endl;
    std::cout << "Streaming... Press Ctrl+C to stop." << std::endl;
    std::cout << std::endl;

    // Main loop: broadcast frames at ~15 FPS
    const auto frameInterval = std::chrono::milliseconds(66);

    while (g_running)
    {
        auto loopStart = std::chrono::steady_clock::now();

        // Pump Windows messages — required for DirectShow SampleGrabber callbacks
        MSG msg;
        while (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE))
        {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }

        // Process commands from stdin
        std::string cmdLine;
        while (commandReader.poll(cmdLine))
        {
            processCommand(cmdLine, cameras, activeIndices);
        }

        // Broadcast frames with metadata
        for (size_t idx : activeIndices)
        {
            auto packet = cameras[idx]->getLatestFrame();
            if (!packet.jpeg.empty())
            {
                servers[idx]->broadcast(packet);
            }
        }

        auto elapsed = std::chrono::steady_clock::now() - loopStart;
        auto remaining = frameInterval - elapsed;
        if (remaining.count() > 0)
        {
            std::this_thread::sleep_for(remaining);
        }
    }

    // Graceful shutdown
    std::cout << "Stopping cameras..." << std::endl;
    commandReader.stop();
    for (size_t idx : activeIndices)
    {
        cameras[idx]->stop();
        servers[idx]->stop();
    }

    for (auto* s : servers) delete s;
    for (auto* c : cameras) delete c;

    CoUninitialize();
    WSACleanup();
    std::cout << "Camera Bridge stopped." << std::endl;
    return 0;
}
