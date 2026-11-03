"use client";

import { useSyncExternalStore } from "react";

const subscribeToHydration = () => () => undefined;

// 服务端与首次水合返回 false，之后返回 true：格式化本地时间时首屏固定用 UTC，避免时区差导致水合失败。
export function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}
