"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function useBrowserOrigin() {
  return useSyncExternalStore(subscribe, () => window.location.origin, () => "");
}
