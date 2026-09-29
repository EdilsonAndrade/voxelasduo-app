# Feature Specification: Tela de erro e de página não encontrada com a identidade da Voxelas Duo

**Feature Branch**: `edilsonaandrade/edi-113-tela-de-erro-e-de-pagina-nao-encontrada-com-a-identidade-da`
**Created**: 2026-09-29
**Status**: Draft
**Input**: Linear EDI-113

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Erro inesperado com orientação clara (Priority: P1)

Quando uma página falha no servidor (ex.: banco indisponível), o visitante vê uma tela da Voxelas Duo em pt-BR que explica o que houve, oferece "Tentar de novo" e "Ver produtos", e mostra o código do erro para informar ao atendimento.

**Acceptance Scenarios**:
1. **Given** uma falha no servidor, **When** a página carrega, **Then** aparece a tela da marca (não a padrão em inglês) com título, explicação, botões e o código do erro.
2. **Given** a falha foi temporária, **When** o visitante clica em "Tentar de novo", **Then** a página é recarregada do servidor.
3. **Given** a falha, **When** se inspeciona a aba Network, **Then** a resposta continua com status de erro.

### User Story 2 - Página não encontrada (Priority: P2)

Um endereço inexistente (ou produto removido) mostra uma tela 404 da marca com atalhos para produtos e página inicial.

**Acceptance Scenarios**:
1. **Given** um endereço inexistente, **When** acessado, **Then** aparece a tela "Página não encontrada" com status 404.

### Edge Cases
- Falha no próprio layout raiz: tela equivalente (global-error), com tema claro e estilos próprios.
- Erro sem código (ex.: erro do navegador): a linha do código não aparece.
- Movimento reduzido: sem animação.

## Requirements *(mandatory)*

- **FR-001**: Tela de erro própria em pt-BR para erros de página, com "Tentar de novo" (recarrega do servidor), "Ver produtos" e o código do erro quando existir.
- **FR-002**: Tela 404 própria em pt-BR com "Ver produtos" e "Página inicial".
- **FR-003**: Fallback para falha do layout raiz com a mesma mensagem.
- **FR-004**: Status HTTP de erro preservado; erro continua registrado nos logs.
- **FR-005**: Layout responsivo (celular), foco visível e respeito a movimento reduzido.

## Success Criteria *(mandatory)*
- **SC-001**: Nenhuma tela padrão em inglês do framework aparece ao visitante em erro ou 404.
- **SC-002**: O visitante consegue voltar a navegar em 1 clique a partir de qualquer tela de erro.

## Assumptions
- Sem biblioteca de i18n no projeto: textos em pt-BR inline (padrão existente).
- Mesmos tokens visuais de `app/globals.css`.
