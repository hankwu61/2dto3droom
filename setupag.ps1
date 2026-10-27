$agyPath = "$env:LOCALAPPDATA\agy\bin\agy.exe"

if (-not (Test-Path -LiteralPath $agyPath)) {
    irm https://antigravity.google/cli/install.ps1 | iex
}

if (Test-Path -LiteralPath $agyPath) {
    Set-Location D:\2Dto3DROOM
    & $agyPath --version
    & $agyPath
} else {
    Write-Host "can not find agy.exe"
}