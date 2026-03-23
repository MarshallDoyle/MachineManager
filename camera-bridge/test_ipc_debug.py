"""Debug: check if IPC frames are actually arriving."""
import ctypes as ct
import os
import time

IPC_EVENT_INIT_COMPLETED = 0x0001
IPC_EVENT_SERVER_STOPPED = 0x0002
IPC_EVENT_FRAME_INIT = 0x0010

ipc_dir = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120'
os.add_dll_directory(ipc_dir)
os.add_dll_directory(r'C:\Program Files (x86)\Optris GmbH\PIX Connect')

ipc = ct.WinDLL(os.path.join(ipc_dir, 'ImagerIPC2x64.dll'))

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

idx = ct.c_ushort(0)

ret = ipc.InitImagerIPC(idx)
print(f"Init: {ret}")
if ret < 0:
    print("FAILED - PIX Connect not ready")
    exit(1)

ret = ipc.RunImagerIPC(idx)
print(f"Run: {ret}")

# Wait for init
for i in range(50):
    state = ipc.GetIPCState(idx, ct.c_bool(True))
    ipc.ImagerIPCProcessMessages(idx)
    if state & IPC_EVENT_FRAME_INIT:
        w, h, d = ct.c_int(), ct.c_int(), ct.c_int()
        ipc.GetFrameConfig(idx, ct.byref(w), ct.byref(h), ct.byref(d))
        print(f"Frame init: {w.value}x{h.value} depth={d.value}")
        break
    if state & IPC_EVENT_INIT_COMPLETED:
        serial = ipc.GetSerialNumber(idx)
        print(f"Connected, serial={serial}")
    time.sleep(0.1)

# Now poll for frames for 5 seconds
print("\nPolling for frames...")
w, h, d = ct.c_int(), ct.c_int(), ct.c_int()
ipc.GetFrameConfig(idx, ct.byref(w), ct.byref(h), ct.byref(d))
frame_size = w.value * h.value * d.value
frame_buf = (ct.c_char * frame_size)()
metadata = FrameMetadata()
frame_count = 0

start = time.time()
while time.time() - start < 5:
    ipc.ImagerIPCProcessMessages(idx)
    state = ipc.GetIPCState(idx, ct.c_bool(True))
    queue = ipc.GetFrameQueue(idx)

    if queue > 0:
        ret = ipc.GetFrame(idx, ct.c_ushort(100), frame_buf, ct.c_uint(frame_size), ct.byref(metadata))
        if ret >= 0:
            frame_count += 1
            if frame_count <= 5 or frame_count % 10 == 0:
                print(f"  Frame {frame_count}: counter={metadata.Counter}, queue was {queue}, ret={ret}")
    else:
        time.sleep(0.01)

print(f"\nTotal frames in 5s: {frame_count} ({frame_count/5:.1f} fps)")

ipc.ReleaseImagerIPC(idx)
print("Done.")
