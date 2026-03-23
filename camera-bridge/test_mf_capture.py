"""
Try different methods to capture from the PI 1M camera.
"""
import cv2
import subprocess
import sys

# Method 1: Try by device path
print("=== Method 1: OpenCV with device path ===")
device_path = r"USB\VID_0403&PID_DE37&MI_00\7&2D3CB669&0&0000"
# Try variations of device path format
for path in [
    f"@device:pnp:\\\\?\\usb#vid_0403&pid_de37&mi_00#7&2d3cb669&0&0000#{{65e8773d-8f56-11d0-a3b9-00a0c9223196}}",
    f"@device:pnp:\\\\?\\usb#vid_0403&pid_de37&mi_00#7&2d3cb669&0&0000#{{e5323777-f976-4f5b-9b55-b94699c46e44}}",
]:
    cap = cv2.VideoCapture(path, cv2.CAP_DSHOW)
    if cap.isOpened():
        print(f"  Opened with: {path}")
        ret, frame = cap.read()
        if ret:
            print(f"  Frame: {frame.shape}")
        cap.release()
    else:
        print(f"  Failed: {path[:60]}...")

# Method 2: List all Media Foundation devices
print("\n=== Method 2: PowerShell list MF devices ===")
ps = '''
Add-Type -AssemblyName System.Runtime.InteropServices
# List all video capture devices via WMI
Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPClass -eq "Camera" -or $_.PNPClass -eq "Image" } | Select-Object FriendlyName, DeviceID, Status | Format-Table -AutoSize
'''
result = subprocess.run(['powershell', '-NoProfile', '-Command', ps], capture_output=True, text=True)
print(result.stdout)

# Method 3: Try ffmpeg to list devices
print("\n=== Method 3: Check ffmpeg dshow devices ===")
try:
    result = subprocess.run(
        ['ffmpeg', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'],
        capture_output=True, text=True, timeout=5
    )
    print(result.stderr)  # ffmpeg outputs to stderr
except FileNotFoundError:
    print("  ffmpeg not found")
except subprocess.TimeoutExpired:
    print("  ffmpeg timed out")

# Method 4: Try accessing camera directly via OpenCV with MSMF and specific settings
print("\n=== Method 4: OpenCV MSMF with device enumeration ===")
for idx in range(4):
    cap = cv2.VideoCapture(idx, cv2.CAP_MSMF)
    if cap.isOpened():
        backend = cap.getBackendName()
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"  Index {idx}: {backend} {w}x{h}")
        cap.release()

# Method 5: Try with the camera name via DSHOW
print("\n=== Method 5: OpenCV DSHOW by name ===")
for name in ["PI IMAGER", "PI_IMAGER"]:
    cap = cv2.VideoCapture(f"video={name}", cv2.CAP_DSHOW)
    if cap.isOpened():
        print(f"  Opened '{name}'!")
        cap.release()
    else:
        print(f"  Failed: '{name}'")

print("\nDone.")
