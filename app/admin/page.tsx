import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { getPlaces } from "@/lib/data";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export const metadata = {
  title: "Admin Console — Mapify",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminPage() {
  const session = await getAuthenticatedAdmin();

  if (!session) {
    redirect("/admin/login");
  }

  const places = await getPlaces();

  return <AdminPanel places={places} admin={session.admin} />;
}
