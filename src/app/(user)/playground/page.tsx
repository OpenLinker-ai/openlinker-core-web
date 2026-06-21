/**
 * 直接访问 /playground 没有 slug 没有意义，引导回市场让用户挑 agent。
 */

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/market");
}
