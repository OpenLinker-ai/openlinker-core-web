import { resourceDirectoryQuery } from "@/lib/resource-sharing.mjs";
import { Topbar } from "@/components/layout/topbar";
import { ResourceDirectory } from "@/components/resources/resource-directory";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { MCPDirectoryTabs } from "@/components/catalog/mcp-directory-tabs";
import { fetchCatalogRegistries } from "@/lib/catalog-server";
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
  const registries = await fetchCatalogRegistries();
  const catalog = sp.tab === "catalog" && registries.length > 0;
  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <h1 className="mb-6 text-3xl font-black">
          {resourceSharingMessages[locale].mcpTitle}
        </h1>
        {registries.length > 0 && (
          <MCPDirectoryTabs locale={locale} catalog={catalog} />
        )}
        {catalog ? (
          <CatalogBrowser locale={locale} kind="mcp" registries={registries} />
        ) : (
          <ResourceDirectory
            locale={locale}
            mcp
            {...resourceDirectoryQuery(sp, true)}
          />
        )}
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
