#pragma once

#include <string>
#include <vector>
#include <sstream>
#include <iomanip>

struct FrameMetadata
{
    float mean = 0.f;
    float min = 0.f;
    float max = 0.f;
    int hotX = 0, hotY = 0;
    float hotT = 0.f;
    int coldX = 0, coldY = 0;
    float coldT = 0.f;
    float scaleMin = 0.f;
    float scaleMax = 0.f;
    int palette = 6;   // eIron
    int scaling = 2;    // eMinMax

    std::string toJson() const
    {
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(1);
        ss << "{\"mean\":" << mean
           << ",\"min\":" << min
           << ",\"max\":" << max
           << ",\"hotX\":" << hotX
           << ",\"hotY\":" << hotY
           << ",\"hotT\":" << hotT
           << ",\"coldX\":" << coldX
           << ",\"coldY\":" << coldY
           << ",\"coldT\":" << coldT
           << ",\"scaleMin\":" << scaleMin
           << ",\"scaleMax\":" << scaleMax
           << ",\"palette\":" << palette
           << ",\"scaling\":" << scaling
           << "}";
        return ss.str();
    }
};

struct FramePacket
{
    std::vector<unsigned char> jpeg;
    FrameMetadata metadata;
};
