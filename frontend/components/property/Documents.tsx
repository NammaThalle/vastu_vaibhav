"use client"

import * as React from "react"
import { ClipboardList, FilePlus2, FileText, MoreVertical } from "lucide-react"

import { Field, Section } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { SummaryDialog, VoidDialog, type VoidTarget } from "@/components/property/dialogs"
import { DocumentDialog, type DocumentRequest } from "@/components/property/DocumentDialog"
import { ItemsDialog } from "@/components/property/ItemsDialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api, unwrap, type Bill, type PropertyDetail, type Quote } from "@/lib/api/client"
import { rupees, shortDate, todayIso } from "@/lib/format"
import { useAction } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Open =
    | { kind: "bill" }
    | { kind: "quote" }
    | { kind: "accept"; quote: Quote }
    | { kind: "summary" }
    | { kind: "void"; target: VoidTarget }
    | null

export const billPdf = (bill: Bill, clientName: string): DocumentRequest => ({
    title: `Bill ${bill.bill_no}`,
    path: `/api/v1/bills/${bill.id}/pdf`,
    shareText: `Bill ${bill.bill_no} for ${clientName}`,
})

const quotePdf = (quote: Quote): DocumentRequest => ({ title: `Quote ${quote.quote_no}`, path: `/api/v1/quotes/${quote.id}/pdf` })

function Menu({ items }: { items: { label: string; onSelect: () => void; destructive?: boolean }[] }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Document options">
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

/** Issuing a bill uses up a number for good, so it asks first. */
function NewBillDialog({ property, onDone, onOpenChange }: { property: PropertyDetail; onDone: (bill: Bill) => void; onOpenChange: (o: boolean) => void }) {
    const [date, setDate] = React.useState(todayIso())
    const make = useAction(
        () => unwrap(api.POST("/api/v1/properties/{property_id}/bills", { params: { path: { property_id: property.id } }, body: { issued_on: date } })),
        "Bill made",
    )
    const { billed, paid, balance } = property.summary
    return (
        <FormDialog open onOpenChange={onOpenChange} title="Make a bill"
            description={`Lists every charge so far: ${rupees(billed)} billed, ${rupees(paid)} paid, ${rupees(balance)} ${balance < 0 ? "advance" : "due"}. It gets the next bill number, which is kept even if the bill is cancelled.`}
            submitLabel="Make bill" busy={make.isPending}
            onSubmit={async () => onDone(await make.mutateAsync(undefined))}>
            <Field label="Bill date">
                <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
        </FormDialog>
    )
}

function AcceptQuoteDialog({ quote, onOpenChange }: { quote: Quote; onOpenChange: (o: boolean) => void }) {
    const [date, setDate] = React.useState(todayIso())
    const accept = useAction(
        () => unwrap(api.POST("/api/v1/quotes/{quote_id}/accept", { params: { path: { quote_id: quote.id } }, body: { charge_date: date } })),
        "Added to the bill",
    )
    return (
        <FormDialog open onOpenChange={onOpenChange} title={`Accept quote ${quote.quote_no}?`}
            description={`Adds its ${quote.lines.length} line${quote.lines.length === 1 ? "" : "s"} (${rupees(quote.total)}) to the bill as charges.`}
            submitLabel="Add to bill" busy={accept.isPending} onSubmit={() => accept.mutateAsync(undefined)}>
            <Field label="Date for the charges">
                <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
        </FormDialog>
    )
}

const QUOTE_STATUS: Record<Quote["status"], { label: string; className: string }> = {
    open: { label: "Open", className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
    accepted: { label: "Accepted", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
    declined: { label: "Declined", className: "bg-secondary text-muted-foreground" },
}

export function Documents({ property, showDocument }: { property: PropertyDetail; showDocument: (r: DocumentRequest) => void }) {
    const [open, setOpen] = React.useState<Open>(null)
    const close = (o: boolean) => !o && setOpen(null)
    const report: DocumentRequest = {
        title: "Consultation report",
        path: `/api/v1/properties/${property.id}/report.pdf`,
        shareText: `Vastu consultation report for ${property.label}`,
    }
    const hasCharges = property.charges.some((c) => !c.voided_at)

    return (
        <Section title="Documents">
            <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="h-12 flex-col gap-0.5 text-xs sm:flex-row sm:gap-2 sm:text-sm" disabled={!hasCharges} onClick={() => setOpen({ kind: "bill" })}>
                    <FileText className="h-4 w-4" /> Make bill
                </Button>
                <Button variant="outline" className="h-12 flex-col gap-0.5 text-xs sm:flex-row sm:gap-2 sm:text-sm" onClick={() => setOpen({ kind: "quote" })}>
                    <FilePlus2 className="h-4 w-4" /> Quote
                </Button>
                <Button variant="outline" className="h-12 flex-col gap-0.5 text-xs sm:flex-row sm:gap-2 sm:text-sm" onClick={() => showDocument(report)}>
                    <ClipboardList className="h-4 w-4" /> Report
                </Button>
            </div>

            <button className="mt-2 w-full rounded-lg border border-dashed p-3 text-left text-sm" onClick={() => setOpen({ kind: "summary" })}>
                <span className="block text-xs text-muted-foreground">Report summary {property.recommendations ? "(tap to edit)" : ""}</span>
                <span className={cn("line-clamp-2 whitespace-pre-line", !property.recommendations && "text-muted-foreground")}>
                    {property.recommendations || "Not written yet. Tap to write the findings and recommendations."}
                </span>
            </button>

            {(property.bills.length > 0 || property.quotes.length > 0) && (
                <ul className="mt-2 divide-y rounded-lg border bg-card">
                    {property.bills.map((bill) => (
                        <li key={bill.id} className={cn("flex items-center gap-2 px-3 py-2", bill.voided_at && "opacity-50")}>
                            <button className="min-w-0 flex-1 text-left" onClick={() => showDocument(billPdf(bill, property.client.name))}>
                                <div className={cn("text-sm font-medium", bill.voided_at && "line-through")}>Bill {bill.bill_no}</div>
                                <div className="text-xs text-muted-foreground">
                                    {shortDate(bill.issued_on)} · total {rupees(bill.total)} · {bill.balance > 0 ? `due ${rupees(bill.balance)}` : "paid"}
                                    {bill.voided_at && ` · Cancelled: ${bill.void_reason}`}
                                </div>
                            </button>
                            <Menu items={[
                                { label: "Share or print", onSelect: () => showDocument(billPdf(bill, property.client.name)) },
                                ...(bill.voided_at ? [] : [{ label: "Cancel this bill", destructive: true, onSelect: () => setOpen({ kind: "void", target: { kind: "bill", item: bill } }) }]),
                            ]} />
                        </li>
                    ))}
                    {property.quotes.map((quote) => (
                        <li key={quote.id} className="flex items-center gap-2 px-3 py-2">
                            <button className="min-w-0 flex-1 text-left" onClick={() => showDocument(quotePdf(quote))}>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    Quote {quote.quote_no}
                                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-normal", QUOTE_STATUS[quote.status].className)}>
                                        {QUOTE_STATUS[quote.status].label}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {shortDate(quote.issued_on)} · {rupees(quote.total)}
                                    {quote.void_reason && ` · ${quote.void_reason}`}
                                </div>
                            </button>
                            <Menu items={[
                                { label: "Share or print", onSelect: () => showDocument(quotePdf(quote)) },
                                ...(quote.status === "open" ? [
                                    { label: "Accept and add to bill", onSelect: () => setOpen({ kind: "accept", quote }) },
                                    { label: "Decline", destructive: true, onSelect: () => setOpen({ kind: "void", target: { kind: "quote", item: quote } }) },
                                ] : []),
                            ]} />
                        </li>
                    ))}
                </ul>
            )}

            {open?.kind === "bill" && (
                <NewBillDialog property={property} onOpenChange={close}
                    onDone={(bill) => showDocument(billPdf(bill, property.client.name))} />
            )}
            {open?.kind === "quote" && <ItemsDialog open onOpenChange={close} propertyId={property.id} mode="quote" />}
            {open?.kind === "accept" && <AcceptQuoteDialog quote={open.quote} onOpenChange={close} />}
            {open?.kind === "summary" && <SummaryDialog open onOpenChange={close} property={property} />}
            {open?.kind === "void" && <VoidDialog open onOpenChange={close} target={open.target} />}
        </Section>
    )
}
