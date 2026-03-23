"""Test with PIX Connect SDK DLL (daemon killed, camera should be free)."""
import ctypes as ct
import os
import sys
import shutil
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PIX_SDK = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Direct SDK\Direct SDK Sample\sample\data'

# Work from a temp directory to avoid file locking issues
test_dir = os.path.join(SCRIPT_DIR, '_test_pix')
os.makedirs(test_dir, exist_ok=True)
os.chdir(test_dir)

# Copy needed files
shutil.copy2(os.path.join(PIX_SDK, 'x64', 'bin', 'libirimager.dll'), 'libirimager.dll')
shutil.copy2(os.path.join(PIX_SDK, 'Formats.def'), 'Formats.def')
shutil.copy2(os.path.join(SCRIPT_DIR, 'cam1_meltpool.xml'), 'cam1_meltpool.xml')

print(f"Working dir: {os.getcwd()}")
print(f"DLL size: {os.path.getsize('libirimager.dll')}")

libir = ct.CDLL('.\\libirimager.dll')
print("DLL loaded")

print("\nInit...")
ret = libir.evo_irimager_usb_init(b'.\\cam1_meltpool.xml', b'', b'')
print(f"Init returned: {ret}")

if ret == 0:
    time.sleep(1)
    serial = ct.c_ulong()
    try:
        ret = libir.evo_irimager_get_serial(ct.byref(serial))
        print(f"Serial: {serial.value}")
    except OSError as e:
        print(f"CRASH: {e}")

    tw, th = ct.c_int(), ct.c_int()
    try:
        libir.evo_irimager_get_thermal_image_size(ct.byref(tw), ct.byref(th))
        print(f"Thermal: {tw.value} x {th.value}")
    except OSError as e:
        print(f"CRASH: {e}")

    try:
        libir.evo_irimager_terminate()
    except:
        pass
else:
    print("Init failed - camera may need to be reconnected via USB")
    print("Try: unplug and replug the PI 1M USB cable")

# Cleanup
os.chdir(SCRIPT_DIR)
shutil.rmtree(test_dir, ignore_errors=True)
print("Done.")
