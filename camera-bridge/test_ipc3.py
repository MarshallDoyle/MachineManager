"""Test PIX Connect IPC with SDK mode enabled."""
import ctypes as ct
import numpy as np
import os
import sys
import time

IPC_EVENT_INIT_COMPLETED = 0x0001
IPC_EVENT_SERVER_STOPPED = 0x0002
IPC_EVENT_FRAME_INIT = 0x0010

ipc_dir = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120'
os.add_dll_directory(ipc_dir)
os.add_dll_directory(r'C:\Program Files (x86)\Optris GmbH\PIX Connect')

ipc = ct.WinDLL(os.path.join(ipc_dir, 'ImagerIPC2x64.dll'))
print("DLL loaded")

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

print("InitImagerIPC(0)...")
ret = ipc.InitImagerIPC(ct.c_ushort(0))
print(f"Result: {ret} (hex: {ret & 0xFFFFFFFF:#010x})")

if ret < 0:
    print("Init failed!")
    sys.exit(1)

print("RunImagerIPC(0)...")
ret = ipc.RunImagerIPC(ct.c_ushort(0))
print(f"Result: {ret}")
if ret < 0:
    print("Run failed!")
    ipc.ReleaseImagerIPC(ct.c_ushort(0))
    sys.exit(1)

print("\nPolling for frames...")
connected = False
frame_init = False
w, h, depth = ct.c_int(0), ct.c_int(0), ct.c_int(0)
frame_buf = None
metadata = FrameMetadata()

for i in range(200):  # 20 seconds
    state = ipc.GetIPCState(ct.c_ushort(0), ct.c_bool(True))

    if state & IPC_EVENT_SERVER_STOPPED:
        print("Server stopped!")
        break

    if not connected and (state & IPC_EVENT_INIT_COMPLETED):
        connected = True
        serial = ipc.GetSerialNumber(ct.c_ushort(0))
        print(f"Connected! Serial: {serial}")

    if state & IPC_EVENT_FRAME_INIT:
        ret = ipc.GetFrameConfig(ct.c_ushort(0), ct.byref(w), ct.byref(h), ct.byref(depth))
        if ret >= 0:
            frame_init = True
            frame_size = w.value * h.value * depth.value
            frame_buf = (ct.c_char * frame_size)()
            print(f"Frame: {w.value}x{h.value}, depth={depth.value}, size={frame_size}")

    if connected and frame_init and frame_buf:
        queue = ipc.GetFrameQueue(ct.c_ushort(0))
        if queue > 0:
            ret = ipc.GetFrame(ct.c_ushort(0), ct.c_ushort(100),
                              frame_buf, ct.c_uint(len(frame_buf)),
                              ct.byref(metadata))
            if ret >= 0:
                temp = ipc.GetTempTarget(ct.c_ushort(0))
                print(f"\n*** FRAME OK! ***")
                print(f"  Counter: {metadata.Counter}, Temp: {temp:.1f} C")
                print(f"  Chip: {metadata.TempChip:.1f}, Flag: {metadata.TempFlag:.1f}")

                # Save image
                if depth.value == 2:
                    arr = np.frombuffer(frame_buf, dtype=np.uint16).reshape(h.value, w.value)
                    mean_temp = (arr.mean() - 1000.0) / 10.0
                    print(f"  Thermal: min={arr.min()}, max={arr.max()}, mean_temp={mean_temp:.1f} C")
                    norm = ((arr - arr.min()) / max(1, arr.max() - arr.min()) * 255).astype(np.uint8)
                    from PIL import Image
                    img = Image.fromarray(norm, 'L')
                    img.save('test_ipc_frame.jpg', quality=90)
                    print(f"  Saved test_ipc_frame.jpg")

                # Grab a few more
                for j in range(5):
                    time.sleep(0.1)
                    ipc.ImagerIPCProcessMessages(ct.c_ushort(0))
                    if ipc.GetFrameQueue(ct.c_ushort(0)) > 0:
                        ipc.GetFrame(ct.c_ushort(0), ct.c_ushort(100),
                                    frame_buf, ct.c_uint(len(frame_buf)),
                                    ct.byref(metadata))
                        temp = ipc.GetTempTarget(ct.c_ushort(0))
                        print(f"  Frame {j+2}: counter={metadata.Counter}, temp={temp:.1f} C")
                break

    ipc.ImagerIPCProcessMessages(ct.c_ushort(0))
    time.sleep(0.1)
else:
    print(f"Timeout. connected={connected}, frame_init={frame_init}")

ipc.ReleaseImagerIPC(ct.c_ushort(0))
print("\nDone.")
