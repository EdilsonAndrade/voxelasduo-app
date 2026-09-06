# Quickstart: Autenticação e proteção do painel administrativo

## 1. Variáveis de ambiente novas

Adicionar em `.env.local` (dev) e nas variáveis de ambiente do projeto na Vercel (produção):

```
# Segredo usado pelo NextAuth para assinar o cookie de sessão (JWT).
# Gerar com: openssl rand -base64 32
AUTH_SECRET=
```

## 2. Cadastrar um administrador

```
npm run seed:admin -- "voce@exemplo.com" "senha-forte-aqui" "Edilson"
npm run seed:admin -- "filha@exemplo.com" "outra-senha-forte" "Filha"
```

O script faz upsert por e-mail — rodar de novo com o mesmo e-mail e senha nova atualiza a senha do administrador existente.

## 3. Login

1. Acessar `/admin/produtos` (ou qualquer rota `/admin`) sem estar logado → redireciona para `/admin/login`.
2. Informar e-mail/senha cadastrados no passo 2.
3. Deve cair de volta em `/admin/produtos`.

## 4. Logout

1. Com o painel aberto, clicar em "Sair" na barra superior.
2. Tentar acessar `/admin/produtos` de novo → deve pedir login outra vez.

## 5. Rotas de API protegidas

```
curl -i http://localhost:3000/api/produtos          # sem cookie de sessão → 401
curl -i http://localhost:3000/api/pedidos/<algumId>  # sem cookie de sessão → 401
curl -i -X POST http://localhost:3000/api/pedidos -d '{...}' -H "Content-Type: application/json"  # continua público (checkout)
```
