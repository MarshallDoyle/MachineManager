cmake_minimum_required(VERSION 3.15)
project(camera-bridge LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# WIN32_LEAN_AND_MEAN prevents windows.h from including winsock.h (conflicts with winsock2.h used by Asio)
add_definitions(-DUNICODE -D_UNICODE -DWIN32 -D_WIN32_WINNT=0x0A00 -DWIN32_LEAN_AND_MEAN -DASIO_STANDALONE -D_WEBSOCKETPP_CPP11_STL_ -D_WEBSOCKETPP_CPP11_THREAD_)

# Find OTC SDK (for Xi 410 Ethernet camera)
set(OTC_SDK_DIR "C:/Program Files/Optris/otcsdk")
find_package(otcsdk REQUIRED HINTS "${OTC_SDK_DIR}/cmake")

# Source files
set(SOURCES
    src/main.cpp
    src/CameraWorker.cpp
)

add_executable(camera-bridge ${SOURCES})

# Include paths
target_include_directories(camera-bridge PRIVATE
    ${CMAKE_SOURCE_DIR}/include          # Old Direct SDK headers (PI 1M)
    ${OTC_SDK_DIR}/include               # OTC SDK headers (Xi 410)
    ${CMAKE_SOURCE_DIR}/third_party      # stb, asio.hpp, websocketpp, nlohmann
    ${CMAKE_SOURCE_DIR}/src              # Our headers
)

# Link libraries
target_link_libraries(camera-bridge PRIVATE
    ${CMAKE_SOURCE_DIR}/lib/libirimager.lib   # Old Direct SDK (PI 1M USB)
    otcsdk::otcsdk                             # OTC SDK (Xi 410 Ethernet)
    strmiids        # DirectShow GUIDs
    ole32           # COM
    oleaut32        # COM automation
    ws2_32          # Winsock2 (for websocketpp/Asio)
)

# Copy DLLs to output directory after build
add_custom_command(TARGET camera-bridge POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_SOURCE_DIR}/lib/libirimager.dll"
        "$<TARGET_FILE_DIR:camera-bridge>/libirimager.dll"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${OTC_SDK_DIR}/bin/otcsdk.dll"
        "$<TARGET_FILE_DIR:camera-bridge>/otcsdk.dll"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${OTC_SDK_DIR}/bin/SoSCorrectionLib.dll"
        "$<TARGET_FILE_DIR:camera-bridge>/SoSCorrectionLib.dll"
    COMMENT "Copying DLLs to output directory"
)

# Set output name
set_target_properties(camera-bridge PROPERTIES
    OUTPUT_NAME "camera-bridge"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)
