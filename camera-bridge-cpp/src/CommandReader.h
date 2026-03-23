#pragma once

#include <string>
#include <queue>
#include <mutex>
#include <thread>
#include <atomic>
#include <iostream>

/**
 * Reads newline-delimited JSON commands from stdin on a background thread.
 * The main loop polls with poll() to dequeue commands without blocking.
 */
class CommandReader
{
public:
    CommandReader() : _running(false) {}
    ~CommandReader() { stop(); }

    void start()
    {
        _running = true;
        _thread = std::thread(&CommandReader::readLoop, this);
    }

    void stop()
    {
        _running = false;
        // Note: std::getline will block until EOF or input arrives.
        // The thread will exit when the process stdin is closed.
        if (_thread.joinable()) _thread.detach();
    }

    /** Non-blocking dequeue. Returns true if a command was available. */
    bool poll(std::string& cmd)
    {
        std::lock_guard<std::mutex> lock(_mutex);
        if (_queue.empty()) return false;
        cmd = std::move(_queue.front());
        _queue.pop();
        return true;
    }

private:
    void readLoop()
    {
        std::string line;
        while (_running && std::getline(std::cin, line))
        {
            if (line.empty()) continue;
            std::lock_guard<std::mutex> lock(_mutex);
            _queue.push(std::move(line));
        }
    }

    std::atomic<bool> _running;
    std::thread _thread;
    std::queue<std::string> _queue;
    std::mutex _mutex;
};
