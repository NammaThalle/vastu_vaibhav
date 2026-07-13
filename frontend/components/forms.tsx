"use client"

import * as React from "react"

import { Field, NativeSelect, Textarea } from "@/components/common"
import { Input } from "@/components/ui/input"
import type { PropertyType, ReferralSource } from "@/lib/api/client"
import { PROPERTY_TYPES, REFERRAL_SOURCES } from "@/lib/format"

export type ClientValues = { name: string; phone: string; referral_source: ReferralSource | ""; notes: string }
export type PropertyValues = {
    label: string
    property_type: PropertyType
    address: string
    drive_folder_url: string
    notes: string
}

export const emptyClient: ClientValues = { name: "", phone: "", referral_source: "", notes: "" }
export const emptyProperty: PropertyValues = { label: "", property_type: "other", address: "", drive_folder_url: "", notes: "" }

/** Empty strings become null so cleared fields are cleared on the server too. */
export function nullable<T extends Record<string, unknown>>(values: T): { [K in keyof T]: T[K] | null } {
    return Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v]),
    ) as { [K in keyof T]: T[K] | null }
}

export function ClientFields({ values, onChange }: { values: ClientValues; onChange: (v: ClientValues) => void }) {
    const set = (patch: Partial<ClientValues>) => onChange({ ...values, ...patch })
    return (
        <div className="space-y-4">
            <Field label="Name">
                <Input required value={values.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Phone" hint="Used for call and WhatsApp buttons">
                <Input type="tel" inputMode="tel" value={values.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Came through">
                <NativeSelect
                    value={values.referral_source}
                    onChange={(e) => set({ referral_source: e.target.value as ReferralSource | "" })}
                >
                    <option value="">Not recorded</option>
                    {Object.entries(REFERRAL_SOURCES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </NativeSelect>
            </Field>
            <Field label="Notes">
                <Textarea value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
        </div>
    )
}

export function PropertyFields({
    values,
    onChange,
    showNotes = true,
}: {
    values: PropertyValues
    onChange: (v: PropertyValues) => void
    showNotes?: boolean
}) {
    const set = (patch: Partial<PropertyValues>) => onChange({ ...values, ...patch })
    return (
        <div className="space-y-4">
            <Field label="Property name" hint="Short name you will recognise, e.g. Flat 4, Panjim">
                <Input required value={values.label} onChange={(e) => set({ label: e.target.value })} />
            </Field>
            <Field label="Type">
                <NativeSelect value={values.property_type} onChange={(e) => set({ property_type: e.target.value as PropertyType })}>
                    {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </NativeSelect>
            </Field>
            <Field label="Address">
                <Textarea className="min-h-[60px]" value={values.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Google Drive folder link" hint="Paste the link to this property's Plan and Report folder">
                <Input type="url" value={values.drive_folder_url} onChange={(e) => set({ drive_folder_url: e.target.value })} />
            </Field>
            {showNotes && (
                <Field label="Notes">
                    <Textarea value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
                </Field>
            )}
        </div>
    )
}
