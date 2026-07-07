"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Home, Settings, Users } from "lucide-react"

import { useMe } from "@/lib/queries"
import { cn } from "@/lib/utils"

const NAV = [
    { href: "/", label: "Home", icon: Home },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/catalog", label: "Catalog", icon: BookOpen },
    { href: "/settings", label: "Settings", icon: Settings },
]

function isActive(pathname: string, href: string): boolean {
    if (href === "/") return pathname === "/"
    if (href === "/clients") return ["/clients", "/client", "/property"].some((p) => pathname.startsWith(p))
    return pathname.startsWith(href)
}

/** Signed-in layout: top bar on wide screens, bottom tab bar on phones. */
export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const me = useMe()

    if (pathname.startsWith("/login")) return <>{children}</>

    if (me.isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }
    // A failed /me request redirects to /login through the API client.
    if (me.isError) return null

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
                    <Link href="/" className="text-lg font-semibold tracking-tight">
                        Vastu Vaibhav
                    </Link>
                    <nav className="hidden gap-1 md:flex">
                        {NAV.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    isActive(pathname, href)
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-10">{children}</main>

            <nav
                className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 backdrop-blur md:hidden"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                {NAV.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex flex-col items-center gap-1 py-2.5 text-xs font-medium",
                            isActive(pathname, href) ? "text-primary" : "text-muted-foreground",
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        {label}
                    </Link>
                ))}
            </nav>
        </div>
    )
}
