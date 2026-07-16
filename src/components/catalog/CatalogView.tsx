"use client";

import { useCallback, useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { ProductsTable } from "./ProductsTable";
import { CampaignsTable } from "./CampaignsTable";
import type { CampaignRow, ProductRow } from "@/lib/finance";

type Tab = "products" | "campaigns";

// One management home for the catalog: products and campaigns, two tabs.
export function CatalogView({
  initialProducts,
  initialCampaigns,
}: {
  initialProducts: ProductRow[];
  initialCampaigns: CampaignRow[];
}) {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState(initialProducts);
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const reloadProducts = useCallback(async () => {
    const res = await fetch("/api/products").catch(() => null);
    if (res?.ok) setProducts((await res.json()).rows);
  }, []);

  const reloadCampaigns = useCallback(async () => {
    const res = await fetch("/api/campaigns").catch(() => null);
    if (res?.ok) setCampaigns((await res.json()).rows);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Catalog</h1>
          <p className="mt-1 text-sm text-ink-secondary">The product line and the campaigns selling it.</p>
        </div>
        <Segmented
          options={[
            { key: "products", label: `Products (${products.length})` },
            { key: "campaigns", label: `Campaigns (${campaigns.length})` },
          ]}
          value={tab}
          onChange={setTab}
          size="md"
        />
      </div>

      {tab === "products" ? (
        <ProductsTable rows={products} onChanged={reloadProducts} />
      ) : (
        <CampaignsTable rows={campaigns} onChanged={reloadCampaigns} />
      )}
    </div>
  );
}
