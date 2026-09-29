# Quickstart / Test Guide: Banners e destaques da home

Pré-requisito: `npm run dev` rodando e login feito no admin (`/admin/login`).

1. Acesse `/` sem nenhuma seção cadastrada. O site deve redirecionar para `/produtos`, como hoje.
2. No admin, clique em **Banners** → **+ Nova seção** → tipo **Banner hero**. Envie a imagem desktop e a mobile, preencha o título, o texto do botão "Compre agora" e o link `/produtos`. Confira a pré-visualização desktop/mobile e salve (a seção nasce inativa).
3. Ative o banner na lista e abra `/`: o banner aparece com o título sobre a imagem, e o botão leva a `/produtos`. Reduza a janela para menos de 768px: a imagem mobile é exibida.
4. Crie um **Carrossel** "Favoritos dos clientes" e ative. Em **Produtos**, use a coluna **Destaques** para marcar 5 produtos nele. Em `/`, o carrossel mostra os 5, com setas (desktop) e arraste (mobile). Um produto com estoque 0 mostra "Esgotado".
5. Em **Produtos**, filtre por carrossel (`/admin/produtos?carrossel=<id>`): só os marcados aparecem.
6. Na edição do carrossel, mude a ordem dos produtos com as setas e confira a nova ordem em `/`.
7. Crie um **Texto de destaque** e um **Banner intermediário**, ative os dois e reordene as seções na lista. A home segue a nova ordem após recarregar.
8. Desative um banner: ele some de `/` e continua na lista do admin.
9. Aba Network: salve um banner com o link `javascript:alert(1)`. Deve retornar `400` com `campos.botao`. Tente ativar um banner sem imagem: `400` com `campos.imagemDesktop`.
10. Exclua um produto que está em um carrossel: ele some do carrossel da home, sem erro.
11. Sem sessão, execute:
    ```bash
    curl -i http://localhost:3000/api/admin/home/secoes
    ```
    Deve retornar `401`.
12. Conferência no MongoDB (Atlas → Collections ou mongosh):
    ```js
    db.secoesHome.find({}, { tipo: 1, titulo: 1, ativa: 1, ordem: 1, produtoIds: 1 }).sort({ ordem: 1 })
    ```
