# Quickstart: Setup do Projeto e Infraestrutura Base

Guia manual para validar esta tarefa após a implementação. Nenhum destes passos é executado automaticamente pelo assistente — siga-os você mesmo.

## 1. Configurar variáveis de ambiente locais

1. Copie `.env.example` para `.env.local`.
2. Preencha `MONGODB_URI` com a connection string do seu cluster MongoDB Atlas (tier gratuito M0).

## 2. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` e confirme que a página inicial carrega.

## 3. Verificar a conexão com o banco

```bash
curl http://localhost:3000/api/health
```

Esperado: `{"status":"ok","db":"connected"}`. Se retornar erro, confira `MONGODB_URI`.

## 4. Verificar as rotas-esqueleto

```bash
curl http://localhost:3000/api/produtos
curl http://localhost:3000/api/pedidos
curl -X POST http://localhost:3000/api/webhooks -d '{}' -H "Content-Type: application/json"
```

Esperado: respostas 200 com listas vazias (produtos/pedidos) e `{"received":true}` (webhooks).

## 5. Verificar o deploy contínuo na Vercel

1. Configure o projeto na Vercel apontando para este repositório (se ainda não configurado) e defina `MONGODB_URI` nas variáveis de ambiente do projeto na Vercel.
2. Faça um commit/push de uma alteração simples (ex.: um texto na página inicial).
3. Confirme no painel da Vercel que um novo deploy foi disparado automaticamente e concluiu com sucesso.
4. Acesse a URL de produção e confirme que a alteração está visível.
5. Repita o passo 3 da rota `/api/health` na URL de produção, para confirmar que a aplicação publicada também está conectada ao MongoDB Atlas.

## 6. Confirmar que nenhuma credencial foi versionada

```bash
git status
git diff --cached -- .env.local
```

`.env.local` não deve aparecer em `git status` como rastreado, e nenhum valor de `MONGODB_URI` deve aparecer em nenhum arquivo versionado.
