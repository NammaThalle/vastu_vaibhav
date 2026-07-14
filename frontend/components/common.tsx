import * as React from "react"

import type { PropertyStatus } from "@/lib/api/client"
import { STATUS_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<PropertyStatus, { pill: string; dot: string }> = {
    payment_due: { pill: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300", dot: "bg-rose-500 animate-pulse" },
    in_progress: { pill: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300", dot: "bg-amber-500" },
    enquiry: { pill: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300", dot: "bg-sky-500" },
    closed: { pill: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300", dot: "bg-emerald-500" },
}

export function StatusBadge({ status }: { status?: PropertyStatus | null }) {
    if (!status) return null
    const style = STATUS_STYLES[status]
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur", style.pill)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
            {STATUS_LABELS[status]}
        </span>
    )
}

/** The round brand mark, with a slow breathing glow. */
export function Logo({ className, spin }: { className?: string; spin?: boolean }) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src="/icons/icon-192.png"
            alt=""
            className={cn("animate-breathing-brand rounded-full ring-1 ring-amber-500/30", spin && "animate-spin-slow", className)}
        />
    )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
                {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
            </div>
            {action}
        </div>
    )
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    )
}

export function Empty({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-dashed border-amber-500/30 bg-white/30 p-6 text-center text-sm text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-white/[0.02]">
            {children}
        </div>
    )
}

const LOADING_LINES = [
    "Aligning the energies...",
    "Checking the north-east corner...",
    "Consulting the yantra...",
    "Balancing the five elements...",
    "Opening the main door...",
]

export function Loading({ full }: { full?: boolean }) {
    // Start on a fixed line so the pre-rendered page matches, then pick at random and rotate.
    const [index, setIndex] = React.useState(0)
    React.useEffect(() => {
        setIndex(Math.floor(Math.random() * LOADING_LINES.length))
        const timer = setInterval(() => setIndex((i) => (i + 1) % LOADING_LINES.length), 1800)
        return () => clearInterval(timer)
    }, [])
    const line = LOADING_LINES[index]
    return (
        <div className={cn("flex flex-col items-center justify-center gap-3", full ? "min-h-screen" : "py-16")}>
            <Logo spin className="h-12 w-12" />
            <p className="text-sm text-muted-foreground">{line}</p>
        </div>
    )
}

export function ErrorMessage({ error }: { error: Error | null }) {
    return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive backdrop-blur">
            {error?.message ?? "Something went wrong"}
        </div>
    )
}

/** Label + control stacked, used in every form. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium">{label}</span>
            {children}
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </label>
    )
}

/** Native select styled like the inputs: simplest and best on phones. */
export function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={cn(
                "flex h-10 w-full rounded-xl border border-input bg-white/70 px-3 text-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/[0.04]",
                props.className,
            )}
        />
    )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={cn(
                "flex min-h-[90px] w-full rounded-xl border border-input bg-white/70 px-3 py-2 text-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/[0.04]",
                props.className,
            )}
        />
    )
}
