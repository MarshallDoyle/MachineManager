# Machine Manager - Development Guide

Metal 3D printer control application built with Electron + React + TwinCAT PLC.

## Architecture

- **Electron main process**: ADS client, camera bridge spawner, recording service, settings store
- **React renderer**: Zustand state, Tailwind dark theme (zinc palette), tab-based navigation
- **C++ camera bridge**: `camera-bridge-cpp/` — spawned as child process, streams JPEG+metadata via WebSocket
  - PI 1M (USB): Old Direct SDK (libirimager, `evo::` namespace)
  - Xi 410 (Ethernet): OTC SDK v10.1.1 (`optris::` namespace, `IRImagerFactory::create("native")`)
- **PLC**: TwinCAT 3 via ADS protocol, 5 axes (X, Y, Z, Z2, EXT), NCI G-code interpreter

## Camera Bridge Protocol

WebSocket binary frames: `[4-byte LE uint32 jsonLen][JSON metadata][JPEG data]`

Metadata includes: mean/min/max temps, hot/cold spot coordinates, scale range, palette, scaling method.

Commands via stdin (JSON + newline): setPalette, setScaling, setManualRange, setEmissivity, forceFlagCycle.

## Building the C++ Bridge

Requires x64 MSVC environment. From bash:
```bash
MSVC_ROOT="C:/Program Files (x86)/Microsoft Visual Studio/18/BuildTools/VC/Tools/MSVC/14.50.35717"
WINSDK="C:/Program Files (x86)/Windows Kits/10"
WINSDK_VER="10.0.26100.0"
export LIB="${MSVC_ROOT}/lib/x64;${WINSDK}/Lib/${WINSDK_VER}/ucrt/x64;${WINSDK}/Lib/${WINSDK_VER}/um/x64"
export INCLUDE="${MSVC_ROOT}/include;${WINSDK}/Include/${WINSDK_VER}/ucrt;${WINSDK}/Include/${WINSDK_VER}/um;${WINSDK}/Include/${WINSDK_VER}/shared"
cd camera-bridge-cpp/build && cmake --build . --config Release
```

OTC SDK installed at: `C:\Program Files\Optris\otcsdk`

## Key Conventions

- Camera XML configs: `camera-bridge/cam1_meltpool.xml` (serial 25122066), `cam2_buildplate.xml` (serial 25124018, IP 192.168.0.101)
- ImageBuilder coordinates must stay 1px inside border (avoid SDK warning)
- Xi 410 uses `connect(IRImagerConfig)` with explicit IP/port, not enumeration-based connect
- Recordings saved to `{userData}/recordings/` as NDJSON logs + JPEG frames

## Roadmap

### Packaging (TODO)
- Create `resources/icon.ico`
- Update `extraResources` to bundle camera-bridge.exe + all DLLs
- Build with `npm run package`

### Camera Controls - Quick Wins (TODO)
1. Focus motor slider (Xi 410 only — `setFocusMotorPosition(0-100)`)
2. Transmissivity slider (both cameras — radiation parameters)
3. Ambient temperature override input
4. Pixel temperature on click (`ImageBuilder::getTemperature(x, y)`)
5. Enable emissivity + Force NUC for Xi 410 in UI (currently USB-only)

### Camera Controls - Medium Effort (TODO)
6. Temperature range switching via operation modes
7. Measurement field ROIs with drawable rectangles
8. Device temperature monitoring (flag/housing/chip temps)
9. Adjustable flag interval

### Scanner Integration
**Hardware:** Micro-Epsilon scanCONTROL 3002-25 (red laser)
- 1,024 points/profile, 24 µm point distance
- 25mm measuring range (Z)
- 5 kHz profile rate (~8M points/sec)
- GigE Vision + GenICam SDK (C/C++)
- IP67 rated, 0-45°C operating temp
- SDK: C/C++ library with GeniCam standard, supports static/dynamic loading
- Integration: GigE Ethernet, same pattern as thermal cameras
- Use cases: build plate leveling, part geometry scanning, Z-height compensation
- Build Plate Scan page scaffolded with Three.js point cloud + demo data
- Dashboard has ScannerWidget showing last scan summary

### Heated Print Bed
- Dashboard widget with thermocouple reading, heater power bar, target temp setpoint
- Full "Bed" tab page with PID tuning (Kp, Ki, Kd)
- State: heatedBedStore.ts (currentTemp, targetTemp, heaterPower, heatingState)
- TODO: Wire to PLC thermocouple input (EL3174 analog input is available but unmapped)
- TODO: Wire heater cartridge control via PLC digital/analog output

### Analysis/Recording (Implemented)
- Recording service captures camera frames + axis data to NDJSON
- "Run Machine" button starts recording + G-code execution
- "Record" button starts recording independently of PLC state
- Analysis page with synchronized replay, axis graphs, timeline scrubber
