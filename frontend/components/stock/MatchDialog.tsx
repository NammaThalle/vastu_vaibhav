"use client"

import * as React from "react"

import { Field, NativeSelect } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { Input } from "@/components/ui/input"
import { api, unwrap, type SupplierProduct } from "@/lib/api/client"
import { rupees } from "@/lib/format"
import { useAction, useCatalog } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Choice = "existing" | "new" | "personal"

/** Say once what a supplier product is; every order with it follows. */
export function MatchDialog({ product, onOpenChange }: { product: SupplierProduct; onOpenChange: (o: boolean) => void }) {
    const catalog = useCatalog()
    const remedies = (catalog.data ?? []).filter((i) => i.kind === "remedy")
    const sameSize = remedies.filter((i) => i.size_ml === product.size_ml)
    const others = remedies.filter((i) => i.size_ml !== product.size_ml)
    const suggested = product.suggested_catalog_item_id ?? product.catalog_item_id ?? ""
    const [choice, setChoice] = React.useState<Choice>(product.not_for_business ? "personal" : suggested || !product.matched ? "existing" : "new")
    const [itemId, setItemId] = React.useState(suggested)
    const cleanName = product.name.replace(/\s*\d+\s*ml\b/i, "").trim()
    const [newItem, setNewItem] = React.useState({
        name: cleanName,
        size: product.size_ml === 5 || product.size_ml === 15 ? String(product.size_ml) : "",
        price: "1500",
    })

    const save = useAction(
        () =>
            unwrap(api.POST("/api/v1/supplier/products/{product_id}/match", {
                params: { path: { product_id: product.id } },
                body:
                    choice === "existing" ? { catalog_item_id: itemId }
                        : choice === "personal" ? { not_for_business: true }
                            : { new_item: { name: newItem.name.trim(), size_ml: newItem.size ? (Number(newItem.size) as 5 | 15) : null, unit_price: Number(newItem.price) } },
            })),
        choice === "personal" ? "Marked as not for business" : "Matched",
    )

    const options: { value: Choice; label: string; hint: string }[] = [
        { value: "existing", label: "A remedy we sell", hint: "Pick it from the catalog" },
        { value: "new", label: "New to the catalog", hint: "Add it with a selling price" },
        { value: "personal", label: "Not for business", hint: "Personal use; never counted" },
    ]

    return (
        <FormDialog open onOpenChange={onOpenChange} title={product.name}
            description={`Supplier product no. ${product.external_ref.replace(/^name:/, "")}${product.last_cost != null ? `, bought at ${rupees(product.last_cost)}` : ""}. You only need to do this once.`}
            disabled={choice === "existing" && !itemId} busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}>
            <div className="grid gap-2">
                {options.map((option) => (
                    <button key={option.value} type="button" onClick={() => setChoice(option.value)}
                        className={cn("press rounded-2xl border p-3 text-left transition-colors",
                            choice === option.value ? "border-primary/50 bg-primary/10" : "border-white/70 bg-white/40 dark:border-white/[0.08] dark:bg-white/[0.03]")}>
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.hint}</div>
                    </button>
                ))}
            </div>
            {choice === "existing" && (
                <Field label="Catalog remedy" hint={product.suggested_catalog_item_id ? "Suggested from the name and size" : undefined}>
                    <NativeSelect required value={itemId} onChange={(e) => setItemId(e.target.value)}>
                        <option value="">Choose...</option>
                        <optgroup label={product.size_ml ? `${product.size_ml}ml` : "Same size"}>
                            {sameSize.map((i) => <option key={i.id} value={i.id}>{i.name}{i.size_ml ? ` (${i.size_ml}ml)` : ""}</option>)}
                        </optgroup>
                        <optgroup label="Other sizes">
                            {others.map((i) => <option key={i.id} value={i.id}>{i.name}{i.size_ml ? ` (${i.size_ml}ml)` : " (per piece)"}</option>)}
                        </optgroup>
                    </NativeSelect>
                </Field>
            )}
            {choice === "new" && (
                <>
                    <Field label="Name in your catalog">
                        <Input required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Sold as">
                            <NativeSelect value={newItem.size} onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}>
                                <option value="5">5ml</option>
                                <option value="15">15ml</option>
                                <option value="">Per piece</option>
                            </NativeSelect>
                        </Field>
                        <Field label="Selling price (Rs)">
                            <Input type="number" inputMode="numeric" min={0} required value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
                        </Field>
                    </div>
                </>
            )}
        </FormDialog>
    )
}
