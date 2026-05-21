"use client";

import { useSearchParams } from "next/navigation";

export function useDemoHref() {
  const sp = useSearchParams();
  const demo = sp.get("demo") === "1";
  return (href: string) => {
    if (!demo) return href;
    if (/^[a-z]+:/i.test(href) || href.startsWith("//")) return href;
    if (/[?&]demo=1(?:&|$)/.test(href)) return href;
    return href.includes("?") ? `${href}&demo=1` : `${href}?demo=1`;
  };
}
