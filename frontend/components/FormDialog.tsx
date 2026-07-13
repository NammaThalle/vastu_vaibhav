"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** A dialog holding one form, with Cancel and a submit button. Scrolls on small phones. */
export function FormDialog({
    open,
    onOpenChange,
    title,
    description,
    submitLabel = "Save",
    busy,
    disabled,
    onSubmit,
    destructive,
    children,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    submitLabel?: string
    busy?: boolean
    disabled?: boolean
    destructive?: boolean
    onSubmit: () => Promise<unknown> | void
    children: React.ReactNode
}) {
    async function submit(event: React.FormEvent) {
        event.preventDefault()
        try {
            await onSubmit()
            onOpenChange(false)
        } catch {
            // The action already showed the error; keep the dialog open to fix it.
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>
                    {children}
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant={destructive ? "destructive" : "default"} className="h-11 flex-1" disabled={busy || disabled}>
                            {busy ? "Saving..." : submitLabel}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
