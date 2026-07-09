"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
    BadgePercent, CalendarPlus, ChevronLeft, FolderOpen, IndianRupee, MoreVertical, Package, Pencil,
} from "lucide-react"

import { Empty, ErrorMessage, Loading, Section, StatusBadge } from "@/components/common"
import {
    DiscountDialog, EditChargeDialog, EditPropertyDialog, PaymentDialog, VisitDialog, VoidDialog,
} from "@/components/property/dialogs"
import { ItemsDialog } from "@/components/property/ItemsDialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Charge, Payment, PropertyDetail, Visit } from "@/lib/api/client"
import { PAYMENT_METHODS, PROPERTY_TYPES, rupees, shortDate } from "@/lib/format"
import { useProperty } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Open =
    | { kind: "visit"; visit?: Visit }
    | { kind: "items" }
    | { kind: "payment"; payment?: Payment }
    | { kind: "discount" }
    | { kind: "editCharge"; charge: Charge }
    | { kind: "void"; target: { kind: "charge"; item: Charge } | { kind: "payment"; item: Payment } }
    | { kind: "editProperty" }
    | null

type Entry =
    | { type: "visit"; date: string; visit: Visit }
    | { type: "charges"; date: string; charges: Charge[] }
    | { type: "payment"; date: string; payment: Payment }

/** One timeline, newest first: visits, the day's charges grouped together, and payments. */
function buildTimeline(p: PropertyDetail): Entry[] {
    const chargesByDate = new Map<string, Charge[]>()
    for (const charge of p.charges) chargesByDate.set(charge.charge_date, [...(chargesByDate.get(charge.charge_date) ?? []), charge])
    const entries: Entry[] = [
        ...p.visits.map((visit) => ({ type: "visit" as const, date: visit.visit_date, visit })),
        ...[...chargesByDate].map(([date, charges]) => ({ type: "charges" as const, date, charges })),
        ...p.payments.map((payment) => ({ type: "payment" as const, date: payment.paid_on, payment })),
    ]
    const order = { payment: 0, charges: 1, visit: 2 }
    return entries.sort((a, b) => b.date.localeCompare(a.date) || order[a.type] - order[b.type])
}

function RowMenu({ items }: { items: { label: string; onSelect: () => void; destructive?: boolean }[] }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="More">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {items.map((item) => (
                    <DropdownMenuItem key={item.label} onSelect={item.onSelect} className={cn(item.destructive && "text-destructive")}>
                        {item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function VisitCard({ visit, onEdit }: { visit: Visit; onEdit: () => void }) {
    const [expanded, setExpanded] = React.useState(false)
    const long = (visit.observations?.length ?? 0) > 180
    return (
        <div className={cn("rounded-lg border bg-card p-3", visit.status === "cancelled" && "opacity-60")}>
            <div className="flex items-start gap-2">
                <CalendarPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{visit.purpose || "Visit"}</span>
                        {visit.status !== "done" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                {visit.status === "scheduled" ? "Scheduled" : "Cancelled"}
                            </span>
                        )}
                    </div>
                    {visit.observations && (
                        <p className={cn("mt-1 whitespace-pre-line text-sm text-muted-foreground", !expanded && long && "line-clamp-3")}>
                            {visit.observations}
                        </p>
                    )}
                    {long && (
                        <button className="mt-1 text-xs text-primary" onClick={() => setExpanded(!expanded)}>
                            {expanded ? "Show less" : "Show all"}
                        </button>
                    )}
                </div>
                <RowMenu items={[{ label: "Edit visit", onSelect: onEdit }]} />
            </div>
        </div>
    )
}

function ChargesCard({ charges, setOpen }: { charges: Charge[]; setOpen: (o: Open) => void }) {
    const total = charges.filter((c) => !c.voided_at).reduce((sum, c) => sum + (c.kind === "discount" ? -c.amount : c.amount), 0)
    return (
        <div className="rounded-lg border bg-card">
            <ul className="divide-y">
                {charges.map((charge) => (
                    <li key={charge.id} className={cn("flex items-center gap-2 px-3 py-2", charge.voided_at && "opacity-50")}>
                        <div className="min-w-0 flex-1">
                            <div className={cn("text-sm", charge.voided_at && "line-through")}>{charge.description}</div>
                            <div className="text-xs text-muted-foreground">
                                {charge.quantity > 1 && `${charge.quantity} x ${rupees(charge.unit_price)}`}
                                {charge.voided_at && ` Cancelled: ${charge.void_reason}`}
                            </div>
                        </div>
                        <div className={cn("text-sm font-medium tabular-nums", charge.kind === "discount" && "text-emerald-600 dark:text-emerald-400", charge.voided_at && "line-through")}>
                            {charge.kind === "discount" ? "-" : ""}{rupees(charge.amount)}
                        </div>
                        {!charge.voided_at ? (
                            <RowMenu
                                items={[
                                    { label: "Edit", onSelect: () => setOpen({ kind: "editCharge", charge }) },
                                    { label: "Cancel this line", destructive: true, onSelect: () => setOpen({ kind: "void", target: { kind: "charge", item: charge } }) },
                                ]}
                            />
                        ) : (
                            <span className="w-8" />
                        )}
                    </li>
                ))}
            </ul>
            {charges.length > 1 && (
                <div className="flex justify-between border-t px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Day total</span>
                    <span className="mr-10 font-semibold tabular-nums">{rupees(total)}</span>
                </div>
            )}
        </div>
    )
}

function PaymentCard({ payment, setOpen }: { payment: Payment; setOpen: (o: Open) => void }) {
    return (
        <div className={cn("flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5", payment.voided_at && "opacity-50")}>
            <IndianRupee className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
                <div className={cn("text-sm font-medium", payment.voided_at && "line-through")}>
                    Received {rupees(payment.amount)} by {PAYMENT_METHODS[payment.method]}
                </div>
                <div className="text-xs text-muted-foreground">
                    Receipt {payment.receipt_no}
                    {payment.reference && ` · ${payment.reference}`}
                    {payment.voided_at && ` · Cancelled: ${payment.void_reason}`}
                </div>
            </div>
            {!payment.voided_at && (
                <RowMenu
                    items={[
                        { label: "Edit", onSelect: () => setOpen({ kind: "payment", payment }) },
                        { label: "Cancel this payment", destructive: true, onSelect: () => setOpen({ kind: "void", target: { kind: "payment", item: payment } }) },
                    ]}
                />
            )}
        </div>
    )
}

function ActionButton({ icon: Icon, label, onClick, primary }: { icon: React.ElementType; label: string; onClick: () => void; primary?: boolean }) {
    return (
        <Button variant={primary ? "default" : "outline"} className="h-14 flex-col gap-1 text-xs sm:h-12 sm:flex-row sm:text-sm" onClick={onClick}>
            <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
            {label}
        </Button>
    )
}

function PropertyView({ id }: { id: string }) {
    const property = useProperty(id)
    const [open, setOpen] = React.useState<Open>(null)
    const [showCancelled, setShowCancelled] = React.useState(false)
    const close = (o: boolean) => !o && setOpen(null)

    if (property.isPending) return <Loading />
    if (property.isError) return <ErrorMessage error={property.error} />
    const p = property.data
    const { billed, paid, balance } = p.summary

    const visible: PropertyDetail = showCancelled
        ? p
        : { ...p, charges: p.charges.filter((c) => !c.voided_at), payments: p.payments.filter((x) => !x.voided_at) }
    const cancelledCount = p.charges.filter((c) => c.voided_at).length + p.payments.filter((x) => x.voided_at).length
    const timeline = buildTimeline(visible)

    return (
        <>
            <Link href={`/client?id=${p.client.id}`} className="mb-2 inline-flex items-center text-sm text-muted-foreground">
                <ChevronLeft className="h-4 w-4" /> {p.client.name}
            </Link>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-tight">{p.label}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {PROPERTY_TYPES[p.property_type]}
                        <StatusBadge status={p.summary.status} />
                    </div>
                </div>
                <div className="flex gap-2">
                    {p.drive_folder_url && (
                        <Button asChild variant="outline" size="icon" aria-label="Open Drive folder">
                            <a href={p.drive_folder_url} target="_blank" rel="noreferrer"><FolderOpen className="h-4 w-4" /></a>
                        </Button>
                    )}
                    <Button variant="outline" size="icon" aria-label="Edit property" onClick={() => setOpen({ kind: "editProperty" })}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-3 divide-x rounded-lg border bg-card text-center">
                <div className="p-3"><div className="text-xs text-muted-foreground">Billed</div><div className="font-semibold">{rupees(billed)}</div></div>
                <div className="p-3"><div className="text-xs text-muted-foreground">Paid</div><div className="font-semibold">{rupees(paid)}</div></div>
                <div className="p-3">
                    <div className="text-xs text-muted-foreground">{balance < 0 ? "Advance" : "Balance"}</div>
                    <div className={cn("font-semibold", balance > 0 && "text-red-600 dark:text-red-400")}>{rupees(Math.abs(balance))}</div>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-4 gap-2">
                <ActionButton icon={CalendarPlus} label="Visit" onClick={() => setOpen({ kind: "visit" })} />
                <ActionButton icon={Package} label="Remedies" onClick={() => setOpen({ kind: "items" })} />
                <ActionButton icon={BadgePercent} label="Discount" onClick={() => setOpen({ kind: "discount" })} />
                <ActionButton icon={IndianRupee} label="Payment" primary onClick={() => setOpen({ kind: "payment" })} />
            </div>

            <Section
                title="History"
                action={
                    cancelledCount > 0 && (
                        <button className="text-xs text-muted-foreground underline" onClick={() => setShowCancelled(!showCancelled)}>
                            {showCancelled ? "Hide" : "Show"} cancelled ({cancelledCount})
                        </button>
                    )
                }
            >
                {timeline.length === 0 ? (
                    <Empty>Nothing recorded yet. Start with a visit.</Empty>
                ) : (
                    <ol className="space-y-4">
                        {timeline.map((entry, index) => (
                            <li key={`${entry.type}-${entry.date}-${entry.type === "visit" ? entry.visit.id : entry.type === "payment" ? entry.payment.id : ""}`}
                                className={cn(index > 0 && timeline[index - 1].date === entry.date && "-mt-2")}>
                                {(index === 0 || timeline[index - 1].date !== entry.date) && (
                                    <div className="mb-1 text-xs font-medium text-muted-foreground">{shortDate(entry.date)}</div>
                                )}
                                {entry.type === "visit" && <VisitCard visit={entry.visit} onEdit={() => setOpen({ kind: "visit", visit: entry.visit })} />}
                                {entry.type === "charges" && <ChargesCard charges={entry.charges} setOpen={setOpen} />}
                                {entry.type === "payment" && <PaymentCard payment={entry.payment} setOpen={setOpen} />}
                            </li>
                        ))}
                    </ol>
                )}
            </Section>

            {p.address && <p className="mb-2 whitespace-pre-line text-sm text-muted-foreground">{p.address}</p>}
            {p.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{p.notes}</p>}

            {open?.kind === "visit" && <VisitDialog open onOpenChange={close} propertyId={p.id} visit={open.visit} />}
            {open?.kind === "items" && <ItemsDialog open onOpenChange={close} propertyId={p.id} />}
            {open?.kind === "payment" && <PaymentDialog open onOpenChange={close} propertyId={p.id} balance={balance} payment={open.payment} />}
            {open?.kind === "discount" && <DiscountDialog open onOpenChange={close} propertyId={p.id} />}
            {open?.kind === "editCharge" && <EditChargeDialog open onOpenChange={close} charge={open.charge} />}
            {open?.kind === "void" && <VoidDialog open onOpenChange={close} target={open.target} />}
            {open?.kind === "editProperty" && <EditPropertyDialog open onOpenChange={close} property={p} />}
        </>
    )
}

function PropertyPageInner() {
    const id = useSearchParams().get("id") ?? ""
    return <PropertyView id={id} />
}

export default function PropertyPage() {
    return (
        <React.Suspense fallback={<Loading />}>
            <PropertyPageInner />
        </React.Suspense>
    )
}
