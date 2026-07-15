"use client"

import Link from "next/link"
import { CalendarDays, MessageCircle, Phone, Plus } from "lucide-react"

import { Empty, ErrorMessage, Loading, PageHeader, Section } from "@/components/common"
import { Button } from "@/components/ui/button"
import { rupees, shortDate, telLink, whatsappLink } from "@/lib/format"
import { useHome, useReminderText } from "@/lib/queries"

/** Greeting by the hour in India, whatever the device clock's zone. */
function greeting(): string {
    const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()))
    if (hour < 5) return "Burning the midnight oil"
    if (hour < 12) return "Shubh prabhat"
    if (hour < 17) return "Namaskar"
    if (hour < 21) return "Shubh sandhya"
    return "Shubh ratri"
}

function mood(dueCount: number, outstanding: number): string {
    if (dueCount === 0) return "Every account is settled. The energies are balanced."
    if (dueCount === 1) return `One client owes ${rupees(outstanding)}. A gentle nudge should do it.`
    return `${dueCount} clients owe ${rupees(outstanding)} in all. Time for a few gentle nudges.`
}

export default function HomePage() {
    const home = useHome()
    const reminderText = useReminderText()
    if (home.isPending) return <Loading />
    if (home.isError) return <ErrorMessage error={home.error} />
    const { dues, upcoming_visits, outstanding_total, collected_this_month } = home.data

    return (
        <>
            <PageHeader
                title={greeting()}
                subtitle={mood(dues.length, outstanding_total)}
                action={
                    <Button asChild>
                        <Link href="/clients/new">
                            <Plus className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">New client</span><span className="sm:hidden">Client</span>
                        </Link>
                    </Button>
                }
            />

            <div className="mb-6 grid grid-cols-2 gap-3">
                <div className="glass-card animate-pop-in relative overflow-hidden p-4">
                    <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-rose-400/25 blur-2xl" />
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">To collect</div>
                    <div className="text-gradient-warm mt-1 text-3xl font-bold tabular-nums">{rupees(outstanding_total)}</div>
                </div>
                <div className="glass-card animate-pop-in relative overflow-hidden p-4 [animation-delay:80ms]">
                    <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/25 blur-2xl" />
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">This month</div>
                    <div className="text-gradient-cool mt-1 text-3xl font-bold tabular-nums">{rupees(collected_this_month)}</div>
                </div>
            </div>

            <Section title={`Who owes money (${dues.length})`}>
                {dues.length === 0 ? (
                    <Empty>Nobody owes a single rupee. Chai break.</Empty>
                ) : (
                    <ul className="divide-y divide-amber-900/5 glass-card dark:divide-white/[0.06]">
                        {dues.map((due) => (
                            <li key={due.property_id} className="flex items-center gap-3 p-3 transition-colors hover:bg-white/40 dark:hover:bg-white/[0.03]">
                                <Link href={`/property?id=${due.property_id}`} className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{due.client_name}</div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {due.label}
                                        {due.last_activity && ` · last activity ${shortDate(due.last_activity)}`}
                                    </div>
                                </Link>
                                <div className="text-right font-semibold tabular-nums text-rose-600 dark:text-rose-300">{rupees(due.balance)}</div>
                                {due.phone && (
                                    <div className="flex gap-1">
                                        <Button asChild size="icon" variant="ghost" aria-label="Call">
                                            <a href={telLink(due.phone)}><Phone className="h-4 w-4" /></a>
                                        </Button>
                                        <Button asChild size="icon" variant="ghost" aria-label="Send a payment reminder on WhatsApp">
                                            <a href={whatsappLink(due.phone, reminderText(due.client_name, due.label, due.balance))} target="_blank" rel="noreferrer">
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
                    <Empty>The calendar is wide open. Schedule a visit from any property.</Empty>
                ) : (
                    <ul className="divide-y divide-amber-900/5 glass-card dark:divide-white/[0.06]">
                        {upcoming_visits.map((visit) => (
                            <li key={visit.visit_id}>
                                <Link href={`/property?id=${visit.property_id}`} className="press flex items-center gap-3 p-3">
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
