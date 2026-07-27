import { AdminPanel } from "@/components/admin/admin-panel";
import { getPlaces } from "@/lib/data";

export default async function AdminPage() {
  const places = await getPlaces();

  return <AdminPanel places={places} />;
}
