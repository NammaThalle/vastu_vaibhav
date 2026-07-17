"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Home, Settings, Users } from "lucide-react"

import { ErrorMessage, Loading, Logo } from "@/components/common"
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
    if (href === "/catalog") return ["/catalog", "/supplier", "/stock"].some((p) => pathname.startsWith(p))
    return pathname.startsWith(href)
}

/** Signed-in layout: top bar on wide screens, bottom tab bar on phones. */
export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const me = useMe()

    if (pathname.startsWith("/login")) {
        return (
            <>
                <Ambient />
                <div className="relative z-10">{children}</div>
            </>
        )
    }

    if (me.isPending) return <Loading full />
    // A 401 redirects to /login through the API client; anything else is shown.
    if (me.isError) {
        return (
            <div className="mx-auto max-w-md p-6">
                <ErrorMessage error={me.error} />
            </div>
        )
    }

    return (
        <div className="relative min-h-screen">
            <Ambient />

            <header className="glass-bar sticky top-0 z-30 border-b">
                <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
                    <Link href="/" className="press flex items-center gap-2.5">
                        <Logo className="h-8 w-8" />
                        <span className="text-lg font-semibold tracking-tight">
                            <span className="text-gradient-warm">Shree</span> Vastu Vaibhav
                        </span>
                    </Link>
                    <nav className="hidden gap-1 md:flex">
                        {NAV.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "press flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                                    isActive(pathname, href)
                                        ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15"
                                        : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/[0.06]",
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-5xl px-4 pb-32 pt-5 md:pb-10">{children}</main>

            {/* Floating pill tab bar on phones. */}
            <nav
                className="fixed inset-x-0 bottom-0 z-30 px-4 md:hidden"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
                <div className="glass-bar mx-auto grid max-w-md grid-cols-4 gap-1 rounded-full border p-1.5 shadow-[0_10px_40px_rgba(146,84,26,0.18)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
                    {NAV.map(({ href, label, icon: Icon }) => {
                        const active = isActive(pathname, href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "press flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition-colors",
                                    active ? "bg-primary text-primary-foreground shadow-md dark:bg-primary/25 dark:text-white" : "text-muted-foreground",
                                )}
                            >
                                <Icon className={cn("h-5 w-5 transition-transform", active && "-translate-y-px scale-110")} />
                                {label}
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}

/** Soft coloured glows behind the glass. Warm in light mode, violet and cyan at night. */
function Ambient() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="animate-drift absolute -left-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-amber-400/20 blur-[100px] dark:bg-violet-600/[0.10]" />
            <div className="animate-drift-slow absolute -right-32 top-1/4 h-[26rem] w-[26rem] rounded-full bg-rose-400/15 blur-[100px] dark:bg-cyan-600/[0.08]" />
            <div className="animate-drift absolute -bottom-40 left-1/4 h-[24rem] w-[24rem] rounded-full bg-orange-300/20 blur-[90px] dark:bg-indigo-600/[0.09]" />
        </div>
    )
}
