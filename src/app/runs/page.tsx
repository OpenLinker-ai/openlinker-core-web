import { redirect } from "next/navigation";

import { pathWithSearchParams } from "@/lib/route-search-params.mjs";

type LegacyRunsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyRunsPage({ searchParams }: LegacyRunsPageProps) {
  const params = await searchParams;
  redirect(pathWithSearchParams("/usage/records", params));
}
