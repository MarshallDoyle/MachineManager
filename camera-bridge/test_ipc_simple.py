"""Minimal IPC test - try every possible way to connect."""
import ctypes as ct
import os
import sys

ipc_dir = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120'
os.add_dll_directory(ipc_dir)
os.add_dll_directory(r'C:\Program Files (x86)\Optris GmbH\PIX Connect')

ipc = ct.WinDLL(os.path.join(ipc_dir, 'ImagerIPC2x64.dll'))

ipc.InitImagerIPC.argtypes = [ct.c_ushort]
ipc.InitImagerIPC.restype = ct.c_long
ipc.ReleaseImagerIPC.argtypes = [ct.c_ushort]
ipc.ReleaseImagerIPC.restype = ct.c_long

# Simple test
print("Trying InitImagerIPC(0)...")
ret = ipc.InitImagerIPC(ct.c_ushort(0))
print(f"Result: {ret} (hex: {ret & 0xFFFFFFFF:#010x})")

if ret >= 0:
    print("SUCCESS!")
    ipc.ReleaseImagerIPC(ct.c_ushort(0))
else:
    print(f"FAILED with 0x{ret & 0xFFFFFFFF:08x}")
    if (ret & 0xFFFFFFFF) == 0x80070002:
        print("ERROR_FILE_NOT_FOUND - shared memory not available")
        print()
        print("This means PIX Connect's IPC server is not running.")
        print("Check PIX Connect: Settings > External Communication")
        print("  - Is 'SDK' selected (not 'Web Server' or 'COM-Port')?")
        print("  - Try: close PIX Connect, reopen it, select camera, then run this test")

        # Try to check what's in PIX Connect's app data
        import glob
        appdata = os.environ.get('APPDATA', '')
        localappdata = os.environ.get('LOCALAPPDATA', '')
        print(f"\nLooking for PIX Connect config files...")
        for base in [appdata, localappdata]:
            for pattern in ['**/Optris*', '**/PIX*', '**/Imager*']:
                matches = glob.glob(os.path.join(base, pattern), recursive=False)
                for m in matches:
                    print(f"  Found: {m}")
