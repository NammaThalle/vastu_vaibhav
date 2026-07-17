"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ClipboardPaste } from "lucide-react"

import { Empty, ErrorMessage, Loading, PageHeader } from "@/components/common"
import { OrderStatusBadge } from "@/components/stock/OrderStatusBadge"
import { PasteOrderDialog } from "@/components/stock/PasteOrderDialog"
import { Button } from "@/components/ui/button"
import { rupees, shortDate } from "@/lib/format"
import { useSupplierOrders } from "@/lib/queries"

export default function SupplierOrdersPage() {
    const orders = useSupplierOrders()
    const [pasting, setPasting] = React.useState(false)
    if (orders.isPending) return <Loading />
    if (orders.isError) return <ErrorMessage error={orders.error} />

    return (
        <>
            <Link href="/catalog" className="mb-2 inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" /> Catalog</Link>
            <PageHeader title="Supplier orders" subtitle="What was bought, what it cost, and whether it has arrived."
                action={<Button onClick={() => setPasting(true)}><ClipboardPaste className="mr-1 h-4 w-4" /> Paste</Button>} />
            {orders.data.length === 0 ? (
                <Empty>No orders yet. Paste one from the supplier's site, or add the supplier login on the server to fetch them.</Empty>
            ) : (
                <ul className="divide-y divide-amber-900/5 glass-card dark:divide-white/[0.06]">
                    {orders.data.map((order) => (
                        <li key={order.id}>
                            <Link href={`/supplier/order?id=${order.id}`} className="press flex items-center gap-3 p-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 font-medium">
                                        {order.reference}
                                        <OrderStatusBadge status={order.status} />
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {shortDate(order.order_date)} · {order.line_count} lines
                                        {order.unmatched_lines > 0 && <span className="text-amber-700 dark:text-amber-300"> · {order.unmatched_lines} to match</span>}
                                        {order.needs_review && <span className="text-sky-700 dark:text-sky-300"> · to check</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold tabular-nums">{rupees(order.total)}</div>
                                    <div className="text-xs text-muted-foreground tabular-nums">business {rupees(order.business_cost)}</div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {pasting && <PasteOrderDialog onOpenChange={setPasting} />}
        </>
    )
}
