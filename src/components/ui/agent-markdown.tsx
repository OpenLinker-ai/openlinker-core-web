import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { remarkJSONAutolinkBoundaries, safeMarkdownURL } from "@/lib/markdown-url.mjs";

export function AgentMarkdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`min-w-0 break-words text-[13px] leading-[1.65] text-[color:var(--ol-ink)] ${className}`}>
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkJSONAutolinkBoundaries]}
        urlTransform={safeMarkdownURL}
        components={{
          a: SafeLink,
          blockquote: ({ children: content }) => <blockquote className="my-3 border-l-4 border-[color:var(--ol-primary)]/35 pl-3 text-[color:var(--ol-muted)]">{content}</blockquote>,
          code: ({ children: content, className: codeClass }) => <code className={`${codeClass ?? ""} rounded bg-[color:var(--ol-soft)] px-1 py-0.5 font-mono text-[0.92em]`}>{content}</code>,
          h1: ({ children: content }) => <h1 className="mb-2 mt-4 text-lg font-black first:mt-0">{content}</h1>,
          h2: ({ children: content }) => <h2 className="mb-2 mt-4 text-base font-black first:mt-0">{content}</h2>,
          h3: ({ children: content }) => <h3 className="mb-1.5 mt-3 font-black first:mt-0">{content}</h3>,
          img: ({ alt }) => <span className="text-[color:var(--ol-muted)]">[{alt || "image"}]</span>,
          li: ({ children: content }) => <li className="my-1">{content}</li>,
          ol: ({ children: content }) => <ol className="my-3 list-decimal space-y-1 pl-6">{content}</ol>,
          p: ({ children: content }) => <p className="my-2 whitespace-pre-wrap first:mt-0 last:mb-0">{content}</p>,
          pre: ({ children: content }) => <pre className="my-3 max-w-full overflow-auto whitespace-pre rounded-[10px] bg-[#102033] p-3 text-[11.5px] leading-relaxed text-white">{content}</pre>,
          table: ({ children: content }) => <div className="my-3 max-w-full overflow-x-auto"><table className="w-full border-collapse text-left text-[12px]">{content}</table></div>,
          td: ({ children: content }) => <td className="border border-[color:var(--ol-line)] px-2 py-1.5 align-top">{content}</td>,
          th: ({ children: content }) => <th className="border border-[color:var(--ol-line)] bg-[color:var(--ol-soft)] px-2 py-1.5 font-black">{content}</th>,
          ul: ({ children: content }) => <ul className="my-3 list-disc space-y-1 pl-6">{content}</ul>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function SafeLink({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      {...props}
      href={safeMarkdownURL(href)}
      rel="noreferrer noopener"
      target="_blank"
      className="font-bold text-[color:var(--ol-primary-dark)] underline underline-offset-2"
    >
      {children}
    </a>
  );
}
