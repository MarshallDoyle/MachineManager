"""
Camera Bridge - Streams Optris thermal camera frames over WebSocket.

Uses PIX Connect's Connect SDK (ImagerIPC2) to get frames via shared memory.
StartImagerIPC launches PIX Connect automatically — no manual setup needed.

Camera 1 (PI 1M, USB):       ws://localhost:9801  - Meltpool
Camera 2 (Xi 410, Ethernet):  ws://localhost:9802  - Build Plate (future)
"""

import asyncio
import io
import os
import subprocess
import sys
import threading
import time
import ctypes as ct

import numpy as np
from PIL import Image

try:
    import websockets
    from websockets.asyncio.server import serve
except ImportError:
    print("ERROR: websockets not installed. Run: pip install websockets")
    sys.exit(1)

# --- Configuration ---
MELTPOOL_PORT = 9801
BUILDPLATE_PORT = 9802
TARGET_FPS = 15
FRAME_INTERVAL = 1.0 / TARGET_FPS

# IPC event flags
IPC_EVENT_INIT_COMPLETED = 0x0001
IPC_EVENT_SERVER_STOPPED = 0x0002
IPC_EVENT_FRAME_INIT = 0x0010

# PIX Connect paths
PIX_CONNECT_DIR = r'C:\Program Files (x86)\Optris GmbH\PIX Connect'
PIX_CONNECT_EXE = os.path.join(PIX_CONNECT_DIR, 'Imager.exe')
IPC_DLL_DIR = os.path.join(PIX_CONNECT_DIR, r'SDK\Connect SDK\Lib\v120')
IPC_DLL = os.path.join(IPC_DLL_DIR, 'ImagerIPC2x64.dll')


def make_iron_palette():
    """Generate an iron/heat colormap (256 entries, RGB)."""
    palette = np.zeros((256, 3), dtype=np.uint8)
    for i in range(256):
        t = i / 255.0
        if t < 0.25:
            r, g, b = 0, 0, int(t * 4 * 128)
        elif t < 0.5:
            r, g, b = int((t - 0.25) * 4 * 255), 0, 128 + int((t - 0.25) * 4 * 127)
        elif t < 0.75:
            r, g, b = 255, int((t - 0.5) * 4 * 255), int(255 - (t - 0.5) * 4 * 255)
        else:
            r, g, b = 255, 255, int((t - 0.75) * 4 * 255)
        palette[i] = [r, g, b]
    return palette

IRON_PALETTE = make_iron_palette()


def setup_ipc_dll():
    """Load and configure the ImagerIPC2 DLL."""
    if not os.path.exists(IPC_DLL):
        print(f"ERROR: ImagerIPC2x64.dll not found at {IPC_DLL}")
        print("Is PIX Connect installed?")
        sys.exit(1)

    os.add_dll_directory(IPC_DLL_DIR)
    os.add_dll_directory(PIX_CONNECT_DIR)

    ipc = ct.WinDLL(IPC_DLL)

    # Define function signatures (stdcall / WINAPI convention)
    signatures = [
        ('SetImagerIPCCount', [ct.c_ushort], ct.c_long),
        ('InitImagerIPC', [ct.c_ushort], ct.c_long),
        ('StartImagerIPC', [ct.c_ushort], ct.c_long),
        ('RunImagerIPC', [ct.c_ushort], ct.c_long),
        ('ReleaseImagerIPC', [ct.c_ushort], ct.c_long),
        ('GetIPCState', [ct.c_ushort, ct.c_bool], ct.c_ushort),
        ('GetFrameConfig', [ct.c_ushort, ct.POINTER(ct.c_int), ct.POINTER(ct.c_int), ct.POINTER(ct.c_int)], ct.c_long),
        ('GetFrame', [ct.c_ushort, ct.c_ushort, ct.c_void_p, ct.c_uint, ct.c_void_p], ct.c_long),
        ('ImagerIPCProcessMessages', [ct.c_ushort], ct.c_long),
        ('GetFrameQueue', [ct.c_ushort], ct.c_ushort),
        ('GetTempTarget', [ct.c_ushort], ct.c_float),
        ('GetSerialNumber', [ct.c_ushort], ct.c_ulong),
    ]
    for name, args, res in signatures:
        fn = getattr(ipc, name)
        fn.argtypes = args
        fn.restype = res

    return ipc


class FrameMetadata(ct.Structure):
    _fields_ = [
        ("Size", ct.c_ushort),
        ("Counter", ct.c_uint),
        ("CounterHW", ct.c_uint),
        ("Timestamp", ct.c_longlong),
        ("TimestampMedia", ct.c_longlong),
        ("FlagState", ct.c_int),
        ("TempChip", ct.c_float),
        ("TempFlag", ct.c_float),
        ("TempBox", ct.c_float),
        ("PIFin", ct.c_ushort * 2),
    ]


def is_pix_connect_running() -> bool:
    """Check if PIX Connect (Imager.exe) is already running."""
    try:
        result = subprocess.run(
            ['tasklist', '/FI', 'IMAGENAME eq Imager.exe', '/NH'],
            capture_output=True, text=True, timeout=5
        )
        return 'Imager.exe' in result.stdout
    except Exception:
        return False


def launch_pix_connect():
    """Launch PIX Connect minimized."""
    if not os.path.exists(PIX_CONNECT_EXE):
        print(f"ERROR: PIX Connect not found at {PIX_CONNECT_EXE}")
        sys.exit(1)

    print(f"[PIX Connect] Launching: {PIX_CONNECT_EXE}")
    # Launch minimized using SW_SHOWMINIMIZED via start command
    subprocess.Popen(
        ['cmd', '/c', 'start', '/min', '', PIX_CONNECT_EXE],
        shell=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Give it time to start up
    print("[PIX Connect] Waiting for startup...")
    for i in range(30):
        time.sleep(1)
        if is_pix_connect_running():
            print(f"[PIX Connect] Running after {i + 1}s")
            return
    print("[PIX Connect] WARNING: may not have started")


def kill_pix_connect():
    """Force-kill PIX Connect process."""
    try:
        subprocess.run(['taskkill', '/F', '/IM', 'Imager.exe'], capture_output=True, timeout=5)
        print("[PIX Connect] Killed")
    except Exception:
        pass


class PIXConnectCamera:
    """Gets thermal frames from PIX Connect via IPC (Connect SDK)."""

    def __init__(self, name: str, ipc_index: int, ipc, port: int):
        self.name = name
        self.ipc_index = ct.c_ushort(ipc_index)
        self.ipc = ipc
        self.port = port
        self.running = False
        self._frame: bytes | None = None
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self.mean_temp: float = 0.0
        self.frame_w = 0
        self.frame_h = 0
        self.frame_depth = 0

    @property
    def latest_frame(self) -> bytes | None:
        with self._lock:
            return self._frame

    def _wait_for_frames(self, timeout: float = 30.0) -> bool:
        """Poll IPC for init completed + frame init events."""
        connected = False
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            state = self.ipc.GetIPCState(self.ipc_index, ct.c_bool(True))

            if state & IPC_EVENT_SERVER_STOPPED:
                print(f"[{self.name}] PIX Connect server stopped")
                return False

            if not connected and (state & IPC_EVENT_INIT_COMPLETED):
                connected = True
                serial = self.ipc.GetSerialNumber(self.ipc_index)
                print(f"[{self.name}] Connected! Serial: {serial}")

            if state & IPC_EVENT_FRAME_INIT:
                w, h, d = ct.c_int(0), ct.c_int(0), ct.c_int(0)
                ret = self.ipc.GetFrameConfig(self.ipc_index, ct.byref(w), ct.byref(h), ct.byref(d))
                if ret >= 0:
                    self.frame_w = w.value
                    self.frame_h = h.value
                    self.frame_depth = d.value
                    print(f"[{self.name}] Frame: {self.frame_w}x{self.frame_h}, depth={self.frame_depth}")
                    return True

            self.ipc.ImagerIPCProcessMessages(self.ipc_index)
            time.sleep(0.1)

        print(f"[{self.name}] Timeout waiting for frames ({timeout:.0f}s)")
        return False

    def _try_init_ipc(self) -> bool:
        """Try InitImagerIPC (connect to existing PIX Connect)."""
        ret = self.ipc.InitImagerIPC(self.ipc_index)
        if ret < 0:
            return False
        ret = self.ipc.RunImagerIPC(self.ipc_index)
        if ret < 0:
            self.ipc.ReleaseImagerIPC(self.ipc_index)
            return False
        return self._wait_for_frames(timeout=15.0)

    def init_camera(self, max_retries: int = 5) -> bool:
        """Connect to camera via PIX Connect IPC.

        Strategy: try existing PIX Connect first, then relaunch it fresh.
        A fresh PIX Connect launch makes IPC available within ~8 seconds.
        """
        print(f"[{self.name}] Connecting to PIX Connect IPC (index {self.ipc_index.value})...")

        # Strategy 1: Try connecting to existing PIX Connect
        if self._try_init_ipc():
            return True
        try:
            self.ipc.ReleaseImagerIPC(self.ipc_index)
        except Exception:
            pass

        # Strategy 2: Relaunch PIX Connect fresh and retry
        for attempt in range(max_retries):
            print(f"[{self.name}] Launching PIX Connect (attempt {attempt + 1}/{max_retries})...")
            kill_pix_connect()
            time.sleep(2)
            launch_pix_connect()

            # Poll for IPC availability (PIX Connect needs ~8s to set up shared memory)
            for wait in range(20):  # up to 40 seconds
                time.sleep(2)
                if self._try_init_ipc():
                    return True
                try:
                    self.ipc.ReleaseImagerIPC(self.ipc_index)
                except Exception:
                    pass

            print(f"[{self.name}] PIX Connect launch attempt {attempt + 1} did not produce IPC")

        print(f"[{self.name}] Could not connect after {max_retries} launch attempts")
        return False

    def start(self):
        self.running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join(timeout=3)
        try:
            self.ipc.ReleaseImagerIPC(self.ipc_index)
        except Exception:
            pass

    def _reconnect(self) -> bool:
        """Reconnect by relaunching PIX Connect."""
        print(f"[{self.name}] Reconnecting...")
        try:
            self.ipc.ReleaseImagerIPC(self.ipc_index)
        except Exception:
            pass

        kill_pix_connect()
        time.sleep(2)
        launch_pix_connect()

        for wait in range(20):
            time.sleep(2)
            if self._try_init_ipc():
                return True
            try:
                self.ipc.ReleaseImagerIPC(self.ipc_index)
            except Exception:
                pass

        return False

    def _capture_loop(self):
        frame_size = self.frame_w * self.frame_h * self.frame_depth
        frame_buf = (ct.c_char * frame_size)()
        metadata = FrameMetadata()
        last_frame_time = time.monotonic()
        frame_count = 0

        print(f"[{self.name}] Capture loop started (ws://localhost:{self.port})")

        while self.running:
            start = time.monotonic()

            # Check for events
            state = self.ipc.GetIPCState(self.ipc_index, ct.c_bool(True))
            if state & IPC_EVENT_SERVER_STOPPED:
                print(f"[{self.name}] PIX Connect stopped - will attempt reconnect")
                for reconnect_attempt in range(10):
                    if not self.running:
                        break
                    if self._reconnect():
                        print(f"[{self.name}] Reconnected!")
                        frame_size = self.frame_w * self.frame_h * self.frame_depth
                        frame_buf = (ct.c_char * frame_size)()
                        last_frame_time = time.monotonic()
                        break
                    print(f"[{self.name}] Reconnect {reconnect_attempt + 1}/10 failed, retrying in 5s...")
                    time.sleep(5)
                else:
                    print(f"[{self.name}] Could not reconnect")
                    self.running = False
                    break
                continue

            # Process messages
            self.ipc.ImagerIPCProcessMessages(self.ipc_index)

            # Get frame if available
            queue = self.ipc.GetFrameQueue(self.ipc_index)
            if queue > 0:
                ret = self.ipc.GetFrame(
                    self.ipc_index, ct.c_ushort(100),
                    frame_buf, ct.c_uint(frame_size),
                    ct.byref(metadata)
                )

                if ret >= 0:
                    last_frame_time = time.monotonic()
                    frame_count += 1

                    if self.frame_depth == 2:
                        thermal = np.frombuffer(frame_buf, dtype=np.uint16).reshape(
                            self.frame_h, self.frame_w)
                        self.mean_temp = round((thermal.mean() - 1000.0) / 10.0, 1)

                        tmin, tmax = thermal.min(), thermal.max()
                        if tmax > tmin:
                            normalized = ((thermal - tmin) / (tmax - tmin) * 255).astype(np.uint8)
                        else:
                            normalized = np.zeros_like(thermal, dtype=np.uint8)

                        rgb = IRON_PALETTE[normalized]
                        img = Image.fromarray(rgb.astype(np.uint8), "RGB")
                    else:
                        rgb = np.frombuffer(frame_buf, dtype=np.uint8).reshape(
                            self.frame_h, self.frame_w, 3)
                        img = Image.fromarray(rgb, "RGB")

                    buf = io.BytesIO()
                    img.save(buf, format="JPEG", quality=85)

                    with self._lock:
                        self._frame = buf.getvalue()

                    if frame_count % 150 == 0:
                        print(f"[{self.name}] {frame_count} frames, mean temp: {self.mean_temp}C")

            # Stale frame detection
            if time.monotonic() - last_frame_time > 10.0 and frame_count > 0:
                print(f"[{self.name}] No frames for 10s - attempting reconnect")
                if self._reconnect():
                    frame_size = self.frame_w * self.frame_h * self.frame_depth
                    frame_buf = (ct.c_char * frame_size)()
                    last_frame_time = time.monotonic()
                else:
                    last_frame_time = time.monotonic()

            elapsed = time.monotonic() - start
            if elapsed < FRAME_INTERVAL:
                time.sleep(FRAME_INTERVAL - elapsed)

        print(f"[{self.name}] Capture loop stopped")


async def stream_handler(websocket, camera: PIXConnectCamera):
    print(f"[{camera.name}] Client connected")
    try:
        while camera.running:
            frame = camera.latest_frame
            if frame:
                await websocket.send(frame)
            await asyncio.sleep(FRAME_INTERVAL)
    except websockets.exceptions.ConnectionClosed:
        pass
    print(f"[{camera.name}] Client disconnected")


async def main():
    print("=" * 60)
    print("  Camera Bridge - PIX Connect IPC")
    print("=" * 60)

    wait_mode = "--wait" in sys.argv
    max_retries = 999 if wait_mode else 5

    ipc = setup_ipc_dll()
    print("IPC DLL loaded")

    cameras = [
        {"name": "Meltpool Camera", "ipc_index": 0, "port": MELTPOOL_PORT},
    ]

    active_cameras = []
    for cfg in cameras:
        cam = PIXConnectCamera(cfg["name"], cfg["ipc_index"], ipc, cfg["port"])
        if cam.init_camera(max_retries=max_retries):
            cam.start()
            active_cameras.append(cam)
        else:
            print(f"WARNING: {cfg['name']} failed to connect")

    if not active_cameras:
        print("ERROR: No cameras connected!")
        sys.exit(1)

    print(f"\n{len(active_cameras)} camera(s) active:")

    async def create_servers():
        tasks = []
        for cam in active_cameras:
            print(f"  {cam.name}: ws://localhost:{cam.port}")

            async def run_server(c=cam):
                async def handler(ws, c=c):
                    await stream_handler(ws, c)
                async with serve(handler, "localhost", c.port):
                    await asyncio.Future()
            tasks.append(run_server())
        await asyncio.gather(*tasks)

    print("\nStreaming... Press Ctrl+C to stop.\n")

    try:
        await create_servers()
    finally:
        for cam in active_cameras:
            cam.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nCamera Bridge stopped.")
