"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, ChevronLeft, MoreVertical } from "lucide-react"

import { ErrorMessage, Field, Loading, Section } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { MatchDialog } from "@/components/stock/MatchDialog"
import { OrderStatusBadge } from "@/components/stock/OrderStatusBadge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api, unwrap, type SupplierOrderDetail, type SupplierOrderLine, type SupplierProduct } from "@/lib/api/client"
import { rupees, shortDate, todayIso } from "@/lib/format"
import { useAction, useSupplierOrder } from "@/lib/queries"
import { cn } from "@/lib/utils"

function QuantityDialog({ line, onOpenChange }: { line: SupplierOrderLine; onOpenChange: (o: boolean) => void }) {
    const [quantity, setQuantity] = React.useState(String(line.quantity))
    const save = useAction(
        () => unwrap(api.PATCH("/api/v1/supplier/order-lines/{line_id}", { params: { path: { line_id: line.id } }, body: { quantity: Number(quantity) } })),
        "Quantity corrected",
    )
    return (
        <FormDialog open onOpenChange={onOpenChange} title={line.description}
            description="How many bottles were actually kept, for example after part of the order was returned."
            busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}>
            <Field label="Quantity kept">
                <Input type="number" inputMode="numeric" min={0} step={1} required autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
        </FormDialog>
    )
}

function OrderMenu({ order }: { order: SupplierOrderDetail }) {
    const update = useAction(
        (body: { status?: "on_the_way" | "received" | "cancelled"; received_on?: string; review_done?: boolean }) =>
            unwrap(api.PATCH("/api/v1/supplier/orders/{order_id}", { params: { path: { order_id: order.id } }, body })),
        "Order updated",
    )
    const items = [
        order.status !== "received" && { label: "Mark as received today", onSelect: () => update.mutate({ status: "received", received_on: todayIso() }) },
        order.status !== "on_the_way" && { label: "Mark as on the way", onSelect: () => update.mutate({ status: "on_the_way" }) },
        order.status !== "cancelled" && { label: "Mark as cancelled", onSelect: () => update.mutate({ status: "cancelled" }), destructive: true },
    ].filter(Boolean) as { label: string; onSelect: () => void; destructive?: boolean }[]
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Order options"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {items.map((item) => (
                    <DropdownMenuItem key={item.label} onSelect={item.onSelect} className={cn(item.destructive && "text-destructive")}>{item.label}</DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function ProductState({ product, onMatch }: { product: SupplierProduct; onMatch: () => void }) {
    if (product.not_for_business) {
        return <button onClick={onMatch} className="text-xs text-muted-foreground underline-offset-2 hover:underline">not for business</button>
    }
    if (product.catalog_item_name) {
        return <button onClick={onMatch} className="text-xs text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">counts as {product.catalog_item_name}</button>
    }
    return (
        <button onClick={onMatch} className="press rounded-full border border-amber-500/40 bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
            Match this product
        </button>
    )
}

function OrderView({ id }: { id: string }) {
    const order = useSupplierOrder(id)
    const [matching, setMatching] = React.useState<SupplierProduct | null>(null)
    const [editing, setEditing] = React.useState<SupplierOrderLine | null>(null)
    const reviewDone = useAction(
        () => unwrap(api.PATCH("/api/v1/supplier/orders/{order_id}", { params: { path: { order_id: id } }, body: { review_done: true } })),
        "Marked as checked",
    )
    if (order.isPending) return <Loading />
    if (order.isError) return <ErrorMessage error={order.error} />
    const o = order.data

    return (
        <>
            <Link href="/supplier" className="mb-2 inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" /> Supplier orders</Link>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{o.reference}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        Ordered {shortDate(o.order_date)}
                        <OrderStatusBadge status={o.status} />
                        {o.received_on && <span>arrived {shortDate(o.received_on)}</span>}
                    </div>
                </div>
                <OrderMenu order={o} />
            </div>

            <div className="glass-card mb-4 grid grid-cols-2 divide-x divide-amber-900/5 text-center dark:divide-white/[0.06]">
                <div className="p-3"><div className="text-xs text-muted-foreground">Order total</div><div className="font-semibold tabular-nums">{rupees(o.total)}</div></div>
                <div className="p-3"><div className="text-xs text-muted-foreground">Remedies for the business</div><div className="text-gradient-cool font-bold tabular-nums">{rupees(o.business_cost)}</div></div>
            </div>

            {o.needs_review && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-500/30 bg-sky-400/10 p-3 text-sm backdrop-blur">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                    <div className="flex-1">{o.needs_review}</div>
                    <Button size="sm" variant="outline" disabled={reviewDone.isPending} onClick={() => reviewDone.mutate(undefined)}>Checked</Button>
                </div>
            )}

            <Section title="Lines">
                <ul className="divide-y divide-amber-900/5 glass-card dark:divide-white/[0.06]">
                    {o.lines.map((line) => (
                        <li key={line.id} className="flex items-start gap-3 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">{line.description}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                    {line.kind === "product" ? (
                                        <>
                                            <button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setEditing(line)}>
                                                {line.quantity} x {rupees(line.unit_cost)}
                                            </button>
                                            {line.product && <ProductState product={line.product} onMatch={() => setMatching(line.product!)} />}
                                        </>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">not a product</span>
                                    )}
                                </div>
                            </div>
                            <div className={cn("text-sm font-medium tabular-nums", line.amount < 0 && "text-emerald-600 dark:text-emerald-300")}>{rupees(line.amount)}</div>
                        </li>
                    ))}
                </ul>
            </Section>

            {o.deliveries.length > 0 && (
                <Section title="Deliveries">
                    <ul className="divide-y divide-amber-900/5 glass-card dark:divide-white/[0.06]">
                        {o.deliveries.map((d) => (
                            <li key={d.delivery_no} className="flex items-center justify-between px-3 py-2 text-sm">
                                <span>{d.delivery_no}{d.kind === "return" && <span className="ml-2 text-xs text-sky-700 dark:text-sky-300">return</span>}</span>
                                <span className="text-xs text-muted-foreground">{d.status}{d.delivery_date ? ` · ${shortDate(d.delivery_date)}` : ""}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {matching && <MatchDialog product={matching} onOpenChange={(open) => !open && setMatching(null)} />}
            {editing && <QuantityDialog line={editing} onOpenChange={(open) => !open && setEditing(null)} />}
        </>
    )
}

function Inner() {
    return <OrderView id={useSearchParams().get("id") ?? ""} />
}

export default function SupplierOrderPage() {
    return <React.Suspense fallback={<Loading />}><Inner /></React.Suspense>
}
