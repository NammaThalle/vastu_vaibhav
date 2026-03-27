"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Home,
    Moon,
    Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/clients", label: "Clients", icon: Users },
    { path: "/settings/services", label: "Settings", icon: Settings },
]

const authPages = ["/login", "/register"]

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [isCheckingAuth, setIsCheckingAuth] = React.useState(true)

    const normalizedPathname = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
    const isAuthPage = authPages.includes(normalizedPathname)

    React.useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token && !isAuthPage) {
            router.push("/login")
        } else if (token && isAuthPage) {
            router.push("/")
        }
        setIsCheckingAuth(false)
    }, [normalizedPathname, isAuthPage, router])

    const handleLogout = () => {
        localStorage.removeItem("token")
        router.push("/login")
    }

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (isAuthPage) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header
                className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
                <div className="flex h-14 md:h-16 items-center justify-between px-4 mx-auto max-w-screen-2xl">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-primary animate-breathing">
                            <Home className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-base md:text-xl tracking-tight">
                            Vastu Vaibhav
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path))
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md",
                                        isActive
                                            ? "bg-accent text-accent-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Right controls: theme + avatar */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="h-9 w-9 relative"
                            aria-label="Toggle theme"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={theme}
                                    initial={{ y: 20, opacity: 0, rotate: -40 }}
                                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                                    exit={{ y: -20, opacity: 0, rotate: 40 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center justify-center"
                                >
                                    {theme === "dark" ? (
                                        <Moon className="h-[1.2rem] w-[1.2rem]" />
                                    ) : (
                                        <Sun className="h-[1.2rem] w-[1.2rem]" />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Account menu">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <span className="text-xs font-bold text-primary">SC</span>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* ── Main Content ────────────────────────────────────────────────── */}
            {/* pb-20 on mobile reserves space above the bottom tab bar */}
            <main className="flex-1 container mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {children}
                </motion.div>
            </main>

            {/* ── Footer (desktop only) ───────────────────────────────────────── */}
            <footer className="hidden md:block border-t py-4 bg-muted/30">
                <div className="container mx-auto px-4 text-center text-xs text-muted-foreground italic">
                    Vastu Vaibhav CRM &middot; © 2026 Professional Consulting Solutions
                </div>
            </footer>

            {/* ── Mobile Bottom Tab Bar ───────────────────────────────────────── */}
            <nav
                className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/60"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                aria-label="Mobile navigation"
            >
                <div className="flex items-stretch h-16">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path))
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={cn(
                                    "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-all",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <motion.div
                                    animate={{ scale: isActive ? 1.1 : 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className={cn(
                                        "flex items-center justify-center h-6 w-6 rounded-lg transition-colors",
                                        isActive && "text-primary"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                </motion.div>
                                <span className={cn(
                                    "text-[10px] font-semibold tracking-tight",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="bottom-tab-indicator"
                                        className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
