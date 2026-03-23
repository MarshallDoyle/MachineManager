@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >/dev/null 2>&1
cd /d "C:\Users\dival\OneDrive\Desktop\Machine Manager\camera-bridge-cpp\build"
cmake .. -G "NMake Makefiles" -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release
