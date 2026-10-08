"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function ResourceAnchorRedirect({ targets }: { targets: Record<string, string> }) {
  const router = useRouter();
  useEffect(() => {
    const navigate = () => {
      const target = targets[window.location.hash];
      if (target) router.replace(target);
    };
    navigate();
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, [router, targets]);
  return null;
}
