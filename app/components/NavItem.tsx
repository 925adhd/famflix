"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`group relative flex h-10 w-10 items-center justify-center rounded transition ${
        active
          ? "bg-accent text-white"
          : "text-zinc-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded bg-black/90 px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
        {label}
      </span>
    </Link>
  );
}
