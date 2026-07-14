"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, Search } from "lucide-react"

import { Empty, ErrorMessage, Loading, PageHeader, StatusBadge } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ClientListItem } from "@/lib/api/client"
import { rupees, shortDate } from "@/lib/format"
import { useClients } from "@/lib/queries"

type Filter = "all" | "owes" | "open"

const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "owes", label: "Owes money" },
    { value: "open", label: "Open" },
]

function matches(client: ClientListItem, query: string, filter: Filter): boolean {
    if (filter === "owes" && client.balance <= 0) return false
    if (filter === "open" && client.status === "closed") return false
    if (!query) return true
    const q = query.toLowerCase()
    return client.name.toLowerCase().includes(q) || (client.phone ?? "").includes(q)
}

export default function ClientsPage() {
    const clients = useClients()
    const [query, setQuery] = React.useState("")
    const [filter, setFilter] = React.useState<Filter>("all")

    if (clients.isPending) return <Loading />
    if (clients.isError) return <ErrorMessage error={clients.error} />

    const shown = clients.data
        .filter((c) => matches(c, query.trim(), filter))
        .sort((a, b) => (b.last_activity ?? "").localeCompare(a.last_activity ?? ""))

    return (
        <>
            <PageHeader
                title="Clients"
                subtitle={`${clients.data.length} clients`}
                action={
                    <Button asChild>
                        <Link href="/clients/new"><Plus className="mr-1 h-4 w-4" /> New</Link>
                    </Button>
                }
            />

            <div className="relative mb-3">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="mb-4 flex gap-2">
                {FILTERS.map((f) => (
                    <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} onClick={() => setFilter(f.value)}>
                        {f.label}
                    </Button>
                ))}
            </div>

            {shown.length === 0 ? (
                <Empty>No one by that name. Check the spelling, or add them as a new client.</Empty>
            ) : (
                <ul className="divide-y divide-amber-900/5 glass-card dark:divide-white/[0.06]">
                    {shown.map((client) => (
                        <li key={client.id}>
                            <Link href={`/client?id=${client.id}`} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{client.name}</div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {client.property_count > 1 ? `${client.property_count} properties · ` : ""}
                                        {client.last_activity ? `last activity ${shortDate(client.last_activity)}` : "no activity yet"}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {client.balance > 0 && (
                                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{rupees(client.balance)}</span>
                                    )}
                                    <StatusBadge status={client.status} />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )
}
