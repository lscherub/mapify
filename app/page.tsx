import { getPlaces } from "@/lib/data";
import { AppShell } from "@/components/app-shell";

export default async function HomePage() {
  const places = await getPlaces();

  return <AppShell initialPlaces={places} />;
}
