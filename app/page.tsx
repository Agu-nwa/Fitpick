import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function Page() {
  const session = await getSessionUser();
  if (session) redirect("/home");
  redirect("/login");
}
