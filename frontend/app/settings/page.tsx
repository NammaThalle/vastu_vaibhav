"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTheme } from "next-themes"

import { Field, PageHeader, Section } from "@/components/common"
import { FormDialog } from "@/components/FormDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, unwrap, type User } from "@/lib/api/client"
import { useAction, useMe, useUsers } from "@/lib/queries"
import { cn } from "@/lib/utils"

function AddUser({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const [values, setValues] = React.useState({ email: "", password: "" })
    const add = useAction(() => unwrap(api.POST("/api/v1/register", { body: values })), "User added")
    return (
        <FormDialog open={open} onOpenChange={onOpenChange} title="Add a user" busy={add.isPending} onSubmit={() => add.mutateAsync(undefined)}
            description="They sign in with this email and password, and can do everything except manage users.">
            <Field label="Email">
                <Input type="email" required autoFocus value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
            </Field>
            <Field label="Password" hint="At least 8 characters">
                <Input type="text" minLength={8} required value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
            </Field>
        </FormDialog>
    )
}

function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
    const toggle = useAction(
        () => unwrap(api.PATCH("/api/v1/users/{user_id}", { params: { path: { user_id: user.id } }, body: { is_active: !user.is_active } })),
        user.is_active ? "User can no longer sign in" : "User can sign in again",
    )
    return (
        <li className={cn("flex items-center gap-3 px-3 py-2", !user.is_active && "opacity-50")}>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{user.email}</div>
                <div className="text-xs text-muted-foreground">{user.is_admin ? "Admin" : "User"}{!user.is_active && " · cannot sign in"}</div>
            </div>
            {!isSelf && (
                <Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate(undefined)}>
                    {user.is_active ? "Block" : "Allow"}
                </Button>
            )}
        </li>
    )
}

function Users({ me }: { me: User }) {
    const users = useUsers()
    const [adding, setAdding] = React.useState(false)
    return (
        <Section title="Users" action={<Button size="sm" variant="outline" onClick={() => setAdding(true)}>Add user</Button>}>
            <ul className="divide-y rounded-lg border bg-card">
                {(users.data ?? []).map((user) => <UserRow key={user.id} user={user} isSelf={user.id === me.id} />)}
            </ul>
            {adding && <AddUser open={adding} onOpenChange={setAdding} />}
        </Section>
    )
}

export default function SettingsPage() {
    const me = useMe()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { theme, setTheme } = useTheme()

    async function signOut() {
        await api.POST("/api/v1/logout")
        queryClient.clear()
        router.replace("/login")
    }

    if (!me.data) return null
    return (
        <>
            <PageHeader title="Settings" subtitle={`Signed in as ${me.data.email}`} />
            <Section title="Appearance">
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
                    {["light", "dark", "system"].map((t) => (
                        <button key={t} onClick={() => setTheme(t)}
                            className={cn("rounded-md py-2 text-sm font-medium capitalize", theme === t ? "bg-background shadow-sm" : "text-muted-foreground")}>
                            {t}
                        </button>
                    ))}
                </div>
            </Section>
            {me.data.is_admin && <Users me={me.data} />}
            <Button variant="outline" className="h-11 w-full" onClick={signOut}>Sign out</Button>
        </>
    )
}
