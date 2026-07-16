"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Textarea } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { api, unwrap } from "@/lib/api/client"
import { useAction } from "@/lib/queries"

/** Paste an order copied from the supplier's site; the app reads it and opens it for checking. */
export function PasteOrderDialog({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
    const router = useRouter()
    const [text, setText] = React.useState("")
    const save = useAction(() => unwrap(api.POST("/api/v1/supplier/orders/paste", { body: { text } })), "Order read")
    return (
        <FormDialog open onOpenChange={onOpenChange} title="Paste a supplier order"
            description="On the supplier's site, select the order from its number down to Total, copy, and paste it here. Every line must add up, or nothing is saved."
            submitLabel="Read order" disabled={text.trim().length < 10} busy={save.isPending}
            onSubmit={async () => { const order = await save.mutateAsync(undefined); router.push(`/supplier/order?id=${order.id}`) }}>
            <Textarea rows={12} autoFocus value={text} onChange={(e) => setText(e.target.value)}
                placeholder={"WH/OUT/01261\nDate: 02/11/2026\nToilet Blocker 5ml\n4.00 Units\n₹ 645\n₹ 2,580\n...\nTotal ₹ 5,489"} />
        </FormDialog>
    )
}
