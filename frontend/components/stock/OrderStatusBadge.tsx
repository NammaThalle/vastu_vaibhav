import type { SupplierOrderSummary } from "@/lib/api/client"
import { cn } from "@/lib/utils"

const STYLES: Record<SupplierOrderSummary["status"], { label: string; className: string }> = {
    on_the_way: { label: "On the way", className: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300" },
    received: { label: "Received", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300" },
    cancelled: { label: "Cancelled", className: "bg-secondary text-muted-foreground border-border" },
}

export function OrderStatusBadge({ status }: { status: SupplierOrderSummary["status"] }) {
    const style = STYLES[status]
    return <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", style.className)}>{style.label}</span>
}
