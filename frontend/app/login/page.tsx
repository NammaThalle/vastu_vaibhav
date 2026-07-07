"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { Field } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [error, setError] = React.useState("")
    const [busy, setBusy] = React.useState(false)

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setBusy(true)
        setError("")
        const form = new FormData(event.currentTarget)
        const body = new URLSearchParams({
            username: String(form.get("email")),
            password: String(form.get("password")),
        })
        const response = await fetch("/api/v1/login/access-token", { method: "POST", body, credentials: "include" })
        setBusy(false)
        if (!response.ok) {
            setError(response.status === 429 ? "Too many attempts. Wait a minute and try again." : "Wrong email or password.")
            return
        }
        await queryClient.invalidateQueries()
        router.replace("/")
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-6 shadow-sm">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Vastu Vaibhav</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Sign in to continue.</p>
                </div>
                <Field label="Email">
                    <Input name="email" type="email" autoComplete="username" required autoFocus />
                </Field>
                <Field label="Password">
                    <Input name="password" type="password" autoComplete="current-password" required />
                </Field>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="h-11 w-full" disabled={busy}>
                    {busy ? "Signing in..." : "Sign in"}
                </Button>
            </form>
        </div>
    )
}
