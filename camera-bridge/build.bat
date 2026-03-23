@echo off
echo Building Camera Bridge...
pip install pyinstaller
pyinstaller --onefile --name camera-bridge bridge.py
echo Done! Output: dist\camera-bridge.exe
pause
