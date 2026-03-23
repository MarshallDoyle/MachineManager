"""
Minimal test - mirrors the official SDK example as closely as possible.
Run from the camera-bridge directory where libirimager.dll and Formats.def live.
"""
import ctypes as ct
import numpy as np
import os
import sys

# Must run from the directory containing the DLL and Formats.def
os.chdir(os.path.dirname(os.path.abspath(__file__)))
print(f"Working dir: {os.getcwd()}")
print(f"DLL exists: {os.path.exists('libirimager.dll')}")
print(f"Formats.def exists: {os.path.exists('Formats.def')}")

# Load exactly like the SDK example
libir = ct.CDLL('.\\libirimager.dll')
print("DLL loaded OK")

# Use our camera XML (same dir)
xml_path = b'.\\cam1_meltpool.xml'

# Init - single camera API, no argtypes set (matching SDK example)
print(f"\nCalling evo_irimager_usb_init({xml_path})...")
ret = libir.evo_irimager_usb_init(xml_path, b'', b'')
print(f"Init returned: {ret}")

if ret != 0:
    print("Init FAILED - cannot continue")
    sys.exit(1)

# Try get_serial
print("\nCalling evo_irimager_get_serial...")
serial = ct.c_ulong()
try:
    ret = libir.evo_irimager_get_serial(ct.byref(serial))
    print(f"Serial: {serial.value} (ret={ret})")
except OSError as e:
    print(f"CRASH on get_serial: {e}")
    # Try terminate and exit
    try:
        libir.evo_irimager_terminate()
    except:
        pass
    sys.exit(1)

# Try get sizes
print("\nCalling evo_irimager_get_thermal_image_size...")
tw, th = ct.c_int(), ct.c_int()
try:
    libir.evo_irimager_get_thermal_image_size(ct.byref(tw), ct.byref(th))
    print(f"Thermal: {tw.value} x {th.value}")
except OSError as e:
    print(f"CRASH on get_thermal_image_size: {e}")

print("\nCalling evo_irimager_get_palette_image_size...")
pw, ph = ct.c_int(), ct.c_int()
try:
    libir.evo_irimager_get_palette_image_size(ct.byref(pw), ct.byref(ph))
    print(f"Palette: {pw.value} x {ph.value}")
except OSError as e:
    print(f"CRASH on get_palette_image_size: {e}")

# Try to grab one frame
if tw.value > 0 and pw.value > 0:
    print("\nTrying to grab a frame...")
    np_thermal = np.zeros(tw.value * th.value, dtype=np.uint16)
    np_palette = np.zeros(pw.value * ph.value * 3, dtype=np.uint8)
    thermal_ptr = np_thermal.ctypes.data_as(ct.POINTER(ct.c_ushort))
    palette_ptr = np_palette.ctypes.data_as(ct.POINTER(ct.c_ubyte))

    class EvoIRFrameMetadata(ct.Structure):
        _fields_ = [
            ("counter", ct.c_uint),
            ("counterHW", ct.c_uint),
            ("timestamp", ct.c_longlong),
            ("timestampMedia", ct.c_longlong),
            ("flagState", ct.c_int),
            ("tempChip", ct.c_float),
            ("tempFlag", ct.c_float),
            ("tempBox", ct.c_float),
        ]

    metadata = EvoIRFrameMetadata()

    import time
    for attempt in range(10):
        try:
            ret = libir.evo_irimager_get_thermal_palette_image_metadata(
                tw, th, thermal_ptr,
                pw, ph, palette_ptr,
                ct.byref(metadata)
            )
            if ret == 0:
                mean_temp = np_thermal.mean() / 10.0 - 100
                print(f"Frame {attempt}: mean temp = {mean_temp:.1f} C")
                break
            else:
                print(f"Frame {attempt}: ret={ret}, retrying...")
                time.sleep(0.2)
        except OSError as e:
            print(f"CRASH on frame grab: {e}")
            break

print("\nTerminating...")
try:
    libir.evo_irimager_terminate()
    print("Terminated OK")
except OSError as e:
    print(f"CRASH on terminate: {e}")

print("Done.")
