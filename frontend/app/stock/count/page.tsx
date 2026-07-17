"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { ErrorMessage, Field, Loading, PageHeader } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, unwrap } from "@/lib/api/client"
import { todayIso } from "@/lib/format"
import { useAction, useStock } from "@/lib/queries"
import { cn } from "@/lib/utils"

/** Count what is on the shelf. Only changed or filled-in rows are saved, as counts dated that day. */
export default function CountStockPage() {
    const router = useRouter()
    const stock = useStock()
    const [date, setDate] = React.useState(todayIso())
    const [values, setValues] = React.useState<Record<string, string>>({})
    const [query, setQuery] = React.useState("")
    const save = useAction(
        () => unwrap(api.POST("/api/v1/stock/counts", {
            body: {
                adjusted_on: date,
                counts: Object.entries(values).filter(([, v]) => v !== "").map(([catalog_item_id, v]) => ({ catalog_item_id, quantity: Number(v) })),
            },
        })),
        "Stock counted",
    )
    if (stock.isPending) return <Loading />
    if (stock.isError) return <ErrorMessage error={stock.error} />
    const items = stock.data.items.filter((i) => i.is_active && i.name.toLowerCase().includes(query.toLowerCase()))
    const filled = Object.values(values).filter((v) => v !== "").length

    return (
        <>
            <Link href="/catalog" className="mb-2 inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" /> Catalog</Link>
            <PageHeader title="Count stock" subtitle="Type what is on the shelf. Leave a row empty to keep its current number." />
            <div className="mb-4 grid grid-cols-2 gap-3">
                <Field label="Counted on"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                <Field label="Find"><Input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} /></Field>
            </div>
            <ul className="divide-y divide-amber-900/5 glass-card mb-24 dark:divide-white/[0.06]">
                {items.map((item) => (
                    <li key={item.catalog_item_id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                                {item.size_ml ? `${item.size_ml}ml` : "per piece"} · {item.counted_on ? `app says ${item.in_stock}` : "never counted"}
                            </div>
                        </div>
                        <Input type="number" inputMode="numeric" min={0} step={1} aria-label={`Count of ${item.name}`}
                            className={cn("h-10 w-20 text-center", values[item.catalog_item_id] && "border-primary/50")}
                            placeholder={item.counted_on ? String(Math.max(item.in_stock, 0)) : "-"}
                            value={values[item.catalog_item_id] ?? ""}
                            onChange={(e) => setValues({ ...values, [item.catalog_item_id]: e.target.value })} />
                    </li>
                ))}
            </ul>
            <div className="fixed inset-x-0 bottom-24 z-20 px-4 md:bottom-6">
                <div className="mx-auto max-w-md">
                    <Button className="h-12 w-full rounded-2xl shadow-lg" disabled={filled === 0 || save.isPending}
                        onClick={async () => { await save.mutateAsync(undefined); router.push("/catalog") }}>
                        {filled === 0 ? "Type a count to save" : `Save ${filled} count${filled === 1 ? "" : "s"}`}
                    </Button>
                </div>
            </div>
        </>
    )
}
