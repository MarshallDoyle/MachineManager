"""
Test with PIX Connect's SDK DLL + its Formats.def.
Copy PIX Connect files to our directory and test.
"""
import ctypes as ct
import os
import sys
import shutil
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

PIX_SDK = r'C:\Program Files (x86)\Optris GmbH\PIX Connect\SDK\Direct SDK\Direct SDK Sample\sample\data'

# Copy PIX Connect DLL and Formats.def to our directory
pix_dll = os.path.join(PIX_SDK, 'x64', 'bin', 'libirimager.dll')
pix_formats = os.path.join(PIX_SDK, 'Formats.def')

# Backup our files
if os.path.exists('libirimager.dll.bak'):
    os.remove('libirimager.dll.bak')
if os.path.exists('Formats.def.bak'):
    os.remove('Formats.def.bak')

os.rename('libirimager.dll', 'libirimager.dll.bak')
os.rename('Formats.def', 'Formats.def.bak')

try:
    shutil.copy2(pix_dll, 'libirimager.dll')
    shutil.copy2(pix_formats, 'Formats.def')
    print(f"Copied PIX Connect DLL ({os.path.getsize('libirimager.dll')} bytes)")
    print(f"Copied PIX Connect Formats.def ({os.path.getsize('Formats.def')} bytes)")

    # Load
    libir = ct.CDLL('.\\libirimager.dll')
    print("DLL loaded")

    # Init with our camera XML
    xml_path = b'.\\cam1_meltpool.xml'
    print(f"\nInit with {xml_path}...")
    ret = libir.evo_irimager_usb_init(xml_path, b'', b'')
    print(f"Init returned: {ret}")

    if ret == 0:
        time.sleep(1)
        serial = ct.c_ulong()
        try:
            ret = libir.evo_irimager_get_serial(ct.byref(serial))
            print(f"Serial: {serial.value} (ret={ret})")
        except OSError as e:
            print(f"CRASH on get_serial: {e}")

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

        try:
            libir.evo_irimager_terminate()
        except:
            pass
    else:
        print("Init failed!")

finally:
    # Restore original files
    del libir
    import gc
    gc.collect()
    time.sleep(0.5)

    try:
        if os.path.exists('libirimager.dll'):
            os.remove('libirimager.dll')
        os.rename('libirimager.dll.bak', 'libirimager.dll')
    except Exception as e:
        print(f"Warning: couldn't restore DLL: {e}")

    try:
        if os.path.exists('Formats.def'):
            os.remove('Formats.def')
        os.rename('Formats.def.bak', 'Formats.def')
    except Exception as e:
        print(f"Warning: couldn't restore Formats.def: {e}")

print("Done.")
