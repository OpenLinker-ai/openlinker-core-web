import { resourceDirectoryQuery } from "@/lib/resource-sharing.mjs";
import { Topbar } from "@/components/layout/topbar";
import { ResourceDirectory } from "@/components/resources/resource-directory";
import { getLocale } from "@/lib/i18n-server";
import { resourceSharingMessages } from "@/messages/resource-sharing";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const sp = await searchParams;
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <h1 className="mb-6 text-3xl font-black">
          {resourceSharingMessages[locale].mcpTitle}
        </h1>
        <ResourceDirectory
          locale={locale}
          mcp
          {...resourceDirectoryQuery(sp, true)}
        />
      </main>
    </>
  );
}

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: resourceSharingMessages[locale].mcpTitle,
    description: resourceSharingMessages[locale].mcpLead,
  };
}
