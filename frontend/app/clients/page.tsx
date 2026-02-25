"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    Users,
    Plus,
    Search,
    LayoutGrid,
    List as ListIcon,
    ArrowUpDown,
    Phone,
    MapPin,
    IndianRupee,
    ArrowLeft,
    MoreHorizontal,
    Mail,
    User,
    Calendar,
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    ArrowUpRight,
    Trash2,
    ArrowUp,
    ArrowDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { clientsApi } from "@/services/api"
import { formatCurrency, cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

const STATUS_OPTIONS = [
    { label: "Inquiry", value: "Inquiry", color: "text-blue-600 bg-blue-500/10 border-blue-500/20", icon: AlertCircle },
    { label: "Active", value: "Active", color: "text-orange-600 bg-orange-500/10 border-orange-500/20", icon: Clock },
    { label: "Completed", value: "Completed", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
    { label: "Inactive", value: "Inactive", color: "text-muted-foreground bg-muted/50 border-border", icon: Circle },
]

function StatusBadge({ client, onUpdate }: { client: any, onUpdate: () => void }) {
    const [updating, setUpdating] = React.useState(false);

    const handleStatusChange = async (newStatus: string) => {
        setUpdating(true);
        try {
            await clientsApi.update(client.id, { ...client, lead_status: newStatus });
            toast.success(`Client marked as ${newStatus}`);
            onUpdate();
        } catch (err) {
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    }

    const currentStatus = STATUS_OPTIONS.find(s => s.value === (client.lead_status || "Inquiry")) || STATUS_OPTIONS[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button 
                    disabled={updating}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tighter transition-all hover:scale-105 active:scale-95",
                        currentStatus.color,
                        updating && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <currentStatus.icon className="h-3 w-3" />
                    {currentStatus.label}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-black">Change Client Status</DropdownMenuLabel>
                <div className="grid gap-1 mt-1">
                    {STATUS_OPTIONS.map((status) => (
                        <button
                            key={status.value}
                            onClick={() => handleStatusChange(status.value)}
                            className={cn(
                                "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-primary/5",
                                client.lead_status === status.value ? "text-primary bg-primary/5" : "text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <status.icon className={cn("h-4 w-4", status.color.split(' ')[0])} />
                                {status.label}
                            </div>
                            {client.lead_status === status.value && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                        </button>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function ClientsPage() {
    const [clients, setClients] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [view, setView] = React.useState<"card" | "list">("list")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [sortBy, setSortBy] = React.useState("onboarding_asc")
    const router = useRouter()

    React.useEffect(() => {
        loadClients()
    }, [])

    const loadClients = async () => {
        try {
            const data = await clientsApi.getAll()
            setClients(data)
        } catch (err) {
            toast.error("Failed to load client directory")
        } finally {
            setLoading(false)
        }
    }

    const filteredClients = React.useMemo(() => {
        return clients
            .filter(client =>
                client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.phone?.includes(searchQuery) ||
                client.email?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => {
                const [field, dir] = sortBy.split('_')
                const isAsc = dir === 'asc'
                
                if (field === "name") {
                    return isAsc ? a.full_name.localeCompare(b.full_name) : b.full_name.localeCompare(a.full_name)
                }
                if (field === "fee") {
                    return isAsc ? a.total_fees_fixed - b.total_fees_fixed : b.total_fees_fixed - a.total_fees_fixed
                }
                if (field === "balance") {
                    return isAsc ? a.current_balance - b.current_balance : b.current_balance - a.current_balance
                }
                if (field === "onboarding") {
                    return isAsc 
                        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                }
                return 0
            })
    }, [clients, searchQuery, sortBy])

    const handleSort = (field: string) => {
        const [currentField, currentDir] = sortBy.split('_')
        if (currentField === field) {
            setSortBy(`${field}_${currentDir === 'asc' ? 'desc' : 'asc'}`)
        } else {
            setSortBy(`${field}_asc`)
        }
    }

    const SortIcon = ({ field }: { field: string }) => {
        const [currentField, currentDir] = sortBy.split('_')
        if (currentField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-20 transition-opacity group-hover:opacity-100" />
        return currentDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 text-primary" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground">Manage and track your consulting relationships.</p>
                </div>
                <Button asChild className="shadow-lg shadow-primary/20">
                    <Link href="/clients/new" className="flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Client
                    </Link>
                </Button>
            </div>

            {/* Control Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, phone or email..."
                        className="pl-9 bg-card/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {view === "card" && (
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full md:w-[220px] bg-card/50">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <ArrowUpDown className="h-4 w-4" />
                                    <SelectValue placeholder="Sort by" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="onboarding_asc">Onboarding Date (Oldest)</SelectItem>
                                <SelectItem value="onboarding_desc">Onboarding Date (Newest)</SelectItem>
                                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                                <SelectItem value="fee_desc">Fees (High to Low)</SelectItem>
                                <SelectItem value="fee_asc">Fees (Low to High)</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    <div className="p-1 rounded-lg border bg-card/50 flex shrink-0">
                        <Button
                            variant={view === "card" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setView("card")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={view === "list" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setView("list")}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-muted-foreground animate-pulse">Accessing directory...</span>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {view === "card" ? (
                        <motion.div
                            key="card-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {filteredClients.map((client, i) => (
                                <motion.div
                                    key={client.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card className="group relative overflow-hidden transition-all hover:shadow-2xl hover:border-primary/40 cursor-pointer rounded-2xl bg-card/40 backdrop-blur-sm border-border/50" onClick={() => router.push(`/clients/view?id=${client.id}`)}>
                                        <CardHeader className="pb-3 px-5 pt-5">
                                            <div className="flex items-start justify-between">
                                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                                                    <User className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <StatusBadge client={client} onUpdate={loadClients} />
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-mono border-none",
                                                        client.current_balance <= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10"
                                                    )}>
                                                        Bal: {formatCurrency(client.current_balance)}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <CardTitle className="mt-4 text-lg font-bold tracking-tight">{client.full_name}</CardTitle>
                                            <CardDescription className="space-y-2 mt-2">
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <MapPin className="h-3 w-3 text-primary/60 shrink-0" />
                                                    <span className="line-clamp-1 italic">{client.project_address || "No address listed"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    Since {new Date(client.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                                </div>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="px-5 pb-5 space-y-3 mt-1">
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 group-hover:bg-primary/5 transition-colors">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] uppercase tracking-tighter text-muted-foreground font-bold">Total Fee</span>
                                                    <span className="font-black text-sm">{formatCurrency(client.total_billed)}</span>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                                                    <ArrowUpRight className="h-4 w-4 text-primary" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 px-1">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                    <Phone className="h-3 w-3 text-primary" />
                                                    {client.phone || "---"}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
                                                    <Mail className="h-3 w-3 text-primary" />
                                                    {client.email || "---"}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Card className="overflow-hidden border-border/50">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="w-[250px]">
                                                <button onClick={() => handleSort("name")} className="flex items-center group font-bold w-full text-left">
                                                    Client Name <SortIcon field="name" />
                                                </button>
                                            </TableHead>
                                            <TableHead className="hidden md:table-cell">
                                                <button onClick={() => handleSort("onboarding")} className="flex items-center group font-bold w-full text-left">
                                                    Onboarding Date <SortIcon field="onboarding" />
                                                </button>
                                            </TableHead>
                                            <TableHead className="hidden lg:table-cell font-bold">Status</TableHead>
                                            <TableHead className="text-right">
                                                <button onClick={() => handleSort("fee")} className="flex items-center justify-end group font-bold w-full">
                                                    Current Total Fee <SortIcon field="fee" />
                                                </button>
                                            </TableHead>
                                            <TableHead className="text-right hidden sm:table-cell">
                                                <button onClick={() => handleSort("balance")} className="flex items-center justify-end group font-bold w-full">
                                                    Outstanding Balance <SortIcon field="balance" />
                                                </button>
                                            </TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredClients.map((client) => (
                                            <TableRow
                                                key={client.id}
                                                className="cursor-pointer group hover:bg-accent/50 border-b border-border/40"
                                                onClick={() => router.push(`/clients/view?id=${client.id}`)}
                                            >
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm sm:text-base">{client.full_name}</span>
                                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-medium tracking-wider">
                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{client.project_address || "No address listed"}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                        <Calendar className="h-3 w-3 shrink-0" />
                                                        {new Date(client.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <StatusBadge client={client} onUpdate={loadClients} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="font-black text-sm">{formatCurrency(client.total_billed)}</span>
                                                </TableCell>
                                                <TableCell className="text-right hidden sm:table-cell">
                                                    <Badge variant="outline" className={cn(
                                                        "font-mono text-[10px] px-2 py-0.5 border-none",
                                                        client.current_balance <= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10"
                                                    )}>
                                                        {client.current_balance <= 0 ? "Settled" : formatCurrency(client.current_balance)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()} className="w-[40px]">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-primary/10 shadow-2xl">
                                                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Client Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => router.push(`/clients/view?id=${client.id}`)} className="py-2.5 gap-2 cursor-pointer">
                                                                <User className="h-4 w-4 text-primary" /> View Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="py-2.5 gap-2 cursor-pointer">
                                                                <Mail className="h-4 w-4 text-primary" /> Send Statement
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive py-2.5 gap-2 cursor-pointer">
                                                                <Trash2 className="h-4 w-4" /> Archive
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {!loading && filteredClients.length === 0 && (
                <div className="text-center py-20 space-y-4">
                    <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">No results found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
                    </div>
                    <Button variant="outline" onClick={() => setSearchQuery("")}>Clear search</Button>
                </div>
            )}
        </div>
    )
}
