"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Empty, ErrorMessage, Field, Loading, NativeSelect, PageHeader } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, unwrap, type CatalogItem } from "@/lib/api/client"
import { rupees } from "@/lib/format"
import { useAction, useCatalog } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Kind = "remedy" | "service"

function AddItem({ kind, open, onOpenChange }: { kind: Kind; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [values, setValues] = React.useState({ name: "", size_ml: "5", unit_price: "" })
    const add = useAction(
        () =>
            unwrap(
                api.POST("/api/v1/catalog", {
                    body: {
                        kind,
                        name: values.name.trim(),
                        size_ml: kind === "remedy" && values.size_ml ? (Number(values.size_ml) as 5 | 15) : null,
                        unit_price: Number(values.unit_price),
                    },
                }),
            ),
        "Added to catalog",
    )
    return (
        <FormDialog open={open} onOpenChange={onOpenChange} title={kind === "remedy" ? "New remedy" : "New service"}
            busy={add.isPending} onSubmit={() => add.mutateAsync(undefined)}>
            <Field label="Name">
                <Input required autoFocus value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
            </Field>
            {kind === "remedy" && (
                <Field label="Sold as" hint="Add the same remedy again to offer both bottle sizes">
                    <NativeSelect value={values.size_ml} onChange={(e) => setValues({ ...values, size_ml: e.target.value })}>
                        <option value="5">5ml</option>
                        <option value="15">15ml</option>
                        <option value="">Per piece, like a Surya Pratima</option>
                    </NativeSelect>
                </Field>
            )}
            <Field label="Price (Rs)">
                <Input type="number" inputMode="numeric" min={0} step={1} required value={values.unit_price}
                    onChange={(e) => setValues({ ...values, unit_price: e.target.value })} />
            </Field>
        </FormDialog>
    )
}

/** Tap a price to change it. New prices only apply to charges added from now on. */
function ItemRow({ item }: { item: CatalogItem }) {
    const [editing, setEditing] = React.useState(false)
    const [price, setPrice] = React.useState(String(item.unit_price))
    const update = useAction(
        (body: { unit_price?: number; is_active?: boolean }) =>
            unwrap(api.PATCH("/api/v1/catalog/{item_id}", { params: { path: { item_id: item.id } }, body })),
    )

    async function savePrice(event: React.FormEvent) {
        event.preventDefault()
        await update.mutateAsync({ unit_price: Number(price) })
        setEditing(false)
    }

    return (
        <li className={cn("flex items-center gap-3 px-3 py-2", !item.is_active && "opacity-50")}>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.name}</div>
                {item.kind === "remedy" && (
                    <div className="text-xs text-muted-foreground">{item.size_ml ? `${item.size_ml}ml bottle` : "Per piece"}</div>
                )}
            </div>
            {editing ? (
                <form onSubmit={savePrice} className="flex items-center gap-2">
                    <Input type="number" inputMode="numeric" min={0} step={1} autoFocus className="h-9 w-24" value={price} onChange={(e) => setPrice(e.target.value)} />
                    <Button size="sm" type="submit" disabled={update.isPending}>Save</Button>
                </form>
            ) : (
                <button className="rounded-md px-2 py-1 font-semibold tabular-nums hover:bg-secondary" onClick={() => setEditing(true)}>
                    {rupees(item.unit_price)}
                </button>
            )}
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => update.mutate({ is_active: !item.is_active })}>
                {item.is_active ? "Hide" : "Show"}
            </Button>
        </li>
    )
}

export default function CatalogPage() {
    const [kind, setKind] = React.useState<Kind>("remedy")
    const [showHidden, setShowHidden] = React.useState(false)
    const [adding, setAdding] = React.useState(false)
    const catalog = useCatalog(true)

    if (catalog.isPending) return <Loading />
    if (catalog.isError) return <ErrorMessage error={catalog.error} />
    const items = catalog.data.filter((i) => i.kind === kind && (showHidden || i.is_active))
    const hiddenCount = catalog.data.filter((i) => i.kind === kind && !i.is_active).length

    return (
        <>
            <PageHeader
                title="Catalog"
                subtitle="Tap a price to change it. Old bills keep the price they were sold at."
                action={<Button onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" /> Add</Button>}
            />
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
                {(["remedy", "service"] as const).map((k) => (
                    <button key={k} onClick={() => setKind(k)}
                        className={cn("rounded-md py-2 text-sm font-medium", kind === k ? "bg-background shadow-sm" : "text-muted-foreground")}>
                        {k === "remedy" ? "Remedies" : "Services"}
                    </button>
                ))}
            </div>
            {items.length === 0 ? (
                <Empty>An empty shelf. Add the first item above.</Empty>
            ) : (
                <ul className="divide-y divide-amber-900/5 glass-card dark:divide-white/[0.06]">
                    {items.map((item) => <ItemRow key={item.id} item={item} />)}
                </ul>
            )}
            {hiddenCount > 0 && (
                <button className="mt-3 text-xs text-muted-foreground underline" onClick={() => setShowHidden(!showHidden)}>
                    {showHidden ? "Hide" : "Show"} hidden items ({hiddenCount})
                </button>
            )}
            {adding && <AddItem kind={kind} open={adding} onOpenChange={setAdding} />}
        </>
    )
}
