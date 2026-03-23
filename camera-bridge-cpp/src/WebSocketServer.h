#pragma once

#include <string>
#include <vector>
#include <set>
#include <mutex>
#include <thread>
#include <atomic>
#include <functional>
#include <iostream>

#include "FrameMetadata.h"

// ASIO_STANDALONE, _WEBSOCKETPP_CPP11_STL_, _WEBSOCKETPP_CPP11_THREAD_ defined via CMake
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

typedef websocketpp::server<websocketpp::config::asio> WsServer;
typedef websocketpp::connection_hdl ConnectionHdl;

/**
 * Lightweight WebSocket server for streaming binary frames to connected clients.
 * Each camera gets its own server instance on a dedicated port.
 */
class WebSocketBroadcaster
{
public:
    WebSocketBroadcaster(int port, const std::string& cameraName)
        : _port(port)
        , _cameraName(cameraName)
        , _running(false)
    {
        _server.set_access_channels(websocketpp::log::alevel::none);
        _server.set_error_channels(websocketpp::log::elevel::fatal);

        _server.init_asio();
        _server.set_reuse_addr(true);

        _server.set_open_handler([this](ConnectionHdl hdl) {
            std::lock_guard<std::mutex> lock(_connMutex);
            _connections.insert(hdl);
            std::cout << "[" << _cameraName << "] Client connected ("
                      << _connections.size() << " total)" << std::endl;
        });

        _server.set_close_handler([this](ConnectionHdl hdl) {
            std::lock_guard<std::mutex> lock(_connMutex);
            _connections.erase(hdl);
            std::cout << "[" << _cameraName << "] Client disconnected ("
                      << _connections.size() << " total)" << std::endl;
        });

        _server.set_message_handler([](ConnectionHdl, WsServer::message_ptr) {
            // Ignore incoming messages from clients
        });
    }

    ~WebSocketBroadcaster()
    {
        stop();
    }

    /** Start the WebSocket server in a background thread. */
    void start()
    {
        _running = true;
        _serverThread = std::thread([this]() {
            try {
                _server.listen(_port);
                _server.start_accept();
                _server.run();
            } catch (const std::exception& e) {
                std::cerr << "[" << _cameraName << "] WS server error: " << e.what() << std::endl;
            }
        });
    }

    /** Stop the server and join the thread. */
    void stop()
    {
        if (!_running) return;
        _running = false;

        try {
            _server.stop_listening();

            // Close all connections
            std::lock_guard<std::mutex> lock(_connMutex);
            for (auto& hdl : _connections) {
                try {
                    _server.close(hdl, websocketpp::close::status::going_away, "shutdown");
                } catch (...) {}
            }
            _connections.clear();
        } catch (...) {}

        _server.stop();

        if (_serverThread.joinable()) {
            _serverThread.join();
        }
    }

    /** Broadcast a frame packet (metadata + JPEG) to all connected clients. */
    void broadcast(const FramePacket& packet)
    {
        if (packet.jpeg.empty()) return;

        // Build binary message: [4-byte LE uint32 jsonLen][JSON bytes][JPEG bytes]
        std::string jsonStr = packet.metadata.toJson();
        uint32_t jsonLen = static_cast<uint32_t>(jsonStr.size());

        std::vector<unsigned char> msg;
        msg.reserve(4 + jsonStr.size() + packet.jpeg.size());
        msg.push_back(jsonLen & 0xFF);
        msg.push_back((jsonLen >> 8) & 0xFF);
        msg.push_back((jsonLen >> 16) & 0xFF);
        msg.push_back((jsonLen >> 24) & 0xFF);
        msg.insert(msg.end(), jsonStr.begin(), jsonStr.end());
        msg.insert(msg.end(), packet.jpeg.begin(), packet.jpeg.end());

        std::lock_guard<std::mutex> lock(_connMutex);
        for (auto& hdl : _connections) {
            try {
                _server.send(hdl, msg.data(), msg.size(), websocketpp::frame::opcode::binary);
            } catch (const std::exception& e) {
                // Connection may have closed; ignore
            }
        }
    }

    /** Get number of connected clients. */
    size_t getClientCount()
    {
        std::lock_guard<std::mutex> lock(_connMutex);
        return _connections.size();
    }

private:
    int             _port;
    std::string     _cameraName;
    std::atomic<bool> _running;
    WsServer        _server;
    std::thread     _serverThread;

    std::set<ConnectionHdl, std::owner_less<ConnectionHdl>> _connections;
    std::mutex _connMutex;
};
