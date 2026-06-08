$classKey = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}'
$subkeys = Get-ChildItem -Path $classKey -ErrorAction SilentlyContinue

foreach($key in $subkeys) {
    $desc = Get-ItemProperty -Path $key.PSPath -Name 'DriverDesc' -ErrorAction SilentlyContinue
    if ($desc.DriverDesc -like '*Realtek 8852BE*') {
        Set-ItemProperty -Path $key.PSPath -Name 'PnPCapabilities' -Value 24 -Type DWord -ErrorAction SilentlyContinue
        Write-Host "Updated power setting for Realtek 8852BE. PnPCapabilities set to 24."
    }
}

Write-Host "Process completed. You can close this window."
Start-Sleep -Seconds 3
