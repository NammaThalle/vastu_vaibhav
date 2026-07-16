"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Empty, ErrorMessage, Loading, PageHeader } from "@/components/common"
import { MatchDialog } from "@/components/stock/MatchDialog"
import type { SupplierProduct } from "@/lib/api/client"
import { rupees } from "@/lib/format"
import { useCatalog, useSupplierProducts } from "@/lib/queries"

export default function MatchProductsPage() {
    const products = useSupplierProducts(true)
    const catalog = useCatalog()
    const names = new Map((catalog.data ?? []).map((i) => [i.id, `${i.name}${i.size_ml ? ` (${i.size_ml}ml)` : ""}`]))
    const [matching, setMatching] = React.useState<SupplierProduct | null>(null)
    if (products.isPending) return <Loading />
    if (products.isError) return <ErrorMessage error={products.error} />

    return (
        <>
            <Link href="/catalog" className="mb-2 inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" /> Catalog</Link>
            <PageHeader title="Products to match" subtitle="Tell the app once what each supplier product is. Every order, past and future, follows." />
            {products.data.length === 0 ? (
                <Empty>Everything is matched. Nothing waiting.</Empty>
            ) : (
                <ul className="divide-y divide-amber-900/5 glass-card dark:divide-white/[0.06]">
                    {products.data.map((p) => (
                        <li key={p.id}>
                            <button className="press flex w-full items-center gap-3 p-3 text-left" onClick={() => setMatching(p)}>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{p.name}</div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        on {p.times_ordered} order line{p.times_ordered === 1 ? "" : "s"}
                                        {p.last_cost != null && ` · ${rupees(p.last_cost)}`}
                                        {p.suggested_catalog_item_id && <span className="text-emerald-700 dark:text-emerald-300"> · looks like {names.get(p.suggested_catalog_item_id)}</span>}
                                    </div>
                                </div>
                                <span className="rounded-full border border-amber-500/40 bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">Match</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {matching && <MatchDialog product={matching} onOpenChange={(open) => !open && setMatching(null)} />}
        </>
    )
}
