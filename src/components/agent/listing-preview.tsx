"use client";

/**
 * 发布页右侧"Listing 实时预览"卡片。
 *
 * 视觉来自 prototype/openlinker-flow-17-publish.png 的 .listing-preview：
 *   - app-icon 用 form.slug 派生（avatarFromSlug helper，与 Registry 卡复用）
 *   - h3 = form.name；副标题 = "by {creator} · v0.1.0"
 *   - 描述 = form.description
 *   - tag 用 form.tags_input 拆出，前 4 个用色调轮转 chip
 *
 * 表单值通过 props 传入，由父组件 useWatch({ control }) 拿到。
 * 这样 listing-preview 自身不依赖 RHF 实例，纯展示。
 */

import { avatarFromSlug } from "@/components/market/avatar";
import type { Locale } from "@/lib/i18n";

interface ListingPreviewProps {
  slug: string;
  name: string;
  description: string;
  tagsInput: string;
  creatorName: string;
  locale?: Locale;
}

const PALETTE = ["", "ol-chip-blue", "ol-chip-amber", "ol-chip-green"] as const;

function splitTags(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function ListingPreview({
  slug,
  name,
  description,
  tagsInput,
  creatorName,
  locale = "zh",
}: ListingPreviewProps) {
  const avatar = avatarFromSlug(slug || "agent");
  const copy =
    locale === "zh"
      ? {
          unnamed: "未命名 Agent",
          placeholder: "在左侧填写描述后，这里会同步显示 Agent 卡片的预览效果。",
          author: "作者：",
        }
      : {
          unnamed: "Untitled Agent",
          placeholder: "Fill in the description on the left to preview how the listing will look.",
          author: "by ",
        };
  const displayName = name.trim() || copy.unnamed;
  const displayDesc =
    description.trim() ||
    copy.placeholder;
  const tags = splitTags(tagsInput);

  return (
    <div className="ol-listing-preview">
      <div className="ol-pv-head">
        <div
          className="ol-app-icon"
          style={{ width: 44, height: 44, background: avatar.color }}
        >
          {avatar.initials}
        </div>
        <div>
          <h3>{displayName}</h3>
          <div className="ol-pv-rate">
            {copy.author}{creatorName} · v0.1.0
          </div>
        </div>
      </div>
      <p className="ol-pv-desc">{displayDesc}</p>
      {tags.length > 0 && (
        <div className="ol-pv-tags">
          {tags.map((t, i) => (
            <span key={t} className={`ol-chip ${PALETTE[i % PALETTE.length]}`}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
