"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { PageHeader } from "@/components/common"
import { ClientFields, emptyClient, emptyProperty, nullable, PropertyFields } from "@/components/forms"
import { Button } from "@/components/ui/button"
import { api, unwrap } from "@/lib/api/client"
import { useAction } from "@/lib/queries"

export default function NewClientPage() {
    const router = useRouter()
    const [client, setClient] = React.useState(emptyClient)
    const [property, setProperty] = React.useState(emptyProperty)

    const create = useAction(
        () =>
            unwrap(
                api.POST("/api/v1/clients", {
                    body: {
                        ...nullable(client),
                        name: client.name.trim(),
                        referral_source: client.referral_source || null,
                        property: { ...nullable(property), label: property.label.trim(), property_type: property.property_type },
                    },
                }),
            ),
        "Client added",
    )

    async function submit(event: React.FormEvent) {
        event.preventDefault()
        const created = await create.mutateAsync(undefined)
        router.replace(`/property?id=${created.properties[0].id}`)
    }

    return (
        <form onSubmit={submit} className="mx-auto max-w-xl">
            <PageHeader title="New client" />
            <div className="space-y-6">
                <section className="glass-card p-4">
                    <h2 className="mb-4 font-medium">Client</h2>
                    <ClientFields values={client} onChange={setClient} />
                </section>
                <section className="glass-card p-4">
                    <h2 className="mb-4 font-medium">Property</h2>
                    <PropertyFields values={property} onChange={setProperty} showNotes={false} />
                </section>
                <div className="flex gap-3">
                    <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" className="h-11 flex-1" disabled={create.isPending}>
                        {create.isPending ? "Saving..." : "Save client"}
                    </Button>
                </div>
            </div>
        </form>
    )
}
