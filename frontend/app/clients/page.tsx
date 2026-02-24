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
                if (sortBy === "name") return a.full_name.localeCompare(b.full_name)
                if (sortBy === "fee") return b.total_fees_fixed - a.total_fees_fixed
                return b.id.localeCompare(a.id)
            })
    }, [clients, searchQuery, sortBy])

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
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full md:w-[180px] bg-card/50">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <ArrowUpDown className="h-4 w-4" />
                                <SelectValue placeholder="Sort by" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Name (A-Z)</SelectItem>
                            <SelectItem value="fee">Fees (High to Low)</SelectItem>
                            <SelectItem value="latest">Latest Added</SelectItem>
                        </SelectContent>
                    </Select>

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
                                    <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:border-primary/50 cursor-pointer" onClick={() => router.push(`/clients/view?id=${client.id}`)}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                    <User className="h-6 w-6" />
                                                </div>
                                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                                    {formatCurrency(client.total_fees_fixed)}
                                                </Badge>
                                            </div>
                                            <CardTitle className="mt-4 line-clamp-1">{client.full_name}</CardTitle>
                                            <CardDescription className="flex items-center justify-between gap-1 mt-2">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span className="line-clamp-1">{client.project_address || "No address listed"}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px]">{client.lead_status || "Inquiry"}</Badge>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pb-6 font-medium text-sm">
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5" />
                                                {client.phone || "---"}
                                            </div>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5" />
                                                <span className="line-clamp-1">{client.email || "---"}</span>
                                            </div>
                                        </CardContent>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/clients/view?id=${client.id}`)}>
                                                        View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive">Archive Client</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
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
                                            <TableHead className="w-[200px]">Client Name</TableHead>
                                            <TableHead className="hidden md:table-cell">Contact Details</TableHead>
                                            <TableHead className="hidden lg:table-cell">Property Location</TableHead>
                                            <TableHead className="text-right">Consulting Fee</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredClients.map((client) => (
                                            <TableRow
                                                key={client.id}
                                                className="cursor-pointer group hover:bg-accent/50"
                                                onClick={() => router.push(`/clients/view?id=${client.id}`)}
                                            >
                                                <TableCell className="font-semibold">{client.full_name}</TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3" /> {client.phone || "N/A"}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Mail className="h-3 w-3" /> {client.email || "N/A"}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground italic">
                                                    <div className="flex items-center gap-1 max-w-[300px]">
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{client.project_address || "N/A"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline" className="font-mono">
                                                        {formatCurrency(client.total_fees_fixed)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => router.push(`/clients/view?id=${client.id}`)}>
                                                                View Detail
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>Generate PDF</DropdownMenuItem>
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
