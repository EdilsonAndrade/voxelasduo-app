import { redirect } from "next/navigation";
import LoginEquipe from "@/components/evento/LoginEquipe";
import { auth } from "@/lib/auth/config";
import { AREA_EVENTO } from "@/lib/auth/papeis";

export default async function EntrarEventoPage() {
  const session = await auth();
  if (session?.user) redirect(AREA_EVENTO);

  return <LoginEquipe />;
}
