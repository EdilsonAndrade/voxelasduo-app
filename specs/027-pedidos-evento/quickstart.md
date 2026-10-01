# Quickstart: Pedidos de evento

## Preparação (uma vez)
1. Criar os usuários da equipe (a senha é passada por argumento e só o hash é gravado):
   ```bash
   npm run seed:equipe -- "<senha>"
   ```
   Cria/atualiza malu, isadora, ana e edilson (papel `equipe`).
2. Em cada celular, **com internet**, abrir `https://www.voxelasduo.com.br/admin/evento/entrar`, entrar, deixar o navegador salvar a senha e abrir a tela uma vez. Isso guarda a tela para uso offline.
3. Opcional: "Adicionar à tela inicial" no menu do navegador.

## Fluxo
1. Escolher/digitar o evento uma vez.
2. Para cada cliente: nome → WhatsApp → item (foto e/ou descrição, quantidade) → "Salvar pedido".
3. A barra superior mostra "Tudo enviado" ou "N aguardando internet".
4. Aba "Pedidos": busca por nome ou WhatsApp → abrir → editar → salvar.

## Verificação no banco
```js
db.pedidosEvento.find().sort({ criadoEm: -1 }).limit(5)
db.usuarios.find({ papel: "equipe" }, { usuario: 1, nome: 1 })
```
