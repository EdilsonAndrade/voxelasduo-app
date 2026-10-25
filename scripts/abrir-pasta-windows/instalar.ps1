# Registra o protocolo voxelas:// para o usuário atual (sem precisar de
# administrador), apontando para o abrir-pasta.ps1 desta mesma pasta.
#   powershell -ExecutionPolicy Bypass -File scripts\abrir-pasta-windows\instalar.ps1
# Para remover: Remove-Item -Recurse HKCU:\Software\Classes\voxelas

$script = Join-Path $PSScriptRoot "abrir-pasta.ps1"
$chave = "HKCU:\Software\Classes\voxelas"

New-Item -Path "$chave\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path $chave -Name "(default)" -Value "URL:Voxelas - abrir pasta"
Set-ItemProperty -Path $chave -Name "URL Protocol" -Value ""
Set-ItemProperty -Path "$chave\shell\open\command" -Name "(default)" `
  -Value "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`" `"%1`""

Write-Host "Protocolo voxelas:// instalado -> $script"
