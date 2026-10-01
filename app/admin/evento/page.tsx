import { redirect } from "next/navigation";
import AppEvento from "@/components/evento/AppEvento";
import { auth } from "@/lib/auth/config";
import { LOGIN_EVENTO } from "@/lib/auth/rotaProtegida";

export default async function PedidosEventoPage() {
  const session = await auth();
  if (!session?.user) redirect(LOGIN_EVENTO);

  return <AppEvento usuario={session.user.name ?? "Equipe"} />;
}
