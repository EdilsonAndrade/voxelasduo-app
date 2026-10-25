# Atende os links voxelas://abrir-pasta?caminho=... do admin: abre o
# Explorador de Arquivos com o arquivo selecionado. Só abre pastas — nunca
# executa o arquivo recebido.
param([string]$Url)

Add-Type -AssemblyName System.Windows.Forms

$m = [regex]::Match($Url, '[?&]caminho=([^&]*)')
if (-not $m.Success) {
  [System.Windows.Forms.MessageBox]::Show("Link sem caminho do arquivo: $Url", "Abrir pasta") | Out-Null
  exit 1
}

$caminho = [System.Uri]::UnescapeDataString($m.Groups[1].Value)

if (Test-Path -LiteralPath $caminho -PathType Leaf) {
  Start-Process explorer.exe -ArgumentList "/select,`"$caminho`""
} elseif (Test-Path -LiteralPath $caminho -PathType Container) {
  Start-Process explorer.exe -ArgumentList "`"$caminho`""
} else {
  $pasta = Split-Path -Parent $caminho
  if ($pasta -and (Test-Path -LiteralPath $pasta -PathType Container)) {
    [System.Windows.Forms.MessageBox]::Show("O arquivo não existe mais:`n$caminho`n`nAbrindo a pasta onde ele estava.", "Abrir pasta") | Out-Null
    Start-Process explorer.exe -ArgumentList "`"$pasta`""
  } else {
    [System.Windows.Forms.MessageBox]::Show("Arquivo e pasta não encontrados:`n$caminho", "Abrir pasta") | Out-Null
    exit 1
  }
}
