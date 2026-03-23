"""
Test PIX Connect IPC - with DLL directory added and better error handling.
"""
import ctypes as ct
import os
import sys

# Add DLL search directory
ipc_dir = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120'
os.add_dll_directory(ipc_dir)
# Also add PIX Connect directory itself
os.add_dll_directory(r'C:\Program Files (x86)\Optris GmbH\PIX Connect')

dll_path = os.path.join(ipc_dir, 'ImagerIPC2x64.dll')
print(f"Loading {dll_path}")

ipc = ct.WinDLL(dll_path)
print("DLL loaded")

# Try InitImagerIPC
ipc.InitImagerIPC.argtypes = [ct.c_ushort]
ipc.InitImagerIPC.restype = ct.c_long

# The error might be because IPC isn't configured in PIX Connect.
# Let's check if the named instance approach works
# Try InitNamedImagerIPC with default instance name
ipc.InitNamedImagerIPC.argtypes = [ct.c_ushort, ct.c_wchar_p]
ipc.InitNamedImagerIPC.restype = ct.c_long

# Try default first
print("\n--- Attempt 1: InitImagerIPC(0) ---")
ret = ipc.InitImagerIPC(ct.c_ushort(0))
print(f"Result: {ret} (hex: {ret & 0xFFFFFFFF:#010x})")

if ret < 0:
    # Try releasing and then named init
    try:
        ipc.ReleaseImagerIPC(ct.c_ushort(0))
    except:
        pass

    # Try common instance names
    for name in [None, "Imager", "PIX Connect", "OptrisImager", ""]:
        print(f"\n--- Attempt: InitNamedImagerIPC(0, '{name}') ---")
        try:
            ret = ipc.InitNamedImagerIPC(ct.c_ushort(0), name)
            print(f"Result: {ret} (hex: {ret & 0xFFFFFFFF:#010x})")
            if ret >= 0:
                print("SUCCESS!")
                ipc.ReleaseImagerIPC(ct.c_ushort(0))
                break
        except Exception as e:
            print(f"Error: {e}")

# Also try SetImagerIPCCount first
print("\n--- Attempt with SetImagerIPCCount ---")
try:
    ipc.SetImagerIPCCount.argtypes = [ct.c_ushort]
    ipc.SetImagerIPCCount.restype = ct.c_long
    ret = ipc.SetImagerIPCCount(ct.c_ushort(1))
    print(f"SetImagerIPCCount(1): {ret}")

    ret = ipc.InitImagerIPC(ct.c_ushort(0))
    print(f"InitImagerIPC(0): {ret} (hex: {ret & 0xFFFFFFFF:#010x})")
    if ret >= 0:
        print("SUCCESS!")
    ipc.ReleaseImagerIPC(ct.c_ushort(0))
except Exception as e:
    print(f"Error: {e}")

print("\nNote: PIX Connect may need 'SDK' connection enabled in its settings.")
print("Go to PIX Connect -> Settings -> External Communication -> enable 'SDK'")
print("Done.")
