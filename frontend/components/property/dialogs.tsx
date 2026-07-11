"use client"

import * as React from "react"

import { Field, Textarea } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { nullable, PropertyFields, type PropertyValues } from "@/components/forms"
import { Input } from "@/components/ui/input"
import { api, unwrap, type Charge, type Payment, type PaymentMethod, type PropertyDetail, type Visit } from "@/lib/api/client"
import { PAYMENT_METHODS, todayIso } from "@/lib/format"
import { useAction } from "@/lib/queries"
import { cn } from "@/lib/utils"

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

const VISIT_PURPOSES = ["Site inspection", "Remedies installation", "Follow-up visit", "Plan discussion"]
const DISCOUNTS = ["BNI Member Discount", "BBB Member Discount", "Special Discount"]

function Chips({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onPick(option)}
                    className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        value === option ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                    )}
                >
                    {option}
                </button>
            ))}
        </div>
    )
}

function rupeeInput(value: string, onChange: (v: string) => void, autoFocus = false) {
    return (
        <Input type="number" inputMode="numeric" min={1} step={1} required autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} />
    )
}

/** Record a visit that happened, or schedule one (a future date schedules it automatically). */
export function VisitDialog({ propertyId, visit, ...props }: DialogProps & { propertyId: string; visit?: Visit }) {
    const [values, setValues] = React.useState({
        visit_date: visit?.visit_date ?? todayIso(),
        purpose: visit?.purpose ?? "",
        observations: visit?.observations ?? "",
        cancelled: visit?.status === "cancelled",
    })
    const future = values.visit_date > todayIso()
    const status = values.cancelled ? "cancelled" : future ? "scheduled" : "done"
    const body = { ...nullable({ purpose: values.purpose, observations: values.observations }), visit_date: values.visit_date, status } as const

    const save = useAction(
        () =>
            visit
                ? unwrap(api.PATCH("/api/v1/visits/{visit_id}", { params: { path: { visit_id: visit.id } }, body }))
                : unwrap(api.POST("/api/v1/properties/{property_id}/visits", { params: { path: { property_id: propertyId } }, body })),
        visit ? "Visit updated" : future ? "Visit scheduled" : "Visit recorded",
    )

    return (
        <FormDialog {...props} title={visit ? "Edit visit" : "Add visit"} busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}
            submitLabel={!visit && future ? "Schedule visit" : "Save visit"}>
            <Field label="Date" hint={future ? "A future date schedules the visit and shows it on Home." : undefined}>
                <Input type="date" required value={values.visit_date} onChange={(e) => setValues({ ...values, visit_date: e.target.value })} />
            </Field>
            <Field label="Purpose">
                <Input value={values.purpose} onChange={(e) => setValues({ ...values, purpose: e.target.value })} />
            </Field>
            <Chips options={VISIT_PURPOSES} value={values.purpose} onPick={(purpose) => setValues({ ...values, purpose })} />
            <Field label="Observations">
                <Textarea className="min-h-[140px]" value={values.observations} onChange={(e) => setValues({ ...values, observations: e.target.value })} />
            </Field>
            {visit && (
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={values.cancelled} onChange={(e) => setValues({ ...values, cancelled: e.target.checked })} />
                    Visit was cancelled
                </label>
            )}
        </FormDialog>
    )
}

export function PaymentDialog({ propertyId, balance, payment, ...props }: DialogProps & { propertyId: string; balance: number; payment?: Payment }) {
    const [values, setValues] = React.useState({
        amount: String(payment?.amount ?? (balance > 0 ? balance : "")),
        method: payment?.method ?? ("upi" as PaymentMethod),
        paid_on: payment?.paid_on ?? todayIso(),
        reference: payment?.reference ?? "",
    })
    const body = { amount: Number(values.amount), method: values.method, paid_on: values.paid_on, reference: values.reference.trim() || null }
    const save = useAction(
        () =>
            payment
                ? unwrap(api.PATCH("/api/v1/payments/{payment_id}", { params: { path: { payment_id: payment.id } }, body }))
                : unwrap(api.POST("/api/v1/properties/{property_id}/payments", { params: { path: { property_id: propertyId } }, body })),
        payment ? "Payment updated" : "Payment recorded",
    )

    return (
        <FormDialog {...props} title={payment ? `Edit payment ${payment.receipt_no}` : "Got payment"} busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}>
            <Field label="Amount (Rs)">{rupeeInput(values.amount, (amount) => setValues({ ...values, amount }), !payment)}</Field>
            <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((method) => (
                    <button
                        key={method}
                        type="button"
                        onClick={() => setValues({ ...values, method })}
                        className={cn(
                            "h-11 rounded-md border text-sm font-medium",
                            values.method === method ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                        )}
                    >
                        {PAYMENT_METHODS[method]}
                    </button>
                ))}
            </div>
            <Field label="Date">
                <Input type="date" required value={values.paid_on} onChange={(e) => setValues({ ...values, paid_on: e.target.value })} />
            </Field>
            <Field label="Reference" hint="UPI transaction ID, cheque number, or a note">
                <Input value={values.reference} onChange={(e) => setValues({ ...values, reference: e.target.value })} />
            </Field>
        </FormDialog>
    )
}

export function DiscountDialog({ propertyId, ...props }: DialogProps & { propertyId: string }) {
    const [values, setValues] = React.useState({ description: DISCOUNTS[0], amount: "", charge_date: todayIso() })
    const save = useAction(
        () =>
            unwrap(
                api.POST("/api/v1/properties/{property_id}/charges", {
                    params: { path: { property_id: propertyId } },
                    body: {
                        charge_date: values.charge_date,
                        lines: [{ kind: "discount", description: values.description.trim(), unit_price: Number(values.amount) }],
                    },
                }),
            ),
        "Discount added",
    )
    return (
        <FormDialog {...props} title="Give a discount" busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}>
            <Field label="Reason">
                <Input required value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
            </Field>
            <Chips options={DISCOUNTS} value={values.description} onPick={(description) => setValues({ ...values, description })} />
            <Field label="Amount (Rs)">{rupeeInput(values.amount, (amount) => setValues({ ...values, amount }))}</Field>
            <Field label="Date">
                <Input type="date" required value={values.charge_date} onChange={(e) => setValues({ ...values, charge_date: e.target.value })} />
            </Field>
        </FormDialog>
    )
}

export function EditChargeDialog({ charge, ...props }: DialogProps & { charge: Charge }) {
    const [values, setValues] = React.useState({
        description: charge.description,
        note: charge.note ?? "",
        quantity: String(charge.quantity),
        unit_price: String(charge.unit_price),
        charge_date: charge.charge_date,
    })
    const save = useAction(
        () =>
            unwrap(
                api.PATCH("/api/v1/charges/{charge_id}", {
                    params: { path: { charge_id: charge.id } },
                    body: { ...values, note: values.note.trim() || null, quantity: Number(values.quantity), unit_price: Number(values.unit_price) },
                }),
            ),
        "Line updated",
    )
    return (
        <FormDialog {...props} title={charge.kind === "discount" ? "Edit discount" : "Edit line"} busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}>
            <Field label="Description">
                <Input required value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
            </Field>
            {charge.kind === "charge" && (
                <Field label="Where it goes">
                    <Input placeholder="Shutter, main door, main gate" value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} />
                </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
                <Field label="Price (Rs)">
                    <Input type="number" inputMode="numeric" min={0} step={1} required value={values.unit_price} onChange={(e) => setValues({ ...values, unit_price: e.target.value })} />
                </Field>
                <Field label="Quantity">
                    <Input type="number" inputMode="numeric" min={1} step={1} required value={values.quantity} onChange={(e) => setValues({ ...values, quantity: e.target.value })} />
                </Field>
            </div>
            <Field label="Date">
                <Input type="date" required value={values.charge_date} onChange={(e) => setValues({ ...values, charge_date: e.target.value })} />
            </Field>
        </FormDialog>
    )
}

/** Cancel a charge or payment. It stays visible, crossed out, so the history is never lost. */
export function VoidDialog({ target, ...props }: DialogProps & { target: { kind: "charge"; item: Charge } | { kind: "payment"; item: Payment } }) {
    const [reason, setReason] = React.useState("")
    const save = useAction(
        (): Promise<unknown> =>
            target.kind === "charge"
                ? unwrap(api.POST("/api/v1/charges/{charge_id}/void", { params: { path: { charge_id: target.item.id } }, body: { reason } }))
                : unwrap(api.POST("/api/v1/payments/{payment_id}/void", { params: { path: { payment_id: target.item.id } }, body: { reason } })),
        "Cancelled",
    )
    const what = target.kind === "payment" ? `payment ${target.item.receipt_no}` : `"${target.item.description}"`
    return (
        <FormDialog {...props} title={`Cancel ${what}?`} description="It stays in the history, crossed out, and no longer counts in the balance."
            submitLabel="Cancel it" destructive busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}>
            <Field label="Why?">
                <Input required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. entered twice" />
            </Field>
        </FormDialog>
    )
}

export function EditPropertyDialog({ property, ...props }: DialogProps & { property: PropertyDetail }) {
    const [values, setValues] = React.useState<PropertyValues>({
        label: property.label,
        property_type: property.property_type,
        address: property.address ?? "",
        drive_folder_url: property.drive_folder_url ?? "",
        notes: property.notes ?? "",
    })
    const [closed, setClosed] = React.useState(Boolean(property.closed_at))
    const save = useAction(
        () =>
            unwrap(
                api.PATCH("/api/v1/properties/{property_id}", {
                    params: { path: { property_id: property.id } },
                    body: { ...nullable(values), label: values.label.trim(), property_type: values.property_type, closed },
                }),
            ),
        "Property updated",
    )
    return (
        <FormDialog {...props} title="Edit property" busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}>
            <PropertyFields values={values} onChange={setValues} />
            <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
                <span>
                    Close this property by hand
                    <span className="block text-xs text-muted-foreground">For enquiries that did not go ahead. Settled properties close on their own.</span>
                </span>
            </label>
        </FormDialog>
    )
}

