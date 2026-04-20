"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function BottomTab({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
        active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <span className={active ? "text-accent" : ""}>{icon}</span>
      <span className="tracking-wide">{label}</span>
    </Link>
  );
}
