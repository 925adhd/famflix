"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useDemoHref } from "./demoHref";

type LinkProps = ComponentProps<typeof Link>;

export function DemoLink({ href, ...rest }: LinkProps) {
  const withDemo = useDemoHref();
  const next = typeof href === "string" ? withDemo(href) : href;
  return <Link href={next} {...rest} />;
}
