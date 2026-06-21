/**
 * 直接访问 /playground 没有 slug 没有意义，引导回 Registry 让用户挑 Agent。
 */

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/registry");
}
