# Quickstart: Autenticação e painel do comprador (cliente)

## 1. Variáveis de ambiente novas

Adicionar em `.env.local` (dev) e nas variáveis de ambiente do projeto na Vercel (produção):

```
# Google OAuth (console.cloud.google.com > APIs & Serviços > Credenciais)
# Redirect URI: https://<seu-dominio>/api/auth/cliente/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Segredo do NextAuth do cliente (sessão separada da do admin). Gerar com: openssl rand -base64 32
AUTH_CLIENTE_SECRET=

# Resend (resend.com > API Keys, após verificar o domínio de envio)
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_NOTIFICACAO_EMAIL=
```

## 2. Cadastro e login do cliente

1. Acessar `/cadastro`, informar nome, e-mail e senha → cliente é criado e autenticado, redirecionado para `/minha-conta`.
2. Sair e acessar `/entrar` → logar com o mesmo e-mail/senha funciona.
3. Em `/entrar`, clicar em "Entrar com Google" com uma conta Google de e-mail **diferente** → cria um segundo cliente novo.
4. Em `/entrar`, clicar em "Entrar com Google" usando o **mesmo e-mail** do passo 1 → deve autenticar na mesma conta criada no passo 1 (unificação — não cria um cliente duplicado).

## 3. Recuperação de senha

1. Acessar `/recuperar-senha`, informar o e-mail cadastrado no passo 2.1 → recebe um e-mail com um código de 6 dígitos (verificar a caixa de entrada do domínio configurado em `EMAIL_FROM`/destinatário).
2. Acessar `/redefinir-senha`, informar e-mail + código + nova senha → senha atualizada.
3. Logar em `/entrar` com a nova senha → funciona; com a senha antiga → falha.

## 4. Compra como convidado + associação retroativa

1. Sem estar logado, finalizar uma compra em `/checkout` informando um e-mail (ex: `teste-convidado@exemplo.com`).
2. Criar uma conta nova em `/cadastro` usando exatamente esse mesmo e-mail.
3. Acessar `/minha-conta/pedidos` → o pedido do passo 1 deve aparecer, mesmo sem ter sido feito autenticado.

## 5. "Meus Pedidos" com sessão ativa

1. Logado, finalizar uma nova compra em `/checkout` → o pedido deve aparecer imediatamente em `/minha-conta/pedidos`.
2. No painel administrativo (`/admin/pedidos`), definir status/rastreio desse pedido → recarregar `/minha-conta/pedidos` e conferir que status e rastreio aparecem atualizados.

## 6. Notificação ao admin em venda de canal externo

```
curl -i -X POST http://localhost:3000/api/webhooks/mercado-livre/pedidos \
  -H "Content-Type: application/json" \
  -d '{"resource":"/orders/<idDeTeste>","application_id":"<MERCADOLIVRE_CLIENT_ID configurado>"}'
```

Verificar que o e-mail configurado em `ADMIN_NOTIFICACAO_EMAIL` recebeu a notificação da venda (reenviar a mesma notificação não deve gerar um segundo e-mail — idempotência do webhook).

## 7. Rotas de API protegidas do cliente

```
curl -i http://localhost:3000/api/clientes/pedidos   # sem cookie de sessão de cliente → 401
curl -i -X PATCH http://localhost:3000/api/clientes/me -d '{...}'  # sem sessão → 401
curl -i -X POST http://localhost:3000/api/pedidos -d '{...}' -H "Content-Type: application/json"  # continua público (checkout convidado)
```
