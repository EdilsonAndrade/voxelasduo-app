/**
 * Limpa o caminho colado no formulário: o "Copiar como caminho" do Windows
 * coloca o caminho entre aspas.
 */
export function limparCaminhoArquivo(caminho: string): string {
  return caminho.trim().replace(/^"(.*)"$/, "$1").trim();
}

/**
 * Endereço que abre o Explorador de Arquivos com o arquivo selecionado. O
 * navegador não acessa o disco: quem atende `voxelas://` é o ajudante
 * instalado no Windows (scripts/abrir-pasta-windows/instalar.ps1).
 */
export function urlAbrirPasta(caminho: string): string {
  return `voxelas://abrir-pasta?caminho=${encodeURIComponent(limparCaminhoArquivo(caminho))}`;
}
