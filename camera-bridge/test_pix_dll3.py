"""Test PIX Connect DLL - find available functions and try to get images."""
import ctypes as ct
import numpy as np
import os
import sys
import shutil
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PIX_SDK = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Direct SDK\Direct SDK Sample\sample\data'

test_dir = os.path.join(SCRIPT_DIR, '_test_pix')
os.makedirs(test_dir, exist_ok=True)
os.chdir(test_dir)

shutil.copy2(os.path.join(PIX_SDK, 'x64', 'bin', 'libirimager.dll'), 'libirimager.dll')
shutil.copy2(os.path.join(PIX_SDK, 'Formats.def'), 'Formats.def')
shutil.copy2(os.path.join(SCRIPT_DIR, 'cam1_meltpool.xml'), 'cam1_meltpool.xml')

libir = ct.CDLL('.\\libirimager.dll')
print("DLL loaded")

# Check which functions exist
functions_to_check = [
    'evo_irimager_usb_init',
    'evo_irimager_get_serial',
    'evo_irimager_get_thermal_image_size',
    'evo_irimager_get_palette_image_size',
    'evo_irimager_get_thermal_palette_image',
    'evo_irimager_get_thermal_palette_image_metadata',
    'evo_irimager_get_thermal_image',
    'evo_irimager_get_palette_image',
    'evo_irimager_terminate',
    'evo_irimager_tcp_init',
    'evo_irimager_set_palette',
    'evo_irimager_multi_usb_init',
    'evo_irimager_multi_get_serial',
    'evo_irimager_multi_get_thermal_image_size',
    'evo_irimager_multi_get_palette_image_size',
]

print("\nAvailable functions:")
available = []
for name in functions_to_check:
    try:
        getattr(libir, name)
        print(f"  YES: {name}")
        available.append(name)
    except AttributeError:
        print(f"  NO:  {name}")

# Init
print("\nInit...")
ret = libir.evo_irimager_usb_init(b'.\\cam1_meltpool.xml', b'', b'')
print(f"Init returned: {ret}")

if ret != 0:
    print("Init failed!")
    os.chdir(SCRIPT_DIR)
    shutil.rmtree(test_dir, ignore_errors=True)
    sys.exit(1)

time.sleep(2)  # Give camera time to warm up

# Try get_thermal_image_size
if 'evo_irimager_get_thermal_image_size' in available:
    tw, th = ct.c_int(), ct.c_int()
    try:
        ret = libir.evo_irimager_get_thermal_image_size(ct.byref(tw), ct.byref(th))
        print(f"Thermal: {tw.value} x {th.value} (ret={ret})")
    except OSError as e:
        print(f"CRASH on thermal size: {e}")
        tw.value = th.value = 0

if 'evo_irimager_get_palette_image_size' in available:
    pw, ph = ct.c_int(), ct.c_int()
    try:
        ret = libir.evo_irimager_get_palette_image_size(ct.byref(pw), ct.byref(ph))
        print(f"Palette: {pw.value} x {ph.value} (ret={ret})")
    except OSError as e:
        print(f"CRASH on palette size: {e}")
        pw.value = ph.value = 0

# Try grabbing a frame
if tw.value > 0 and pw.value > 0:
    np_thermal = np.zeros(tw.value * th.value, dtype=np.uint16)
    np_palette = np.zeros(pw.value * ph.value * 3, dtype=np.uint8)
    thermal_ptr = np_thermal.ctypes.data_as(ct.POINTER(ct.c_ushort))
    palette_ptr = np_palette.ctypes.data_as(ct.POINTER(ct.c_ubyte))

    if 'evo_irimager_get_thermal_palette_image' in available:
        print("\nGrabbing frames (no metadata)...")
        for i in range(20):
            try:
                ret = libir.evo_irimager_get_thermal_palette_image(
                    tw, th, thermal_ptr, pw, ph, palette_ptr)
                if ret == 0:
                    mean_temp = np_thermal.mean() / 10.0 - 100
                    print(f"Frame {i}: mean temp = {mean_temp:.1f} C  *** SUCCESS ***")
                    break
                else:
                    time.sleep(0.3)
            except OSError as e:
                print(f"CRASH: {e}")
                break

try:
    libir.evo_irimager_terminate()
    print("Terminated OK")
except:
    pass

os.chdir(SCRIPT_DIR)
shutil.rmtree(test_dir, ignore_errors=True)
print("Done.")
