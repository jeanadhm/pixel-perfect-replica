"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
export function Link({
  to,
  ...props
}: Omit<ComponentProps<typeof NextLink>, "href"> & { to: string }) {
  return <NextLink {...props} href={to} />;
}
