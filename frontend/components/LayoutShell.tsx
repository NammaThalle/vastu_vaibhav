"use client"

import { usePathname } from "next/navigation"
import { AppLayout } from "@/components/AppLayout"

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith("/invoice")) {
    return <>{children}</>
  }

  return <AppLayout>{children}</AppLayout>
}
