"""
Test capturing from PI 1M via OpenCV (uses Media Foundation on Windows 11).
The camera is a UVC device - we should be able to get raw frames.
"""
import cv2
import numpy as np
import sys
import time

print("OpenCV version:", cv2.__version__)

# Try camera indices 0-3
for idx in range(4):
    print(f"\n--- Trying camera index {idx} ---")

    # Try with DirectShow backend first
    for backend_name, backend in [("DSHOW", cv2.CAP_DSHOW), ("MSMF", cv2.CAP_MSMF), ("ANY", cv2.CAP_ANY)]:
        cap = cv2.VideoCapture(idx, backend)
        if cap.isOpened():
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
            fourcc_str = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])
            print(f"  [{backend_name}] Opened! {w}x{h} @ {fps}fps, FourCC: {fourcc_str}")

            # Try to grab a frame
            for attempt in range(5):
                ret, frame = cap.read()
                if ret:
                    print(f"  Frame shape: {frame.shape}, dtype: {frame.dtype}")
                    print(f"  Min: {frame.min()}, Max: {frame.max()}, Mean: {frame.mean():.1f}")

                    # Save the frame
                    cv2.imwrite(f'test_cam{idx}_{backend_name}.jpg', frame)
                    print(f"  Saved test_cam{idx}_{backend_name}.jpg")
                    break
                time.sleep(0.2)
            else:
                print(f"  Could not grab frame after 5 attempts")

            cap.release()
        else:
            pass  # Don't print failures, too noisy

print("\nDone.")
