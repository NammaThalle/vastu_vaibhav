"use client"

import Link from "next/link"
import { CalendarDays, MessageCircle, Phone, Plus } from "lucide-react"

import { Empty, ErrorMessage, Loading, PageHeader, Section } from "@/components/common"
import { Button } from "@/components/ui/button"
import { rupees, shortDate, telLink, whatsappLink } from "@/lib/format"
import { useHome } from "@/lib/queries"

export default function HomePage() {
    const home = useHome()
    if (home.isPending) return <Loading />
    if (home.isError) return <ErrorMessage error={home.error} />
    const { dues, upcoming_visits, outstanding_total, collected_this_month } = home.data

    return (
        <>
            <PageHeader
                title="Home"
                action={
                    <Button asChild>
                        <Link href="/clients/new">
                            <Plus className="mr-1 h-4 w-4" /> New client
                        </Link>
                    </Button>
                }
            />

            <div className="mb-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">To collect</div>
                    <div className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">{rupees(outstanding_total)}</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">Collected this month</div>
                    <div className="mt-1 text-2xl font-semibold">{rupees(collected_this_month)}</div>
                </div>
            </div>

            <Section title={`Who owes money (${dues.length})`}>
                {dues.length === 0 ? (
                    <Empty>Nobody owes anything right now.</Empty>
                ) : (
                    <ul className="divide-y rounded-lg border bg-card">
                        {dues.map((due) => (
                            <li key={due.property_id} className="flex items-center gap-3 p-3">
                                <Link href={`/property?id=${due.property_id}`} className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{due.client_name}</div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {due.label}
                                        {due.last_activity && ` · last activity ${shortDate(due.last_activity)}`}
                                    </div>
                                </Link>
                                <div className="text-right font-semibold text-red-600 dark:text-red-400">{rupees(due.balance)}</div>
                                {due.phone && (
                                    <div className="flex gap-1">
                                        <Button asChild size="icon" variant="ghost" aria-label="Call">
                                            <a href={telLink(due.phone)}><Phone className="h-4 w-4" /></a>
                                        </Button>
                                        <Button asChild size="icon" variant="ghost" aria-label="WhatsApp">
                                            <a href={whatsappLink(due.phone)} target="_blank" rel="noreferrer">
                                                <MessageCircle className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section title="Upcoming visits">
                {upcoming_visits.length === 0 ? (
                    <Empty>No visits scheduled. Schedule one from a property page.</Empty>
                ) : (
                    <ul className="divide-y rounded-lg border bg-card">
                        {upcoming_visits.map((visit) => (
                            <li key={visit.visit_id}>
                                <Link href={`/property?id=${visit.property_id}`} className="flex items-center gap-3 p-3">
                                    <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-medium">{visit.client_name}</div>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {visit.purpose || "Visit"} · {visit.label}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium">{shortDate(visit.visit_date)}</div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
        </>
    )
}
