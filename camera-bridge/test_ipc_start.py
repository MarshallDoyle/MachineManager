"""Try StartImagerIPC instead of InitImagerIPC, and also try different IPC counts."""
import ctypes as ct
import os
import time

ipc_dir = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120'
os.add_dll_directory(ipc_dir)
os.add_dll_directory(r'C:\Program Files (x86)\Optris GmbH\PIX Connect')

ipc = ct.WinDLL(os.path.join(ipc_dir, 'ImagerIPC2x64.dll'))

for name, args, res in [
    ('SetImagerIPCCount', [ct.c_ushort], ct.c_long),
    ('InitImagerIPC', [ct.c_ushort], ct.c_long),
    ('StartImagerIPC', [ct.c_ushort], ct.c_long),
    ('RunImagerIPC', [ct.c_ushort], ct.c_long),
    ('ReleaseImagerIPC', [ct.c_ushort], ct.c_long),
    ('GetIPCState', [ct.c_ushort, ct.c_bool], ct.c_ushort),
    ('GetFrameConfig', [ct.c_ushort, ct.POINTER(ct.c_int), ct.POINTER(ct.c_int), ct.POINTER(ct.c_int)], ct.c_long),
    ('ImagerIPCProcessMessages', [ct.c_ushort], ct.c_long),
    ('GetFrameQueue', [ct.c_ushort], ct.c_ushort),
    ('GetSerialNumber', [ct.c_ushort], ct.c_ulong),
    ('GetFrame', [ct.c_ushort, ct.c_ushort, ct.c_void_p, ct.c_uint, ct.c_void_p], ct.c_long),
]:
    fn = getattr(ipc, name)
    fn.argtypes = args
    fn.restype = res

# Test 1: InitImagerIPC
print("=== Test 1: InitImagerIPC(0) ===")
ret = ipc.InitImagerIPC(ct.c_ushort(0))
print(f"  Result: {ret} (0x{ret & 0xFFFFFFFF:08x})")
if ret >= 0:
    ipc.ReleaseImagerIPC(ct.c_ushort(0))
    print("  SUCCESS")

# Test 2: SetImagerIPCCount then Init
print("\n=== Test 2: SetImagerIPCCount(1) then InitImagerIPC(0) ===")
ret = ipc.SetImagerIPCCount(ct.c_ushort(1))
print(f"  SetImagerIPCCount: {ret}")
ret = ipc.InitImagerIPC(ct.c_ushort(0))
print(f"  InitImagerIPC: {ret} (0x{ret & 0xFFFFFFFF:08x})")
if ret >= 0:
    ipc.ReleaseImagerIPC(ct.c_ushort(0))
    print("  SUCCESS")

# Test 3: StartImagerIPC
print("\n=== Test 3: StartImagerIPC(0) ===")
ret = ipc.StartImagerIPC(ct.c_ushort(0))
print(f"  Result: {ret} (0x{ret & 0xFFFFFFFF:08x})")
if ret >= 0:
    print("  StartImagerIPC returned success, waiting for events...")
    ret2 = ipc.RunImagerIPC(ct.c_ushort(0))
    print(f"  RunImagerIPC: {ret2}")
    for i in range(100):
        state = ipc.GetIPCState(ct.c_ushort(0), ct.c_bool(True))
        ipc.ImagerIPCProcessMessages(ct.c_ushort(0))
        if state:
            print(f"  State at {i*0.1:.1f}s: 0x{state:04x}")
        if state & 0x0010:  # FRAME_INIT
            w, h, d = ct.c_int(), ct.c_int(), ct.c_int()
            ipc.GetFrameConfig(ct.c_ushort(0), ct.byref(w), ct.byref(h), ct.byref(d))
            serial = ipc.GetSerialNumber(ct.c_ushort(0))
            print(f"  FRAME INIT: {w.value}x{h.value} depth={d.value} serial={serial}")

            # Try to grab a frame
            frame_size = w.value * h.value * d.value
            buf = (ct.c_char * frame_size)()

            class FM(ct.Structure):
                _fields_ = [("Size", ct.c_ushort), ("Counter", ct.c_uint)]
            meta = FM()

            time.sleep(0.5)
            ipc.ImagerIPCProcessMessages(ct.c_ushort(0))
            q = ipc.GetFrameQueue(ct.c_ushort(0))
            print(f"  Queue: {q}")
            if q > 0:
                ret3 = ipc.GetFrame(ct.c_ushort(0), ct.c_ushort(100), buf, ct.c_uint(frame_size), ct.byref(meta))
                print(f"  GetFrame: {ret3}, counter={meta.Counter}")
            break
        if state & 0x0002:  # SERVER_STOPPED
            print("  SERVER STOPPED")
            break
        time.sleep(0.1)
    ipc.ReleaseImagerIPC(ct.c_ushort(0))

# Test 4: Try indices 0-3
print("\n=== Test 4: Try InitImagerIPC with indices 0-3 ===")
for idx in range(4):
    ret = ipc.InitImagerIPC(ct.c_ushort(idx))
    print(f"  Index {idx}: {ret} (0x{ret & 0xFFFFFFFF:08x})")
    if ret >= 0:
        ipc.ReleaseImagerIPC(ct.c_ushort(idx))

print("\nDone.")
