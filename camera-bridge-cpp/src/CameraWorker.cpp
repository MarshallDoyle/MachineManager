#include "CameraWorker.h"
#include <iostream>
#include <cstring>
#include <sstream>
#include <iomanip>

// stb JPEG encoding
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

// Callback for stbi_write_jpg_to_func: appends to a vector
static void stbiWriteCallback(void* context, void* data, int size)
{
    auto* vec = static_cast<std::vector<unsigned char>*>(context);
    auto* bytes = static_cast<unsigned char*>(data);
    vec->insert(vec->end(), bytes, bytes + size);
}

CameraWorker::CameraWorker(const std::string& name, const std::wstring& xmlPath, int wsPort)
    : _name(name)
    , _xmlPath(xmlPath)
    , _wsPort(wsPort)
    , _vc(nullptr)
    , _device(nullptr)
    , _imager(nullptr)
    , _rgbBuffer(nullptr)
    , _thermalW(0)
    , _thermalH(0)
{
    _iBuilder.setPaletteScalingMethod(evo::eMinMax);
    _iBuilder.setPalette(evo::eIron);
}

CameraWorker::~CameraWorker()
{
    stop();
    if (_rgbBuffer) delete[] _rgbBuffer;
}

bool CameraWorker::init()
{
    std::cout << "[" << _name << "] Reading XML config..." << std::endl;

    if (!evo::IRDeviceParamsReader::readXML(const_cast<wchar_t*>(_xmlPath.c_str()), _params))
    {
        std::cerr << "[" << _name << "] Failed to read XML config" << std::endl;
        return false;
    }

    evo::IRCalibrationManager* calMgr = evo::IRCalibrationManager::getInstance();
    calMgr->setFormatsDir(_params.formatsPath);

    std::cout << "[" << _name << "] Looking for camera (serial: " << _params.serial << ")..." << std::endl;

    _vc = new evo::VideoCapture();
    _device = _vc->initializeDevice(_params);

    if (!_device)
    {
        std::cerr << "[" << _name << "] Camera device not found" << std::endl;
        delete _vc; _vc = nullptr;
        return false;
    }

    std::cout << "[" << _name << "] Found device: " << _device->getFriendlyName()
              << " (serial: " << _device->getSerial() << ")" << std::endl;

    _vc->run();

    _imager = new evo::IRImager();
    if (!_imager->init(&_params, _device->getFrequency(), _device->getWidth(), _device->getHeight()))
    {
        std::cerr << "[" << _name << "] Failed to initialize imager" << std::endl;
        delete _imager; _imager = nullptr;
        delete _vc; _vc = nullptr;
        return false;
    }

    std::cout << "[" << _name << "] Imager initialized: "
              << _imager->getWidth() << "x" << _imager->getHeight()
              << " @ " << _device->getFrequency() << " Hz" << std::endl;

    // Register callbacks
    _imager->setClient(this);
    _device->setClient(this);

    // Also register function pointer callback for debugging
    _device->setCallback([](unsigned char* data, int len, int instanceID) {
        static bool first = true;
        if (first) {
            std::cout << "[DEBUG] Function callback fired! len=" << len << " instanceID=" << instanceID << std::endl;
            first = false;
        }
    });

    _initSuccess = true;
    return true;
}

void CameraWorker::start()
{
    if (!_device || !_imager) return;
    _running = true;
    int ret = _device->startStreaming();
    std::cout << "[" << _name << "] startStreaming() returned: " << ret << std::endl;
    std::cout << "[" << _name << "] Capture loop started (ws://localhost:" << _wsPort << ")" << std::endl;
}

void CameraWorker::stop()
{
    if (!_running) return;
    _running = false;
    if (_device) _device->stopStreaming();
    if (_imager) { delete _imager; _imager = nullptr; }
    if (_vc) { delete _vc; _vc = nullptr; }
    std::cout << "[" << _name << "] Stopped" << std::endl;
}

FramePacket CameraWorker::getLatestFrame()
{
    std::lock_guard<std::mutex> lock(_frameMutex);
    return _latestPacket;
}

void CameraWorker::threadFunc()
{
    // Not used in this approach — keeping for interface compatibility
}

// Called from DirectShow thread when raw data arrives
void CameraWorker::onRawFrame(unsigned char* data, int size)
{
    if (!_running) return;
    _imager->process(data, static_cast<void*>(this));
}

// Called after IRImager processes raw data into thermal image
void CameraWorker::onThermalFrame(unsigned short* data, unsigned int w, unsigned int h,
                                   evo::IRFrameMetadata meta, void* arg)
{
    if (!_running) return;

    // Allocate RGB buffer on first frame or resolution change
    if (_thermalW != w || _thermalH != h)
    {
        _thermalW = w;
        _thermalH = h;
        if (_rgbBuffer) delete[] _rgbBuffer;
        _rgbBuffer = new unsigned char[w * h * 3];
        std::cout << "[" << _name << "] First thermal frame: " << w << "x" << h << std::endl;
    }

    // Convert thermal data to false-color RGB using palette
    _iBuilder.setData(w, h, data);
    _iBuilder.convertTemperatureToPaletteImage(_rgbBuffer, true); // ignoreStride=true

    // Compute metadata using ImageBuilder (stay 1px inside border to avoid SDK warning)
    FrameMetadata fmeta;
    fmeta.mean = _iBuilder.getMeanTemperature(1, 1, w - 2, h - 2);
    fmeta.scaleMin = _iBuilder.getIsothermalMin();
    fmeta.scaleMax = _iBuilder.getIsothermalMax();
    fmeta.palette = static_cast<int>(_iBuilder.getPalette());
    fmeta.scaling = static_cast<int>(_iBuilder.getPaletteScalingMethod());

    // Find hot/cold spots
    evo::ExtremalRegion minRegion{}, maxRegion{};
    _iBuilder.getMinMaxRegion(3, &minRegion, &maxRegion);
    fmeta.hotX = (maxRegion.u1 + maxRegion.u2) / 2;
    fmeta.hotY = (maxRegion.v1 + maxRegion.v2) / 2;
    fmeta.hotT = maxRegion.t;
    fmeta.coldX = (minRegion.u1 + minRegion.u2) / 2;
    fmeta.coldY = (minRegion.v1 + minRegion.v2) / 2;
    fmeta.coldT = minRegion.t;
    fmeta.min = minRegion.t;
    fmeta.max = maxRegion.t;

    _meanTemp = fmeta.mean;

    // Encode RGB to JPEG
    std::vector<unsigned char> jpegBuf;
    jpegBuf.reserve(w * h);
    stbi_write_jpg_to_func(stbiWriteCallback, &jpegBuf, w, h, 3, _rgbBuffer, 85);

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

void CameraWorker::onFlagStateChange(unsigned int flagstate, void* arg)
{
    std::cout << "[" << _name << "] Flag state: " << flagstate << std::endl;
}

void CameraWorker::setPalette(int palette)
{
    _iBuilder.setPalette(static_cast<evo::EnumOptrisColoringPalette>(palette));
    std::cout << "[" << _name << "] Palette set to " << palette << std::endl;
}

void CameraWorker::setScalingMethod(int method)
{
    _iBuilder.setPaletteScalingMethod(static_cast<evo::EnumOptrisPaletteScalingMethod>(method));
    std::cout << "[" << _name << "] Scaling method set to " << method << std::endl;
}

void CameraWorker::setManualRange(float min, float max)
{
    _iBuilder.setManualTemperatureRange(min, max);
    std::cout << "[" << _name << "] Manual range set to " << min << " - " << max << std::endl;
}

void CameraWorker::setEmissivity(float emissivity)
{
    if (_imager) {
        _lastEmissivity = emissivity;
        _imager->setRadiationParameters(emissivity, 1.0f);
        std::cout << "[" << _name << "] Emissivity set to " << emissivity << std::endl;
    }
}

void CameraWorker::forceFlagCycle()
{
    if (_imager) {
        _imager->forceFlagEvent();
        std::cout << "[" << _name << "] Flag cycle forced" << std::endl;
    }
}

void CameraWorker::setTransmissivity(float transmissivity)
{
    if (_imager) {
        // Old Direct SDK: setRadiationParameters(emissivity, transmissivity)
        _imager->setRadiationParameters(_lastEmissivity, transmissivity);
        std::cout << "[" << _name << "] Transmissivity set to " << transmissivity << std::endl;
    }
}

std::string CameraWorker::getDeviceTemps()
{
    if (!_imager) return "{}";
    float flagT = _imager->getTempFlag();
    float boxT = _imager->getTempBox();
    float chipT = _imager->getTempChip();
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(1);
    ss << "{\"flag\":" << flagT << ",\"box\":" << boxT << ",\"chip\":" << chipT << "}";
    return ss.str();
}
