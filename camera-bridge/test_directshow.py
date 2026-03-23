"""Check if DirectShow can see the camera device."""
import subprocess
import sys

# Use PowerShell to list DirectShow video devices
ps_script = '''
Get-PnpDevice -Class Camera -Status OK | Format-Table -Property FriendlyName,InstanceId,Status -AutoSize
Get-PnpDevice -Class Image -Status OK | Format-Table -Property FriendlyName,InstanceId,Status -AutoSize
Get-PnpDevice | Where-Object { $_.FriendlyName -match "PI|Optris|imager" } | Format-Table -Property FriendlyName,Class,InstanceId,Status -AutoSize
'''

result = subprocess.run(
    ['powershell', '-NoProfile', '-Command', ps_script],
    capture_output=True, text=True
)
print("STDOUT:")
print(result.stdout)
if result.stderr:
    print("STDERR:")
    print(result.stderr)

# Also check for DirectShow source filters via registry
print("\n--- Checking DirectShow video capture devices ---")
reg_script = '''
Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{65E8773D-8F56-11D0-A3B9-00A0C9223196}" -ErrorAction SilentlyContinue |
    Get-ItemProperty -Name FriendlyName -ErrorAction SilentlyContinue |
    Select-Object FriendlyName, PSPath
'''
result2 = subprocess.run(
    ['powershell', '-NoProfile', '-Command', reg_script],
    capture_output=True, text=True
)
print(result2.stdout)

# Check USB devices that might be the camera
print("\n--- USB devices matching Optris VID/PID (0x0403/0xDE37) ---")
usb_script = '''
Get-PnpDevice | Where-Object { $_.InstanceId -match "0403" -and $_.InstanceId -match "DE37" } | Format-List *
'''
result3 = subprocess.run(
    ['powershell', '-NoProfile', '-Command', usb_script],
    capture_output=True, text=True
)
print(result3.stdout if result3.stdout.strip() else "No device found with Optris VID/PID")
