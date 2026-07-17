"use client"

import * as React from "react"
import Link from "next/link"
import { ClipboardPaste, ListChecks, PackageSearch, RefreshCw, Truck } from "lucide-react"

import { PasteOrderDialog } from "@/components/stock/PasteOrderDialog"
import { Button } from "@/components/ui/button"
import { api, unwrap, type StockOverview } from "@/lib/api/client"
import { useAction, useMe } from "@/lib/queries"
import { cn } from "@/lib/utils"

function ago(iso: string): string {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (minutes < 2) return "just now"
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.round(minutes / 60)
    if (hours < 36) return `${hours} hour${hours === 1 ? "" : "s"} ago`
    return `${Math.round(hours / 24)} days ago`
}

/** Stock at a glance on the Catalog screen: sync status, what needs attention, and the actions. */
export function StockPanel({ overview }: { overview: StockOverview }) {
    const me = useMe()
    const [pasting, setPasting] = React.useState(false)
    const sync = useAction(() => unwrap(api.POST("/api/v1/supplier/sync")), "Sync started; new orders appear in a minute")
    const { sync: status, products_to_match, orders_to_review } = overview
    const counted = overview.items.some((i) => i.counted_on)

    return (
        <section className="glass-card animate-pop-in mb-5 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Stock and supplier</h2>
                    <p className="mt-1 text-sm">
                        {!status.enabled
                            ? "Orders are pasted by hand. Add the supplier login on the server to fetch them every morning."
                            : status.running
                                ? "Fetching orders from the supplier..."
                                : status.last_run_at
                                    ? <>Last checked {ago(status.last_run_at)}{status.last_ok === false && <span className="text-rose-600 dark:text-rose-300">: {status.last_message}</span>}</>
                                    : "Not fetched yet."}
                    </p>
                </div>
                {status.enabled && me.data?.is_admin && (
                    <Button size="icon" variant="outline" aria-label="Fetch supplier orders now" disabled={status.running || sync.isPending}
                        onClick={() => sync.mutate(undefined)}>
                        <RefreshCw className={cn("h-4 w-4", (status.running || sync.isPending) && "animate-spin")} />
                    </Button>
                )}
            </div>

            {(products_to_match > 0 || orders_to_review > 0 || !counted) && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {products_to_match > 0 && (
                        <Link href="/supplier/match" className="press rounded-full border border-amber-500/30 bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                            {products_to_match} product{products_to_match === 1 ? "" : "s"} to match
                        </Link>
                    )}
                    {orders_to_review > 0 && (
                        <Link href="/supplier" className="press rounded-full border border-sky-500/30 bg-sky-400/15 px-3 py-1 text-xs font-medium text-sky-800 dark:text-sky-200">
                            {orders_to_review} order{orders_to_review === 1 ? "" : "s"} to check
                        </Link>
                    )}
                    {!counted && (
                        <Link href="/stock/count" className="press rounded-full border border-rose-500/30 bg-rose-400/15 px-3 py-1 text-xs font-medium text-rose-800 dark:text-rose-200">
                            Count your stock once to start
                        </Link>
                    )}
                </div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2">
                <Button variant="outline" className="h-12 flex-col gap-0.5 rounded-2xl text-xs" onClick={() => setPasting(true)}>
                    <ClipboardPaste className="h-4 w-4" /> Paste order
                </Button>
                <Button asChild variant="outline" className="h-12 flex-col gap-0.5 rounded-2xl text-xs">
                    <Link href="/stock/count"><ListChecks className="h-4 w-4" /> Count stock</Link>
                </Button>
                <Button asChild variant="outline" className="h-12 flex-col gap-0.5 rounded-2xl text-xs">
                    <Link href="/supplier"><Truck className="h-4 w-4" /> Orders</Link>
                </Button>
            </div>
            {pasting && <PasteOrderDialog onOpenChange={setPasting} />}
        </section>
    )
}

export function StockBadge({ inStock, low, counted }: { inStock: number; low: boolean; counted: boolean }) {
    if (!counted) return <span className="text-xs text-muted-foreground"><PackageSearch className="mr-1 inline h-3 w-3" />not counted</span>
    return (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            inStock <= 0 ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                : low ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>
            {inStock} in stock
        </span>
    )
}
