import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCampaigns, getProducts } from "@/lib/finance";
import { Shell } from "@/components/Shell";
import { CatalogView } from "@/components/catalog/CatalogView";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [products, campaigns] = await Promise.all([getProducts(), getCampaigns()]);

  return (
    <Shell user={session.user ?? {}}>
      <CatalogView initialProducts={products} initialCampaigns={campaigns} />
    </Shell>
  );
}
