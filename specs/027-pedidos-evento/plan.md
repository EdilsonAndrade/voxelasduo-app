# Implementation Plan: Pedidos de evento

**Branch**: `edilsonaandrade/edi-125-pedidos-de-evento-no-admin-mobile-first-offline-e-login-da` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md) | **Linear**: EDI-125

## Summary
Nova área `/admin/evento`, mobile-first, para anotar pedidos feitos em eventos presenciais. Os pedidos ficam na coleção `pedidosEvento`, separada das encomendas do site, com itens embutidos (descrição, quantidade, até 3 fotos), status interno e "anotado por". Os eventos ficam na coleção `eventos`.

O formulário grava **sempre primeiro no aparelho**, numa fila offline em IndexedDB, com as fotos já comprimidas. Um sincronizador envia a fila sozinho quando há conexão: primeiro as fotos (`POST /api/admin/evento/fotos` → URL do Blob) e depois o pedido (`PUT /api/admin/evento/pedidos/[id]`, um upsert idempotente pelo UUID gerado no aparelho). Um service worker com escopo `/admin/evento/` guarda a tela e os assets para abri-la sem internet.

O acesso reaproveita o NextAuth do admin: a coleção `usuarios` ganha `papel` (`admin` | `equipe`) e `usuario` (login curto). Um script cria os 4 usuários da equipe com senha em bcrypt. O `proxy.ts` restringe o papel `equipe` a `/admin/evento*` e `/api/admin/evento/*`. Login com limite de tentativas.

## Technical Context
- **Stack**: TypeScript, Next.js 16.3 (App Router), React 19, CSS Modules, MongoDB (driver 6.12), NextAuth v5 (instância do admin, JWT), Vercel Blob. **Sem dependência nova**: IndexedDB e service worker com APIs nativas.
- **Offline**: IndexedDB (`voxelas-evento`, stores `fila`, `rascunho`, `cache`). Service worker estático `public/sw-evento.js`, escopo `/admin/evento/`.
- **Fotos**: compressão no navegador (canvas → JPEG 0,8, lado maior ≤ 1600px). Upload reaproveita `lib/storage/blob.ts` (nova pasta `eventos`).
- **Idempotência**: `_id` do pedido = UUID v4 gerado no aparelho (`crypto.randomUUID`). O PUT faz upsert e o reenvio não duplica.
- **Auth/papéis**: `papel` ausente = `admin` (compatibilidade com o admin atual). `papel` vai no JWT e na sessão.
- **i18n**: não há biblioteca. Textos em pt-BR inline, no padrão existente.
- **Testes**: Vitest para validação, telefone, repositório, rotas de API, matriz de papéis, autorização e limite de tentativas. UI e offline cobertos pelo Test Guide manual.
- **Layout**: o cabeçalho e o rodapé do site são ocultados em `/admin/evento*` (`ChromeDoSite`, client, via `usePathname`). A área tem um layout próprio, de app.
- **Design**: skill `frontend-design` já carregada nesta conversa. A direção visual está descrita em research.md #9.

## Constitution Check
`constitution.md` ainda é o template, sem princípios ratificados. Aplicamos as regras do CLAUDE.md:
- Erros de API retornam o status HTTP real (400/401/403/413/502), visíveis na aba Network. A fila mostra o erro, não o esconde.
- Não commitar: só sugerir a mensagem.
- Textos novos em pt-BR, no padrão existente.
- Senha nunca no código: o script recebe a senha por argumento e grava o hash.

✅ Sem violações.

## Project Structure
```text
lib/models/usuario.ts                         # + papel, usuario (alterado)
lib/models/pedidoEvento.ts                    # tipos, coleções, status (novo)
lib/eventos/telefone.ts (+ .test.ts)          # dígitos, máscara, link do WhatsApp (novo)
lib/eventos/validacao.ts (+ .test.ts)         # validação do pedido (compartilhada cliente/servidor) (novo)
lib/eventos/repository.ts (+ .test.ts)        # upsert idempotente, listar/buscar, eventos (novo)
lib/auth/autorizarCredenciais.ts (+ test)     # login por usuário curto, papel, limite de tentativas (alterado)
lib/auth/limiteTentativas.ts (+ .test.ts)     # bloqueio após 10 erros em 15 min (novo)
lib/auth/papeis.ts (+ .test.ts)               # rotas permitidas para "equipe" (novo)
lib/auth/rotaProtegida.ts (+ test)            # /admin/evento/entrar público; login da área (alterado)
lib/auth/config.ts, next-auth.d.ts            # papel no JWT/sessão (alterado)
lib/storage/blob.ts                           # + enviarFotoEvento (alterado)
proxy.ts                                      # restrição por papel, login da área (alterado)

app/api/admin/evento/pedidos/route.ts         # GET lista/busca (novo)
app/api/admin/evento/pedidos/[id]/route.ts    # PUT upsert (novo)
app/api/admin/evento/fotos/route.ts           # POST foto → URL (novo)
app/api/admin/evento/eventos/route.ts         # GET nomes de eventos (novo)

app/admin/evento/layout.tsx                   # layout de app, registra o SW (novo)
app/admin/evento/page.tsx                     # tela principal (novo)
app/admin/evento/entrar/page.tsx              # login simples (novo)
components/evento/*                           # AppEvento, FormularioPedido, ItemPedido, ListaPedidos,
                                              # BarraSincronizacao, LoginEquipe, offline/{db,fila,sincronizar,foto}.ts
components/ChromeDoSite.tsx                   # oculta cabeçalho/rodapé na área (novo)
app/layout.tsx                                # usa ChromeDoSite (alterado)
app/admin/(painel)/layout.tsx                 # + link "Pedidos de evento" (alterado)
public/sw-evento.js                           # service worker (novo)
scripts/seed-equipe.ts, package.json          # npm run seed:equipe -- "<senha>" (novo/alterado)
```

## Phases
- **Phase 0**: [research.md](./research.md)
- **Phase 1**: [data-model.md](./data-model.md) · [contracts/evento-api.md](./contracts/evento-api.md) · [quickstart.md](./quickstart.md)

## Riscos
- **Senha fraca e compartilhada (7 dígitos)**: mitigada pelo limite de tentativas e pelo acesso restrito à área. Recomendação: trocar depois do evento rodando o script de novo.
- **Primeira abertura offline**: o service worker só guarda a tela depois de uma visita online. O Test Guide manda abrir a tela antes do evento.
- **Fila por aparelho**: limpar os dados do navegador apaga os pendentes. A tela avisa enquanto houver pendentes.

## Post-design Constitution Check
✅ Mantido: sem dependência nova, erros com status HTTP real, senha só como hash, admin atual intocado (papel ausente = admin).
