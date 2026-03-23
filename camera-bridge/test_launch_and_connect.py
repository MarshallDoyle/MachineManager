"""Launch PIX Connect, wait for it to start, then try IPC at intervals."""
import ctypes as ct
import os
import subprocess
import time

PIX_CONNECT = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\Imager.exe'
IPC_DLL_DIR = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Connect SDK\Lib\v120'

os.add_dll_directory(IPC_DLL_DIR)
os.add_dll_directory(r'C:\Program Files (x86)\Optris GmbH\PIX Connect')
ipc = ct.WinDLL(os.path.join(IPC_DLL_DIR, 'ImagerIPC2x64.dll'))

ipc.InitImagerIPC.argtypes = [ct.c_ushort]
ipc.InitImagerIPC.restype = ct.c_long
ipc.ReleaseImagerIPC.argtypes = [ct.c_ushort]
ipc.ReleaseImagerIPC.restype = ct.c_long

# Kill any existing PIX Connect
subprocess.run(['taskkill', '/IM', 'Imager.exe'], capture_output=True)
time.sleep(2)

# Launch PIX Connect
print(f"Launching PIX Connect...")
subprocess.Popen([PIX_CONNECT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Try IPC every 2 seconds for 60 seconds
print("Trying InitImagerIPC(0) every 2 seconds...")
for i in range(30):
    time.sleep(2)
    elapsed = (i + 1) * 2
    ret = ipc.InitImagerIPC(ct.c_ushort(0))
    status = "OK" if ret >= 0 else f"0x{ret & 0xFFFFFFFF:08x}"
    print(f"  {elapsed:3d}s: InitImagerIPC(0) = {status}")
    if ret >= 0:
        print(f"\n  SUCCESS at {elapsed}s!")
        ipc.ReleaseImagerIPC(ct.c_ushort(0))
        break
else:
    print("\nFailed after 60 seconds.")
    print("The External Communication SDK mode must be enabled manually in PIX Connect.")
