import type { Locale } from "@/lib/i18n";
import { schemaFields } from "@/lib/resource-sharing.mjs";
import { resourceJourneyMessages } from "@/messages/resource-journey";
import { resourceUseMessages } from "@/messages/resource-use";

export function SchemaOverview({
  schema,
  title,
  locale,
}: {
  schema: unknown;
  title: string;
  locale: Locale;
}) {
  const c = resourceUseMessages[locale];
  const fields = schemaFields(schema);
  return (
    <section className="min-w-0 space-y-3">
      <h3 className="font-bold">{title}</h3>
      <p className="text-xs leading-relaxed text-[color:var(--ol-muted)]">
        {c.schemaHint}
      </p>
      {fields.length ? (
        <div className="overflow-x-auto rounded-xl border border-[color:var(--ol-line)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:var(--ol-soft)]">
              <tr>
                {[c.field, c.type, c.required, c.default].map((label) => (
                  <th key={label} scope="col" className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr
                  key={field.name}
                  className="border-t border-[color:var(--ol-line)] align-top"
                >
                  <th
                    scope="row"
                    className="max-w-64 break-words p-3 font-normal"
                  >
                    <code>{field.name}</code>
                    {field.allowedValues.length > 0 && <p className="mt-2 break-all text-xs"><span className="font-semibold">{resourceJourneyMessages[locale].allowedValues}: </span><code>{field.allowedValues.map(value => JSON.stringify(value)).join(" | ")}</code></p>}
                    {field.description && (
                      <p className="mt-1 text-xs text-[color:var(--ol-muted)]">
                        {field.description}
                      </p>
                    )}
                  </th>
                  <td className="max-w-32 break-words p-3 font-mono text-xs">
                    {field.type}
                  </td>
                  <td className="p-3">{field.required ? c.yes : c.optional}</td>
                  <td className="max-w-40 break-all p-3 font-mono text-xs">
                    {field.defaultValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[color:var(--ol-muted)]">{c.noFields}</p>
      )}
      <details className="rounded-xl bg-[color:var(--ol-soft)] p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          {c.fullSchema}
        </summary>
        <pre
          tabIndex={0}
          className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs"
        >
          {JSON.stringify(schema, null, 2)}
        </pre>
      </details>
    </section>
  );
}
