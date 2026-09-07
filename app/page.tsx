import { redirect } from "next/navigation";

/** A home do comprador é o catálogo — "/" sempre leva para /produtos, logado ou não. */
export default function Home() {
  redirect("/produtos");
}
