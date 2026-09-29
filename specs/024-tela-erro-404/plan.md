# Implementation Plan: Tela de erro e 404 com a identidade da Voxelas Duo

**Branch**: `edilsonaandrade/edi-113-tela-de-erro-e-de-pagina-nao-encontrada-com-a-identidade-da` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

## Summary
Convenções de arquivo do Next 16.3: `app/error.tsx` (client, prop `retry` — estável desde 16.3), `app/not-found.tsx` e `app/global-error.tsx` (define `<html>/<body>`, importa `globals.css` e fontes, tema claro). Layout compartilhado `components/erro/PaginaErro.tsx` + ilustração `VoxelsErro.tsx` (SVG isométrico: "camada deslocada" no erro, contorno tracejado na 404).

## Technical Context
TypeScript, Next.js 16.3, React 19, CSS Modules; sem dependência nova; i18n inline pt-BR; sem testes automatizados de UI (Test Guide manual, padrão do projeto).

## Constitution Check
Status HTTP de erro preservado (500/404) — nada escondido da aba Network; `console.error` no client + log do servidor com o mesmo digest.

## Project Structure
```text
app/error.tsx · app/not-found.tsx · app/global-error.tsx          # novos
components/erro/PaginaErro.tsx · PaginaErro.module.css · VoxelsErro.tsx   # novos
```
