"""Try to find the PIX Connect shared memory by trying different approaches."""
import ctypes as ct
import os
import sys
import time

ipc_dir = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120'
os.add_dll_directory(ipc_dir)
os.add_dll_directory(r'C:\Program Files (x86)\Optris GmbH\PIX Connect')

ipc = ct.WinDLL(os.path.join(ipc_dir, 'ImagerIPC2x64.dll'))

for name, args, res in [
    ('SetImagerIPCCount', [ct.c_ushort], ct.c_long),
    ('InitImagerIPC', [ct.c_ushort], ct.c_long),
    ('InitNamedImagerIPC', [ct.c_ushort, ct.c_wchar_p], ct.c_long),
    ('StartImagerIPC', [ct.c_ushort], ct.c_long),
    ('RunImagerIPC', [ct.c_ushort], ct.c_long),
    ('ReleaseImagerIPC', [ct.c_ushort], ct.c_long),
    ('GetIPCState', [ct.c_ushort, ct.c_bool], ct.c_ushort),
    ('ImagerIPCProcessMessages', [ct.c_ushort], ct.c_long),
    ('GetFrameConfig', [ct.c_ushort, ct.POINTER(ct.c_int), ct.POINTER(ct.c_int), ct.POINTER(ct.c_int)], ct.c_long),
    ('GetFrameQueue', [ct.c_ushort], ct.c_ushort),
    ('GetSerialNumber', [ct.c_ushort], ct.c_ulong),
]:
    fn = getattr(ipc, name)
    fn.argtypes = args
    fn.restype = res

# Check Windows named objects for PIX Connect / Optris shared memory
print("=== Checking for shared memory objects ===")
import subprocess
# Use handle.exe or powershell to list section objects
result = subprocess.run(
    ['powershell', '-NoProfile', '-Command',
     'Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "Imager.exe" } | Select-Object ProcessId, CommandLine | Format-List'],
    capture_output=True, text=True
)
print("PIX Connect process:")
print(result.stdout)

# Try InitImagerIPC with different indices
print("=== Trying InitImagerIPC with different indices ===")
for idx in range(4):
    ret = ipc.InitImagerIPC(ct.c_ushort(idx))
    print(f"  InitImagerIPC({idx}): {ret} (hex: {ret & 0xFFFFFFFF:#010x})")
    if ret >= 0:
        print(f"  *** SUCCESS at index {idx}! ***")
        ipc.ReleaseImagerIPC(ct.c_ushort(idx))
        break

# Try InitNamedImagerIPC with various names
print("\n=== Trying InitNamedImagerIPC with various names ===")
names_to_try = [
    "OptrisImager", "Imager", "PIX Connect", "PIXConnect",
    "ImagerIPC", "IPC", "Optris", "Camera",
    "OptrisImagerIPC", "ImagerIPC2",
    # Try with serial number
    "25122066", "25124018",
]
for name in names_to_try:
    try:
        ret = ipc.InitNamedImagerIPC(ct.c_ushort(0), name)
        status = "OK" if ret >= 0 else f"FAIL ({ret & 0xFFFFFFFF:#010x})"
        print(f"  '{name}': {status}")
        if ret >= 0:
            print(f"  *** SUCCESS with name '{name}'! ***")
            # Try to get data
            ipc.RunImagerIPC(ct.c_ushort(0))
            for i in range(30):
                state = ipc.GetIPCState(ct.c_ushort(0), ct.c_bool(True))
                ipc.ImagerIPCProcessMessages(ct.c_ushort(0))
                if state & 0x0010:
                    w, h, d = ct.c_int(), ct.c_int(), ct.c_int()
                    ipc.GetFrameConfig(ct.c_ushort(0), ct.byref(w), ct.byref(h), ct.byref(d))
                    print(f"  Frame: {w.value}x{h.value} depth={d.value}")
                    break
                time.sleep(0.1)
            ipc.ReleaseImagerIPC(ct.c_ushort(0))
            break
    except Exception as e:
        print(f"  '{name}': ERROR {e}")

print("\nDone.")
