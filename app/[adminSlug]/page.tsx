import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { fetchAdminPlaces } from "@/lib/admin-crud";
import { getAdminRouteSlug, readAdminSessionFromCookies } from "@/lib/admin-auth";

type PageProps = {
  params: Promise<{
    adminSlug: string;
  }>;
};

export default async function SecretAdminPage({ params }: PageProps) {
  const { adminSlug } = await params;
  const configuredSlug = getAdminRouteSlug();

  if (!configuredSlug || adminSlug !== configuredSlug) {
    notFound();
  }

  const username = await readAdminSessionFromCookies();
  if (!username) {
    return <AdminLogin routeSlug={configuredSlug} />;
  }

  const places = await fetchAdminPlaces();
  return <AdminDashboard initialPlaces={places} routeSlug={configuredSlug} username={username} />;
}
