import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn 合并 className，去重 / 解决冲突。
 * 用法：<div className={cn("px-2", isActive && "bg-blue-500")} />
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
