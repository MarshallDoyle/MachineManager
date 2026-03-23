"""
Test PIX Connect IPC (Connect SDK) - gets frames from running PIX Connect.
PIX Connect must be running with a camera connected.
Uses ImagerIPC2x64.dll (stdcall convention).
"""
import ctypes as ct
import numpy as np
import os
import sys
import time

# IPC event flags
IPC_EVENT_INIT_COMPLETED = 0x0001
IPC_EVENT_SERVER_STOPPED = 0x0002
IPC_EVENT_CONFIG_CHANGED = 0x0004
IPC_EVENT_FRAME_INIT = 0x0010

# Load the IPC DLL (stdcall)
dll_path = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120\ImagerIPC2x64.dll'
print(f"DLL: {dll_path}")
print(f"Exists: {os.path.exists(dll_path)}")

ipc = ct.WinDLL(dll_path)
print("DLL loaded (WinDLL/stdcall)")

# Set up function signatures
ipc.InitImagerIPC.argtypes = [ct.c_ushort]
ipc.InitImagerIPC.restype = ct.c_long

ipc.RunImagerIPC.argtypes = [ct.c_ushort]
ipc.RunImagerIPC.restype = ct.c_long

ipc.ReleaseImagerIPC.argtypes = [ct.c_ushort]
ipc.ReleaseImagerIPC.restype = ct.c_long

ipc.GetIPCState.argtypes = [ct.c_ushort, ct.c_bool]
ipc.GetIPCState.restype = ct.c_ushort

ipc.GetFrameConfig.argtypes = [ct.c_ushort, ct.POINTER(ct.c_int), ct.POINTER(ct.c_int), ct.POINTER(ct.c_int)]
ipc.GetFrameConfig.restype = ct.c_long

ipc.GetFrame.argtypes = [ct.c_ushort, ct.c_ushort, ct.c_void_p, ct.c_uint, ct.c_void_p]
ipc.GetFrame.restype = ct.c_long

ipc.ImagerIPCProcessMessages.argtypes = [ct.c_ushort]
ipc.ImagerIPCProcessMessages.restype = ct.c_long

ipc.GetFrameQueue.argtypes = [ct.c_ushort]
ipc.GetFrameQueue.restype = ct.c_ushort

ipc.GetTempTarget.argtypes = [ct.c_ushort]
ipc.GetTempTarget.restype = ct.c_float

ipc.GetSerialNumber.argtypes = [ct.c_ushort]
ipc.GetSerialNumber.restype = ct.c_ulong

ipc.GetIPCMode.argtypes = [ct.c_ushort]
ipc.GetIPCMode.restype = ct.c_ushort

# FrameMetadata structure
class FrameMetadata(ct.Structure):
    _fields_ = [
        ("Size", ct.c_ushort),
        ("Counter", ct.c_uint),
        ("CounterHW", ct.c_uint),
        ("Timestamp", ct.c_longlong),
        ("TimestampMedia", ct.c_longlong),
        ("FlagState", ct.c_int),
        ("TempChip", ct.c_float),
        ("TempFlag", ct.c_float),
        ("TempBox", ct.c_float),
        ("PIFin", ct.c_ushort * 2),
    ]

# Initialize IPC
print("\nInitializing IPC connection to PIX Connect...")
ret = ipc.InitImagerIPC(ct.c_ushort(0))
print(f"InitImagerIPC returned: {ret}")
if ret < 0:
    print("Init failed! Is PIX Connect running?")
    sys.exit(1)

ret = ipc.RunImagerIPC(ct.c_ushort(0))
print(f"RunImagerIPC returned: {ret}")
if ret < 0:
    print("Run failed!")
    ipc.ReleaseImagerIPC(ct.c_ushort(0))
    sys.exit(1)

# Wait for connection
print("\nWaiting for PIX Connect connection...")
connected = False
frame_initialized = False
frame_buf = None
w, h, depth = ct.c_int(0), ct.c_int(0), ct.c_int(0)

for i in range(100):  # 10 seconds max
    state = ipc.GetIPCState(ct.c_ushort(0), ct.c_bool(True))

    if state & IPC_EVENT_SERVER_STOPPED:
        print("PIX Connect stopped!")
        break

    if not connected and (state & IPC_EVENT_INIT_COMPLETED):
        connected = True
        serial = ipc.GetSerialNumber(ct.c_ushort(0))
        mode = ipc.GetIPCMode(ct.c_ushort(0))
        print(f"Connected! Serial: {serial}, IPC Mode: {mode}")

    if state & IPC_EVENT_FRAME_INIT:
        ret = ipc.GetFrameConfig(ct.c_ushort(0), ct.byref(w), ct.byref(h), ct.byref(depth))
        if ret >= 0:
            frame_initialized = True
            frame_size = w.value * h.value * depth.value
            print(f"Frame config: {w.value}x{h.value}, depth={depth.value}, size={frame_size}")
            frame_buf = (ct.c_char * frame_size)()

    if connected and frame_initialized and frame_buf:
        queue = ipc.GetFrameQueue(ct.c_ushort(0))
        if queue > 0:
            metadata = FrameMetadata()
            ret = ipc.GetFrame(ct.c_ushort(0), ct.c_ushort(100),
                              ct.cast(frame_buf, ct.c_void_p),
                              ct.c_uint(len(frame_buf)),
                              ct.byref(metadata))
            if ret >= 0:
                temp = ipc.GetTempTarget(ct.c_ushort(0))
                print(f"\n*** FRAME RECEIVED! ***")
                print(f"  Counter: {metadata.Counter}, HW: {metadata.CounterHW}")
                print(f"  Target temp: {temp:.1f} C")
                print(f"  TempChip: {metadata.TempChip:.1f}, TempFlag: {metadata.TempFlag:.1f}")

                # Convert frame data to numpy array and save as image
                if depth.value == 2:
                    # Thermal data (16-bit)
                    arr = np.frombuffer(frame_buf, dtype=np.uint16).reshape(h.value, w.value)
                    # Simple visualization
                    normalized = ((arr - arr.min()) / max(1, arr.max() - arr.min()) * 255).astype(np.uint8)
                    from PIL import Image
                    img = Image.fromarray(normalized, 'L')
                    img.save('test_ipc_thermal.jpg', quality=90)
                    print(f"  Saved thermal frame: min={arr.min()}, max={arr.max()}, mean={arr.mean():.0f}")
                elif depth.value == 3:
                    # RGB palette image
                    arr = np.frombuffer(frame_buf, dtype=np.uint8).reshape(h.value, w.value, 3)
                    from PIL import Image
                    img = Image.fromarray(arr, 'RGB')
                    img.save('test_ipc_palette.jpg', quality=90)
                    print(f"  Saved palette frame")

                # Get a few more frames to confirm
                for j in range(3):
                    time.sleep(0.1)
                    ipc.ImagerIPCProcessMessages(ct.c_ushort(0))
                    if ipc.GetFrameQueue(ct.c_ushort(0)) > 0:
                        ret = ipc.GetFrame(ct.c_ushort(0), ct.c_ushort(100),
                                          ct.cast(frame_buf, ct.c_void_p),
                                          ct.c_uint(len(frame_buf)),
                                          ct.byref(metadata))
                        if ret >= 0:
                            temp = ipc.GetTempTarget(ct.c_ushort(0))
                            print(f"  Frame {j+2}: counter={metadata.Counter}, temp={temp:.1f} C")

                break

    ipc.ImagerIPCProcessMessages(ct.c_ushort(0))
    time.sleep(0.1)
else:
    if not connected:
        print("Timeout waiting for PIX Connect. Is it running with a camera?")
    elif not frame_initialized:
        print("Connected but no frames received. Is a camera streaming?")

# Cleanup
ipc.ReleaseImagerIPC(ct.c_ushort(0))
print("\nDone.")
