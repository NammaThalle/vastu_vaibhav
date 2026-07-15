"use client"

import * as React from "react"
import { Minus, Plus, Search } from "lucide-react"

import { Field } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, unwrap, type CatalogItem, type Schemas } from "@/lib/api/client"
import { rupees, todayIso } from "@/lib/format"
import { useAction, useCatalog } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Tab = "remedy" | "service" | "other"

/** Catalog items grouped by name, so a remedy shows once with its 5ml/15ml choices.
 *  A remedy without a size is sold per piece. */
type Group = { name: string; bySize: Map<number | null, CatalogItem> }

function groupItems(items: CatalogItem[], kind: "remedy" | "service"): Group[] {
    const groups = new Map<string, Group>()
    for (const item of items.filter((i) => i.kind === kind)) {
        const group = groups.get(item.name) ?? { name: item.name, bySize: new Map() }
        group.bySize.set(item.size_ml, item)
        groups.set(item.name, group)
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    return (
        <div className="flex items-center gap-1">
            <Button type="button" size="icon" variant="outline" className="h-9 w-9" disabled={value === 0} onClick={() => onChange(value - 1)} aria-label="Less">
                <Minus className="h-4 w-4" />
            </Button>
            <span className="w-7 text-center font-semibold tabular-nums">{value}</span>
            <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={() => onChange(value + 1)} aria-label="More">
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    )
}

const sizeLabel = (size: number | null) => (size ? `${size}ml` : "per piece")

function GroupRow({
    group,
    quantities,
    setQuantity,
    notes,
    setNote,
}: {
    group: Group
    quantities: Map<string, number>
    setQuantity: (itemId: string, qty: number) => void
    notes: Map<string, string>
    setNote: (itemId: string, note: string) => void
}) {
    const sizes = [...group.bySize.keys()].sort((a, b) => (a ?? 0) - (b ?? 0))
    const [size, setSize] = React.useState<number | null>(sizes.includes(5) ? 5 : sizes[0])
    const item = group.bySize.get(size)!
    const chosen = sizes.reduce<number>((sum, s) => sum + (quantities.get(group.bySize.get(s)!.id) ?? 0), 0)

    return (
        <li className={cn("px-1 py-2", chosen > 0 && "bg-primary/5")}>
            <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{group.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {rupees(item.unit_price)}
                        {sizes.length > 1 &&
                            sizes.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSize(s)}
                                    className={cn("rounded border px-1.5 py-0.5", s === size ? "border-primary text-primary" : "border-border")}
                                >
                                    {sizeLabel(s)}{(quantities.get(group.bySize.get(s)!.id) ?? 0) > 0 ? ` (${quantities.get(group.bySize.get(s)!.id)})` : ""}
                                </button>
                            ))}
                        {sizes.length === 1 && <span>{sizeLabel(item.size_ml)}</span>}
                    </div>
                </div>
                <Stepper value={quantities.get(item.id) ?? 0} onChange={(n) => setQuantity(item.id, n)} />
            </div>
            {(quantities.get(item.id) ?? 0) > 0 && (
                <Input
                    className="mt-2 h-9 text-sm"
                    aria-label={`Where the ${group.name} goes`}
                    placeholder="Where? Shutter, main door, main gate"
                    value={notes.get(item.id) ?? ""}
                    onChange={(e) => setNote(item.id, e.target.value)}
                />
            )}
        </li>
    )
}

/**
 * Add everything sold or done on one day in one go: remedies, services and one free-text line.
 * In quote mode the same lines become a numbered quote instead of charges.
 */
export function ItemsDialog({
    propertyId,
    open,
    onOpenChange,
    mode = "charges",
}: {
    propertyId: string
    open: boolean
    onOpenChange: (o: boolean) => void
    mode?: "charges" | "quote"
}) {
    const catalog = useCatalog()
    const [tab, setTab] = React.useState<Tab>("remedy")
    const [query, setQuery] = React.useState("")
    const [date, setDate] = React.useState(todayIso())
    const [quantities, setQuantities] = React.useState<Map<string, number>>(new Map())
    const [notes, setNotes] = React.useState<Map<string, string>>(new Map())
    const [other, setOther] = React.useState({ description: "", unit_price: "", quantity: "1" })
    const [quoteNotes, setQuoteNotes] = React.useState("")
    const quoting = mode === "quote"

    const items = catalog.data ?? []
    const byId = new Map(items.map((i) => [i.id, i]))
    const setQuantity = (id: string, qty: number) =>
        setQuantities((prev) => new Map(prev).set(id, Math.max(0, qty)))
    const setNote = (id: string, note: string) => setNotes((prev) => new Map(prev).set(id, note))

    const lines: Schemas["ChargeLine"][] = [...quantities.entries()]
        .filter(([, qty]) => qty > 0)
        .map(([catalog_item_id, quantity]) => ({ catalog_item_id, quantity, note: notes.get(catalog_item_id)?.trim() || null }))
    if (other.description.trim() && Number(other.unit_price) >= 0 && other.unit_price !== "") {
        lines.push({ description: other.description.trim(), unit_price: Number(other.unit_price), quantity: Math.max(1, Number(other.quantity) || 1) })
    }
    const total = lines.reduce(
        (sum, l) => sum + (l.unit_price ?? byId.get(l.catalog_item_id!)?.unit_price ?? 0) * (l.quantity ?? 1),
        0,
    )

    const count = lines.reduce((sum, l) => sum + (l.quantity ?? 1), 0)

    const save = useAction(
        (): Promise<unknown> =>
            quoting
                ? unwrap(api.POST("/api/v1/properties/{property_id}/quotes", {
                    params: { path: { property_id: propertyId } },
                    body: { issued_on: date, notes: quoteNotes.trim() || null, lines },
                }))
                : unwrap(api.POST("/api/v1/properties/{property_id}/charges", {
                    params: { path: { property_id: propertyId } },
                    body: { charge_date: date, lines },
                })),
        quoting ? "Quote made" : `${count} item${count === 1 ? "" : "s"} added`,
    )

    const groups = tab === "other" ? [] : groupItems(items, tab)
    const shown = query ? groups.filter((g) => g.name.toLowerCase().includes(query.toLowerCase())) : groups

    return (
        <FormDialog
            open={open}
            onOpenChange={onOpenChange}
            title={quoting ? "New quote" : "Add remedies and services"}
            submitLabel={count ? `${quoting ? "Quote" : "Add"} ${count} for ${rupees(total)}` : quoting ? "Make quote" : "Add"}
            busy={save.isPending}
            disabled={lines.length === 0}
            onSubmit={() => save.mutateAsync(undefined)}
        >
            <Field label="Date">
                <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
                {(["remedy", "service", "other"] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={cn("rounded-md py-2 text-sm font-medium", tab === t ? "bg-background shadow-sm" : "text-muted-foreground")}
                    >
                        {t === "remedy" ? "Remedies" : t === "service" ? "Services" : "Other"}
                    </button>
                ))}
            </div>

            {tab === "other" ? (
                <div className="space-y-4">
                    <Field label="Description">
                        <Input value={other.description} onChange={(e) => setOther({ ...other, description: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Price (Rs)">
                            <Input type="number" inputMode="numeric" min={0} step={1} value={other.unit_price} onChange={(e) => setOther({ ...other, unit_price: e.target.value })} />
                        </Field>
                        <Field label="Quantity">
                            <Input type="number" inputMode="numeric" min={1} step={1} value={other.quantity} onChange={(e) => setOther({ ...other, quantity: e.target.value })} />
                        </Field>
                    </div>
                </div>
            ) : (
                <>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <ul className="h-[42dvh] divide-y divide-amber-900/5 overflow-y-auto rounded-2xl border border-white/70 bg-white/50 dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-white/[0.03]">
                        {shown.map((group) => (
                            <GroupRow key={group.name} group={group} quantities={quantities} setQuantity={setQuantity} notes={notes} setNote={setNote} />
                        ))}
                        {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">Nothing found. Use Other, or add it in Catalog.</li>}
                    </ul>
                </>
            )}
            {quoting && (
                <Field label="Notes on the quote (optional)">
                    <Input value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} placeholder="e.g. Valid for 30 days" />
                </Field>
            )}
        </FormDialog>
    )
}
