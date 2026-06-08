# Disable Fast Startup (Hiberboot)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -Value 0 -Type DWord -ErrorAction SilentlyContinue
Write-Host "Disabled Fast Startup."

# Reset Network Stack
netsh winsock reset
netsh int ip reset
ipconfig /flushdns
Write-Host "Reset Network Stack."

Write-Host "Process completed. You can close this window."
Start-Sleep -Seconds 3
