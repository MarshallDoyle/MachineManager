"""Test PIX Connect DLL - use temp directory to avoid locks."""
import ctypes as ct
import numpy as np
import os
import sys
import shutil
import time
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PIX_SDK = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Direct SDK\Direct SDK Sample\sample\data'

test_dir = tempfile.mkdtemp(prefix='optris_test_')
os.chdir(test_dir)

shutil.copy2(os.path.join(PIX_SDK, 'x64', 'bin', 'libirimager.dll'), 'libirimager.dll')
shutil.copy2(os.path.join(PIX_SDK, 'Formats.def'), 'Formats.def')
shutil.copy2(os.path.join(SCRIPT_DIR, 'cam1_meltpool.xml'), 'cam1_meltpool.xml')

print(f"Test dir: {test_dir}")
libir = ct.CDLL('.\\libirimager.dll')
print("DLL loaded")

# Check available functions
for name in ['evo_irimager_usb_init', 'evo_irimager_get_thermal_image_size',
             'evo_irimager_get_palette_image_size', 'evo_irimager_get_thermal_palette_image',
             'evo_irimager_get_thermal_palette_image_metadata', 'evo_irimager_get_serial',
             'evo_irimager_terminate']:
    try:
        getattr(libir, name)
        print(f"  OK: {name}")
    except AttributeError:
        print(f"  MISSING: {name}")

print("\nInit...")
ret = libir.evo_irimager_usb_init(b'.\\cam1_meltpool.xml', b'', b'')
print(f"Init returned: {ret}")

if ret != 0:
    print("Init FAILED - camera may need USB reconnection")
    sys.exit(1)

print("Waiting 2s for camera...")
time.sleep(2)

tw, th = ct.c_int(), ct.c_int()
try:
    libir.evo_irimager_get_thermal_image_size(ct.byref(tw), ct.byref(th))
    print(f"Thermal: {tw.value} x {th.value}")
except OSError as e:
    print(f"CRASH thermal size: {e}")
    sys.exit(1)

pw, ph = ct.c_int(), ct.c_int()
try:
    libir.evo_irimager_get_palette_image_size(ct.byref(pw), ct.byref(ph))
    print(f"Palette: {pw.value} x {ph.value}")
except OSError as e:
    print(f"CRASH palette size: {e}")
    sys.exit(1)

if tw.value > 0 and pw.value > 0:
    np_thermal = np.zeros(tw.value * th.value, dtype=np.uint16)
    np_palette = np.zeros(pw.value * ph.value * 3, dtype=np.uint8)
    thermal_ptr = np_thermal.ctypes.data_as(ct.POINTER(ct.c_ushort))
    palette_ptr = np_palette.ctypes.data_as(ct.POINTER(ct.c_ubyte))

    print("\nGrabbing frames...")
    for i in range(30):
        try:
            ret = libir.evo_irimager_get_thermal_palette_image(
                tw, th, thermal_ptr, pw, ph, palette_ptr)
            if ret == 0:
                mean_temp = np_thermal.mean() / 10.0 - 100
                print(f"*** FRAME OK! *** mean temp = {mean_temp:.1f} C")

                # Save test image
                from PIL import Image
                rgb = np_palette.reshape(ph.value, pw.value, 3)
                img = Image.fromarray(rgb, 'RGB')
                img.save(os.path.join(SCRIPT_DIR, 'test_frame.jpg'), quality=90)
                print(f"Saved test_frame.jpg to {SCRIPT_DIR}")
                break
            else:
                if i % 5 == 0:
                    print(f"  Frame {i}: waiting... (ret={ret})")
                time.sleep(0.3)
        except OSError as e:
            print(f"CRASH on frame: {e}")
            break
    else:
        print("No frames received after 30 attempts")

try:
    libir.evo_irimager_terminate()
    print("Terminated OK")
except:
    pass

print("Done.")
