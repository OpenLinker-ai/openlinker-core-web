import type { Locale } from "@/lib/i18n";
import { repositoryLink, type ResourceMetadata } from "@/lib/resource-metadata";
import { resourceMetadataMessages } from "@/messages/resource-metadata";

export function ResourceMetadataCard({
  metadata,
  locale,
  version,
  unavailable = false,
}: {
  metadata?: ResourceMetadata | null;
  locale: Locale;
  version?: string;
  unavailable?: boolean;
}) {
  const c = resourceMetadataMessages[locale];
  const url = repositoryLink(metadata?.repository_url);
  return (
    <section className="ol-panel min-w-0 space-y-4 p-6">
      <h2 className="text-lg font-bold">{c.title}</h2>
      {version && (
        <p className="text-sm">
          {c.version}: {version}
        </p>
      )}
      <p className="text-xs leading-relaxed text-[color:var(--ol-muted)]">
        {c.claim}
      </p>
      {version && (
        <p className="text-xs text-[color:var(--ol-muted)]">{c.hashScope}</p>
      )}
      {unavailable ? (
        <p role="status">{c.unavailable}</p>
      ) : (
        <dl className="space-y-3 text-sm">
          {(
            [
              "publisher_name",
              "repository_url",
              "license",
              "release_notes",
            ] as const
          ).map((field) => (
            <div key={field} className="min-w-0">
              <dt className="font-semibold">{c[field]}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-[color:var(--ol-muted)]">
                {field === "repository_url" ? (
                  url ? (
                    <a
                      className="break-all underline"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                    >
                      {metadata?.repository_url}
                    </a>
                  ) : (
                    c.missing
                  )
                ) : (
                  metadata?.[field] || c.missing
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
