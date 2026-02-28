"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
    Users,
    IndianRupee,
    Calendar,
    Plus,
    Search,
    TrendingUp,
    UserPlus,
    FileText,
    ChevronRight,
    ArrowUpRight,
    AlertCircle,
    Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dashboardApi } from "@/services/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function Dashboard() {
    const [period, setPeriod] = React.useState("month")
    const [stats, setStats] = React.useState({
        totalClients: 0,
        newClientsTrend: "",
        totalVisits: 0,
        newVisitsTrend: "",
        collectedThisPeriod: 0,
        goalForPeriod: 0,
        goalCompletion: 0,
        pendingBalance: 0,
        overdueBalance: 0,
        totalRevenue: 0,
    })
    const [recentActivity, setRecentActivity] = React.useState<Array<{
        id: string
        title: string
        subtitle: string
        when: string
    }>>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        loadDashboardData()
    }, [period])

    const loadDashboardData = async () => {
        try {
            setLoading(true)
            const summary = await dashboardApi.getSummary(period)

            setRecentActivity(
                (summary.recent_activity || []).map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    subtitle: item.subtitle,
                    when: formatRelativeTime(item.when),
                }))
            )

            setStats({
                totalClients: summary.total_clients,
                newClientsTrend: summary.new_clients_trend,
                totalVisits: summary.total_visits,
                newVisitsTrend: summary.new_visits_trend,
                collectedThisPeriod: summary.collected_this_period,
                goalForPeriod: summary.goal_for_period,
                goalCompletion: summary.goal_completion,
                pendingBalance: summary.pending_balance,
                overdueBalance: summary.overdue_balance,
                totalRevenue: summary.total_revenue,
            })
        } catch (err) {
            console.error(err)
            toast.error("Failed to load dashboard statistics")
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        {
            title: "Total Clients",
            value: stats.totalClients,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            trend: stats.newClientsTrend,
            description: "Active consulting profiles"
        },
        {
            title: "Consulting Visits",
            value: stats.totalVisits,
            icon: Calendar,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            trend: stats.newVisitsTrend,
            description: "Site & virtual sessions"
        },
        {
            title: "Total Revenue",
            value: `₹${stats.totalRevenue.toLocaleString()}`,
            icon: FileText,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            trend: "Gross billings",
            description: "Total volume generated"
        },
        {
            title: "Outstanding Balance",
            value: `₹${stats.pendingBalance.toLocaleString()}`,
            icon: IndianRupee,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            trend: "Across all accounts",
            description: "Total pending payments",
            urgent: stats.pendingBalance > 50000
        }
    ]

    function formatRelativeTime(value: string | Date) {
        const date = new Date(value)
        const diffMs = Date.now() - date.getTime()
        const diffMins = Math.max(1, Math.floor(diffMs / 60000))
        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        const diffDays = Math.floor(diffHours / 24)
        return `${diffDays}d ago`
    }

    const progressWidth = Math.min(100, stats.goalCompletion)

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight">Executive Dashboard</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Professional Vastu Consulting Metrics
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground">Live</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[140px] bg-background">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                            <SelectItem value="total">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="hidden sm:flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        Full Report
                    </Button>
                    <Button asChild className="shadow-lg shadow-primary/20">
                        <Link href="/clients/new" className="flex items-center">
                            <Plus className="mr-2 h-4 w-4" />
                            New Registration
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Grid: Stat Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className={cn("relative overflow-hidden group border-border/50 transition-all hover:border-primary/50", stat.urgent && "animate-breathing")}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stat.title}</CardTitle>
                                <div className={cn("p-2 rounded-lg transition-colors group-hover:scale-110", stat.bg)}>
                                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold tracking-tight">
                                    {loading ? (
                                        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                                    ) : (
                                        stat.value
                                    )}
                                </div>
                                <div className="mt-2 flex items-center text-xs">
                                    <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />
                                    <span className="text-emerald-500 font-medium mr-1">{stat.trend}</span>
                                </div>
                            </CardContent>
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <stat.icon size={80} />
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Row 2: Main Operations */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 bg-card/40 backdrop-blur border-border/50">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest client interactions and visits overview.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
                                        <Users className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-semibold">Consultation booked with Sharma Residence</p>
                                        <p className="text-xs text-muted-foreground">Vastu analysis & Remedy planning</p>
                                    </div>
                                    <div className="text-xs text-muted-foreground">2h ago</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                        <Button variant="ghost" className="w-full justify-between" asChild>
                            <Link href="/clients">
                                View all activity
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Operational Insights */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                Revenue Collection
                            </CardTitle>
                            <CardDescription>Target vs. Actuals</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-end justify-between">
                                <div className="space-y-1">
                                    <span className="text-2xl font-bold">₹1.2L</span>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Collected this Month</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-blue-600 font-bold">85%</span>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter text-right">Of Goal</p>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500 w-[85%]" />
                                <div className="h-full bg-blue-400 w-[5%]" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded bg-background border border-border/50">
                                    <span className="text-[10px] text-muted-foreground block font-bold uppercase">Pending</span>
                                    <span className="text-sm font-bold text-orange-600">₹45,000</span>
                                </div>
                                <div className="p-2 rounded bg-background border border-border/50">
                                    <span className="text-[10px] text-muted-foreground block font-bold uppercase">Overdue</span>
                                    <span className="text-sm font-bold text-destructive">₹12,400</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Row 3: Quick Links Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Client Directory", href: "/clients", icon: Users, color: "bg-blue-500/10 text-blue-500" },
                    { label: "New Project", href: "/clients/new", icon: Plus, color: "bg-purple-500/10 text-purple-500" },
                    { label: "Ledger Analysis", href: "/clients", icon: IndianRupee, color: "bg-orange-500/10 text-orange-500" },
                    { label: "Settings", href: "/", icon: Settings, color: "bg-gray-500/10 text-gray-500" },
                ].map((item) => (
                    <Link key={item.label} href={item.href}>
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all group">
                            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", item.color)}>
                                <item.icon className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-sm">{item.label}</span>
                            <ArrowUpRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
