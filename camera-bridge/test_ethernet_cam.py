"""
Test SDK connection to the Xi 410 ethernet camera.
The ethernet path (device_api=5) uses IRDeviceEthernet, NOT DirectShow.
This might work even though the USB camera fails.
"""
import ctypes as ct
import numpy as np
import os
import sys
import time

os.chdir(os.path.dirname(os.path.abspath(__file__)))
print(f"Working dir: {os.getcwd()}")

# Use the v8.9.3 SDK DLL
libir = ct.CDLL('.\\libirimager.dll')
print("DLL loaded (v8.9.3)")

# Init with the ethernet camera XML
xml_path = b'.\\cam2_buildplate.xml'
print(f"\nInit with {xml_path} (Xi 410 @ 192.168.0.101)...")
print("Note: This requires the Xi 410 to be powered on and reachable")

ret = libir.evo_irimager_usb_init(xml_path, b'', b'')
print(f"Init returned: {ret}")

if ret != 0:
    print("Init failed - is the Xi 410 powered on and at 192.168.0.101?")
    print("Check: can you ping 192.168.0.101?")
    sys.exit(1)

time.sleep(2)

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

if tw.value > 0 and pw.value > 0:
    np_thermal = np.zeros(tw.value * th.value, dtype=np.uint16)
    np_palette = np.zeros(pw.value * ph.value * 3, dtype=np.uint8)
    thermal_ptr = np_thermal.ctypes.data_as(ct.POINTER(ct.c_ushort))
    palette_ptr = np_palette.ctypes.data_as(ct.POINTER(ct.c_ubyte))

    class EvoIRFrameMetadata(ct.Structure):
        _fields_ = [
            ("counter", ct.c_uint), ("counterHW", ct.c_uint),
            ("timestamp", ct.c_longlong), ("timestampMedia", ct.c_longlong),
            ("flagState", ct.c_int), ("tempChip", ct.c_float),
            ("tempFlag", ct.c_float), ("tempBox", ct.c_float),
        ]
    metadata = EvoIRFrameMetadata()

    print("\nGrabbing frames...")
    for i in range(20):
        try:
            ret = libir.evo_irimager_get_thermal_palette_image_metadata(
                tw, th, thermal_ptr, pw, ph, palette_ptr, ct.byref(metadata))
            if ret == 0:
                mean_temp = np_thermal.mean() / 10.0 - 100
                print(f"*** FRAME OK! *** mean temp = {mean_temp:.1f} C")

                from PIL import Image
                rgb = np_palette.reshape(ph.value, pw.value, 3)
                img = Image.fromarray(rgb, 'RGB')
                img.save('test_xi410_frame.jpg', quality=90)
                print("Saved test_xi410_frame.jpg")
                break
            else:
                if i % 5 == 0:
                    print(f"  Waiting for frame... (attempt {i})")
                time.sleep(0.3)
        except OSError as e:
            print(f"CRASH: {e}")
            break

try:
    libir.evo_irimager_terminate()
    print("Terminated OK")
except:
    pass

print("Done.")
