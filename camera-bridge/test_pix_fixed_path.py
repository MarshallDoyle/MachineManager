"""
Test PIX Connect SDK with proper Formats.def path resolution.
The XML formatspath must point to the directory containing Formats.def,
relative to the XML file location.
"""
import ctypes as ct
import numpy as np
import os
import sys
import shutil
import time
import tempfile

# Create a self-contained test directory
test_dir = tempfile.mkdtemp(prefix='optris_pix_')
print(f"Test dir: {test_dir}")
os.chdir(test_dir)

PIX_ROOT = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Direct SDK\Direct SDK Sample'

# Copy DLL
shutil.copy2(os.path.join(PIX_ROOT, 'sample', 'data', 'x64', 'bin', 'libirimager.dll'), 'libirimager.dll')

# Copy Formats.def (from PIX SDK data directory and also from source)
shutil.copy2(os.path.join(PIX_ROOT, 'sample', 'data', 'Formats.def'), 'Formats.def')

# Create XML with formatspath pointing to current directory
xml_content = '''<?xml version="1.0" encoding="UTF-8"?>
<imager xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <serial>25122066</serial>
  <videoformatindex>0</videoformatindex>
  <formatspath>.\\</formatspath>
  <framerate>15.0</framerate>
  <bispectral>0</bispectral>
  <autoflag>
    <enable>1</enable>
    <mininterval>15.0</mininterval>
    <maxinterval>0.0</maxinterval>
  </autoflag>
  <tchipmode>0</tchipmode>
  <tchipfixedvalue>40.0</tchipfixedvalue>
  <focus>-1</focus>
  <enable_extended_temp_range>0</enable_extended_temp_range>
  <buffer_queue_size>5</buffer_queue_size>
</imager>'''

with open('cam1.xml', 'w') as f:
    f.write(xml_content)

print(f"DLL: {os.path.getsize('libirimager.dll')} bytes")
print(f"Formats.def: {os.path.getsize('Formats.def')} bytes")

# Load DLL
libir = ct.CDLL(os.path.join(test_dir, 'libirimager.dll'))
print("DLL loaded")

# Init with absolute path to XML
xml_abs = os.path.join(test_dir, 'cam1.xml').encode()
print(f"\nInit with {xml_abs}...")
ret = libir.evo_irimager_usb_init(xml_abs, b'', b'')
print(f"Init returned: {ret}")

if ret == 0:
    time.sleep(2)

    tw, th = ct.c_int(), ct.c_int()
    try:
        libir.evo_irimager_get_thermal_image_size(ct.byref(tw), ct.byref(th))
        print(f"Thermal: {tw.value} x {th.value}")
    except OSError as e:
        print(f"CRASH: {e}")

    pw, ph = ct.c_int(), ct.c_int()
    try:
        libir.evo_irimager_get_palette_image_size(ct.byref(pw), ct.byref(ph))
        print(f"Palette: {pw.value} x {ph.value}")
    except OSError as e:
        print(f"CRASH: {e}")

    if tw.value > 0 and pw.value > 0:
        np_thermal = np.zeros(tw.value * th.value, dtype=np.uint16)
        np_palette = np.zeros(pw.value * ph.value * 3, dtype=np.uint8)
        thermal_ptr = np_thermal.ctypes.data_as(ct.POINTER(ct.c_ushort))
        palette_ptr = np_palette.ctypes.data_as(ct.POINTER(ct.c_ubyte))

        print("\nGrabbing frames...")
        for i in range(20):
            try:
                ret = libir.evo_irimager_get_thermal_palette_image(
                    tw, th, thermal_ptr, pw, ph, palette_ptr)
                if ret == 0:
                    mean_temp = np_thermal.mean() / 10.0 - 100
                    print(f"*** FRAME OK! *** mean temp = {mean_temp:.1f} C")
                    break
                time.sleep(0.3)
            except OSError as e:
                print(f"CRASH: {e}")
                break
        else:
            print("No frames after 20 attempts")

    try:
        libir.evo_irimager_terminate()
    except:
        pass
else:
    print("Init failed")

print("Done.")
