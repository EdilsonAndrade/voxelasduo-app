/**
 * Container compartilhado pelas páginas de cliente (Tarefa 10/EDI-84) — sem
 * `SessionProvider`: a sessão é sempre lida server-side via `auth()` de
 * `lib/auth/clienteConfig.ts` (research.md #9b), mesmo padrão do
 * `app/admin/(painel)/layout.tsx` (Tarefa 9).
 */
export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return <div className="container">{children}</div>;
}
