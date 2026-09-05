# Quickstart: Integração de Pagamento — Mercado Pago (EDI-77)

## Pré-requisitos

- Ambiente das Tarefas 1-3 já configurado (`.env.local` com `MONGODB_URI`, `BLOB_READ_WRITE_TOKEN`) e ao menos um pedido `"pendente"` possível de criar via `/checkout`.
- Credenciais de teste do Mercado Pago em `.env.local`: `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` (já preenchidas nesta sessão).
- Novas dependências desta tarefa: `mercadopago` (SDK server) e `@mercadopago/sdk-react` (Payment Brick) — instaladas durante a implementação.
- ngrok configurado (já disponível no ambiente do usuário) para expor o webhook em dev.

## Passo do usuário: registrar o webhook no painel do Mercado Pago

Só é possível obter/confirmar o `MERCADOPAGO_WEBHOOK_SECRET` de teste depois de cadastrar uma URL de webhook:

1. Rodar `ngrok http 3000` (com `npm run dev` já rodando) e copiar a URL pública gerada (ex: `https://abcd1234.ngrok-free.app`).
2. No painel do Mercado Pago Developers → Suas integrações → aplicação de teste → Webhooks → configurar URL: `https://<subdomínio>.ngrok-free.app/api/pagamentos/webhook`, evento "Pagamentos".
3. Copiar a "Assinatura secreta" gerada para `MERCADOPAGO_WEBHOOK_SECRET` em `.env.local`.
4. Repetir o passo 1-3 sempre que reiniciar o ngrok gratuito (a URL muda a cada sessão).

## Verificação local (sem subir servidor — conforme regra do projeto)

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npx vitest run` — testes unitários de validação de assinatura do webhook, conversão centavos↔reais e mapeamento de status do Mercado Pago
4. `npm run build` — garante que as novas rotas (`POST /api/pagamentos`, `POST /api/pagamentos/webhook`) e a página `/pedido/[id]` atualizada compilam sem erros

## Fluxo de teste manual (a ser seguido pelo usuário, não pelo agente — conforme regra do projeto)

Ver seção "Como testar" no relatório final de implementação (Test Guide), incluindo: pagar um pedido pendente com cartão de teste aprovado/recusado, pagar via Pix de teste, conferir a atualização do pedido no MongoDB após o webhook, e simular reenvio de notificação para confirmar que não duplica efeito.
