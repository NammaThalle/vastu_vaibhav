"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MessageCircle, Pencil, Phone, Plus } from "lucide-react"

import { Empty, ErrorMessage, Loading, PageHeader, Section, StatusBadge } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { ClientFields, emptyProperty, nullable, PropertyFields, type ClientValues } from "@/components/forms"
import { Button } from "@/components/ui/button"
import { api, unwrap, type ClientDetail } from "@/lib/api/client"
import { PROPERTY_TYPES, REFERRAL_SOURCES, rupees, telLink, whatsappLink } from "@/lib/format"
import { useAction, useClient } from "@/lib/queries"

function EditClient({ client, open, onOpenChange }: { client: ClientDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [values, setValues] = React.useState<ClientValues>({
        name: client.name,
        phone: client.phone ?? "",
        referral_source: client.referral_source ?? "",
        notes: client.notes ?? "",
    })
    const save = useAction(
        () =>
            unwrap(
                api.PATCH("/api/v1/clients/{client_id}", {
                    params: { path: { client_id: client.id } },
                    body: { ...nullable(values), name: values.name.trim(), referral_source: values.referral_source || null },
                }),
            ),
        "Client updated",
    )
    return (
        <FormDialog open={open} onOpenChange={onOpenChange} title="Edit client" busy={save.isPending} onSubmit={() => save.mutateAsync(undefined)}>
            <ClientFields values={values} onChange={setValues} />
        </FormDialog>
    )
}

function AddProperty({ clientId, open, onOpenChange }: { clientId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [values, setValues] = React.useState(emptyProperty)
    const add = useAction(
        () =>
            unwrap(
                api.POST("/api/v1/clients/{client_id}/properties", {
                    params: { path: { client_id: clientId } },
                    body: { ...nullable(values), label: values.label.trim(), property_type: values.property_type },
                }),
            ),
        "Property added",
    )
    return (
        <FormDialog open={open} onOpenChange={onOpenChange} title="Add property" busy={add.isPending} onSubmit={() => add.mutateAsync(undefined)}>
            <PropertyFields values={values} onChange={setValues} showNotes={false} />
        </FormDialog>
    )
}

function ClientView({ id }: { id: string }) {
    const client = useClient(id)
    const [editing, setEditing] = React.useState(false)
    const [adding, setAdding] = React.useState(false)

    if (client.isPending) return <Loading />
    if (client.isError) return <ErrorMessage error={client.error} />
    const c = client.data
    const balance = c.properties.reduce((sum, p) => sum + p.summary.balance, 0)

    return (
        <>
            <PageHeader
                title={c.name}
                subtitle={
                    <>
                        {c.referral_source ? `Came through ${REFERRAL_SOURCES[c.referral_source]}` : "Source not recorded"}
                        {balance > 0 && <span className="ml-2 font-semibold text-red-600 dark:text-red-400">owes {rupees(balance)}</span>}
                    </>
                }
                action={
                    <Button variant="outline" size="icon" aria-label="Edit client" onClick={() => setEditing(true)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                }
            />

            {c.phone ? (
                <div className="mb-6 grid grid-cols-2 gap-3">
                    <Button asChild variant="outline" className="h-11">
                        <a href={telLink(c.phone)}><Phone className="mr-2 h-4 w-4" /> Call {c.phone}</a>
                    </Button>
                    <Button asChild variant="outline" className="h-11">
                        <a href={whatsappLink(c.phone)} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a>
                    </Button>
                </div>
            ) : (
                <button onClick={() => setEditing(true)} className="mb-6 w-full rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    No phone number yet. Tap to add one.
                </button>
            )}

            {c.notes && <p className="mb-6 whitespace-pre-line rounded-lg border bg-card p-3 text-sm">{c.notes}</p>}

            <Section
                title="Properties"
                action={
                    <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                        <Plus className="mr-1 h-4 w-4" /> Add property
                    </Button>
                }
            >
                {c.properties.length === 0 ? (
                    <Empty>No properties yet.</Empty>
                ) : (
                    <ul className="divide-y rounded-lg border bg-card">
                        {c.properties.map((p) => (
                            <li key={p.id}>
                                <Link href={`/property?id=${p.id}`} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-medium">{p.label}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {PROPERTY_TYPES[p.property_type]} · billed {rupees(p.summary.billed)} · paid {rupees(p.summary.paid)}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {p.summary.balance > 0 && (
                                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">{rupees(p.summary.balance)}</span>
                                        )}
                                        <StatusBadge status={p.summary.status} />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {editing && <EditClient client={c} open={editing} onOpenChange={setEditing} />}
            {adding && <AddProperty clientId={c.id} open={adding} onOpenChange={setAdding} />}
        </>
    )
}

function ClientPageInner() {
    const id = useSearchParams().get("id") ?? ""
    return <ClientView id={id} />
}

export default function ClientPage() {
    return (
        <React.Suspense fallback={<Loading />}>
            <ClientPageInner />
        </React.Suspense>
    )
}
