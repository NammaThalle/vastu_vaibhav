import * as React from "react"

import type { PropertyStatus } from "@/lib/api/client"
import { STATUS_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<PropertyStatus, string> = {
    payment_due: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    enquiry: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
    closed: "bg-secondary text-muted-foreground border-border",
}

export function StatusBadge({ status }: { status?: PropertyStatus | null }) {
    if (!status) return null
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
            {STATUS_LABELS[status]}
        </span>
    )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
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
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    )
}

export function Empty({ children }: { children: React.ReactNode }) {
    return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</div>
}

export function Loading() {
    return (
        <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    )
}

export function ErrorMessage({ error }: { error: Error | null }) {
    return <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error?.message ?? "Something went wrong"}</div>
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
                "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                "flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                props.className,
            )}
        />
    )
}
