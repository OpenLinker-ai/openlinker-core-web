import { redirect } from "next/navigation";

export default async function CreatorHubRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  if (tab === "access") redirect("/hub/tokens");
  if (tab === "registry") redirect("/hub/bridge");
  if (tab === "skills") redirect("/hub/skills");

  redirect("/hub/agents");
}
