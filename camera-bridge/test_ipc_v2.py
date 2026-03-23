"""Test IPC with SetImagerIPCCount and logging."""
import ctypes as ct
import os
import sys
import time

ipc_dir = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120'
os.add_dll_directory(ipc_dir)
os.add_dll_directory(r'C:\Program Files (x86)\Optris GmbH\PIX Connect')

ipc = ct.WinDLL(os.path.join(ipc_dir, 'ImagerIPC2x64.dll'))

# Set up all function signatures
for name, args, res in [
    ('SetImagerIPCCount', [ct.c_ushort], ct.c_long),
    ('InitImagerIPC', [ct.c_ushort], ct.c_long),
    ('StartImagerIPC', [ct.c_ushort], ct.c_long),
    ('RunImagerIPC', [ct.c_ushort], ct.c_long),
    ('ReleaseImagerIPC', [ct.c_ushort], ct.c_long),
    ('GetIPCState', [ct.c_ushort, ct.c_bool], ct.c_ushort),
    ('ImagerIPCProcessMessages', [ct.c_ushort], ct.c_long),
    ('GetFrameConfig', [ct.c_ushort, ct.POINTER(ct.c_int), ct.POINTER(ct.c_int), ct.POINTER(ct.c_int)], ct.c_long),
    ('GetFrameQueue', [ct.c_ushort], ct.c_ushort),
    ('GetSerialNumber', [ct.c_ushort], ct.c_ulong),
    ('SetLogging', [ct.c_int], ct.c_long),
]:
    fn = getattr(ipc, name)
    fn.argtypes = args
    fn.restype = res

# Enable verbose logging
ipc.SetLogging(0xFFFF)

print("Step 1: SetImagerIPCCount(1)")
ret = ipc.SetImagerIPCCount(ct.c_ushort(1))
print(f"  Result: {ret}")

print("Step 2: InitImagerIPC(0)")
ret = ipc.InitImagerIPC(ct.c_ushort(0))
print(f"  Result: {ret} (hex: {ret & 0xFFFFFFFF:#010x})")

if ret < 0:
    print("\nInit failed. Trying StartImagerIPC instead...")
    ret = ipc.StartImagerIPC(ct.c_ushort(0))
    print(f"  StartImagerIPC result: {ret} (hex: {ret & 0xFFFFFFFF:#010x})")

if ret < 0:
    print("\nAll init methods failed.")
    print("Possible causes:")
    print("  1. PIX Connect SDK mode not active (check Settings > External Communication)")
    print("  2. No camera selected/streaming in PIX Connect")
    print("  3. PIX Connect needs full restart after changing settings")
    sys.exit(1)

print("Step 3: RunImagerIPC(0)")
ret = ipc.RunImagerIPC(ct.c_ushort(0))
print(f"  Result: {ret}")

print("\nPolling...")
for i in range(50):
    state = ipc.GetIPCState(ct.c_ushort(0), ct.c_bool(True))
    ipc.ImagerIPCProcessMessages(ct.c_ushort(0))
    if state:
        print(f"  State: {state:#06x}")
    if state & 0x0010:  # FRAME_INIT
        w, h, d = ct.c_int(), ct.c_int(), ct.c_int()
        ipc.GetFrameConfig(ct.c_ushort(0), ct.byref(w), ct.byref(h), ct.byref(d))
        print(f"  Frame: {w.value}x{h.value} depth={d.value}")
        serial = ipc.GetSerialNumber(ct.c_ushort(0))
        print(f"  Serial: {serial}")
        break
    time.sleep(0.1)

ipc.ReleaseImagerIPC(ct.c_ushort(0))
print("Done.")
