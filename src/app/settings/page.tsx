import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { SettingsView } from "@/components/settings/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { name: true, email: true, preferences: true },
  });
  if (!user) redirect("/login");

  const prefs = (user.preferences ?? {}) as { defaultRange?: string; ledgerPageSize?: number };

  return (
    <Shell user={session.user ?? {}}>
      <SettingsView
        name={user.name ?? ""}
        email={user.email}
        defaultRange={prefs.defaultRange ?? "12m"}
        ledgerPageSize={prefs.ledgerPageSize ?? 15}
      />
    </Shell>
  );
}
