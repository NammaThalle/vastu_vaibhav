"use client"

import * as React from "react"
import { useState, useEffect, useRef, Suspense } from "react"
import { createPortal } from "react-dom"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    Activity,
    ArrowLeft,
    ArrowUpRight,
    Calendar,
    CalendarCheck,
    Calculator,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    CreditCard,
    DollarSign,
    Edit3,
    FileDown,
    FileText,
    Filter,
    History,
    IndianRupee,
    LayoutDashboard,
    Mail,
    MapPin,
    Phone,
    Plus,
    PlusCircle,
    Receipt,
    Search,
    Settings,
    Trash2,
    TrendingDown,
    TrendingUp,
    User,
    Users,
    AlertCircle,
    CheckCircle2,
    Circle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { clientsApi, visitsApi, ledgerApi, servicesApi } from "@/services/api"
import { formatCurrency, cn } from "@/lib/utils"
import { toast } from "sonner"
import { ServiceCalculator } from "@/components/ServiceCalculator"

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
                        "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
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

function ClientDetailContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();

    const [client, setClient] = useState<any>(null);
    const [visits, setVisits] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any>(null);
    
    // Collapsed ribbon: show only when profile card is fully scrolled out of view
    const profileCardRef = useRef<HTMLDivElement>(null);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setPortalTarget(document.body);
        const el = profileCardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show ribbon when card is NOT intersecting (fully scrolled away)
                setIsHeaderCollapsed(!entry.isIntersecting);
            },
            { threshold: 0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [client]); // re-attach when client loads
    // New State for dynamic forms
    const [availableAddons, setAvailableAddons] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals Visibility
    const [showAddVisit, setShowAddVisit] = useState(false);
    const [showAddCharge, setShowAddCharge] = useState(false);
    const [showAddDiscount, setShowAddDiscount] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showPhase2Calculator, setShowPhase2Calculator] = useState(false);
    const [editingVisit, setEditingVisit] = useState<any>(null);
    const [editingCharge, setEditingCharge] = useState<any>(null);
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [showEditClient, setShowEditClient] = useState(false);

    // Forms State
    const [clientForm, setClientForm] = useState({ full_name: '', phone: '', email: '', project_address: '', location_type: '', lead_status: '' });
    const [visitForm, setVisitForm] = useState({ date: '', purpose: '', observations: '', amount: '' });

    // Updated Charge Form
    const [chargeForm, setChargeForm] = useState({
        description: '', amount: 0,
        addon_type: 'custom', // 'custom' or the ID of a specific addon
        date: ''
    });

    const [discountForm, setDiscountForm] = useState({
        description: 'Special Discount', amount: 0, date: ''
    });

    const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'Cash', notes: '', date: '' });

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        try {
            const [clientData, allVisits, ledgerData] = await Promise.all([
                clientsApi.get(id as string),
                visitsApi.getAll(),
                ledgerApi.getClientLedger(id as string)
            ]);
            setClient(clientData);
            setVisits(allVisits.filter((v: any) => v.client_id === id));
            setLedger(ledgerData);

            // Fetch full catalog to provide all potential charges as addons
            const fullCatalog = await servicesApi.getCatalog();

            let addonsToShow = [];
            if (clientData.service_id) {
                const currentService = fullCatalog.find((s: any) => s.id === clientData.service_id);
                if (currentService) {
                    addonsToShow = currentService.addons || [];
                }
            }

            // If no specific service or no addons in current service, aggregate others as "General"
            if (addonsToShow.length === 0) {
                const allOtherAddons = fullCatalog.flatMap((s: any) => s.addons || []);
                // deduplicate by name to keep it clean
                const uniqueAddons = Array.from(new Map(allOtherAddons.map((a: any) => [a.name, a])).values());
                addonsToShow = uniqueAddons;
            }

            setAvailableAddons(addonsToShow);

        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...visitForm,
                date: visitForm.date ? new Date(visitForm.date).toISOString() : undefined,
                amount: visitForm.amount === '' ? null : Number(visitForm.amount),
            };
            if (editingVisit) {
                await visitsApi.update(editingVisit.id, payload);
                toast.success('Visit updated successfully');
            } else {
                await visitsApi.create({ ...payload, client_id: id as string });
                toast.success('Visit recorded successfully');
            }
            setVisitForm({ date: '', purpose: '', observations: '', amount: '' });
            setShowAddVisit(false);
            setEditingVisit(null);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to process visit');
        }
    };

    const handleDeleteVisit = async (visitId: string) => {
        if (!confirm("Are you sure you want to delete this visit?")) return;
        try {
            await visitsApi.delete(visitId);
            toast.success("Visit deleted");
            loadData();
        } catch (err: any) {
            toast.error("Failed to delete visit");
        }
    };

    const startEditVisit = (visit: any) => {
        setEditingVisit(visit);
        setVisitForm({
            date: formatVisitDateForInput(visit.date),
            purpose: visit.purpose || '',
            observations: visit.observations || '',
            amount: visit.amount != null ? String(visit.amount) : '',
        });
        setShowAddVisit(true);
    };

    const formatVisitDateForInput = (value?: string) => {
        if (!value) return '';
        const d = new Date(value);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    const handleAddCharge = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { description: chargeForm.description, amount: chargeForm.amount };
            if (chargeForm.date) {
                payload.date = new Date(chargeForm.date).toISOString();
            }

            if (editingCharge) {
                if (editingCharge.id === 'initial-fee') {
                    // Update client created_at which sets the initial fee date
                    // and total_fees_fixed to update the amount
                    await clientsApi.update(id as string, { 
                        created_at: payload.date || undefined,
                        total_fees_fixed: payload.amount
                    });
                    toast.success('Initial fee updated');
                } else {
                    await ledgerApi.updateService(editingCharge.id, payload);
                    toast.success('Service charge updated');
                }
            } else {
                payload.client_id = id as string;
                await ledgerApi.addService(payload);
                toast.success('Service charge added');
            }
            setChargeForm({ description: '', amount: 0, addon_type: 'custom', date: '' });
            setShowAddCharge(false);
            setEditingCharge(null);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to process charge');
        }
    };

    const handleAddDiscount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Apply minus to the positive absolute amount entered by user
            const amount = -Math.abs(discountForm.amount);
            const payload: any = { description: discountForm.description, amount };
            if (discountForm.date) {
                payload.date = new Date(discountForm.date).toISOString();
            }

            payload.client_id = id as string;
            await ledgerApi.addService(payload);
            toast.success('Discount applied successfully');
            
            setDiscountForm({ description: 'Special Discount', amount: 0, date: '' });
            setShowAddDiscount(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to apply discount');
        }
    };

    const handleDeleteCharge = async (chargeId: string) => {
        if (!confirm("Are you sure you want to delete this charge?")) return;
        try {
            await ledgerApi.deleteService(chargeId);
            toast.success("Charge deleted");
            loadData();
        } catch (err: any) {
            toast.error("Failed to delete charge");
        }
    };

    const startEditCharge = (entry: any) => {
        setEditingCharge(entry);
        setChargeForm({ 
            description: entry.description, 
            amount: entry.amount, 
            addon_type: 'custom',
            date: formatVisitDateForInput(entry.date)
        });
        setShowAddCharge(true);
    };

    // Helper for Addon dropdown change
    const onAddonSelect = (addonId: string) => {
        if (addonId === 'custom') {
            setChargeForm({ ...chargeForm, addon_type: 'custom', description: '', amount: 0 });
        } else {
            const addon = availableAddons.find(a => a.id === addonId);
            if (addon) {
                setChargeForm({ ...chargeForm, addon_type: addonId, description: addon.name, amount: addon.price });
            }
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPayment) {
                await ledgerApi.updatePayment(editingPayment.id, paymentForm);
                toast.success('Payment updated');
            } else {
                await ledgerApi.addPayment({ ...paymentForm, client_id: id as string });
                toast.success('Payment recorded');
            }
            setPaymentForm({ amount: 0, method: 'Cash', notes: '' });
            setShowAddPayment(false);
            setEditingPayment(null);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to process payment');
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm("Are you sure you want to delete this payment?")) return;
        try {
            await ledgerApi.deletePayment(paymentId);
            toast.success("Payment deleted");
            loadData();
        } catch (err: any) {
            toast.error("Failed to delete payment");
        }
    };

    const startEditPayment = (entry: any) => {
        setEditingPayment(entry);
        setPaymentForm({
            amount: entry.amount,
            method: entry.description.replace('Payment via ', ''),
            notes: '' // Notes are not explicitly stored in the consolidated ledger entry but we can handle it
        });
        setShowAddPayment(true);
    };

    const handleDownloadBill = async () => {
        try {
            const blob = await ledgerApi.downloadBill(id as string);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bill_${client.full_name.replace(' ', '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Bill generated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate bill');
        }
    };

    const startEditClient = () => {
        setClientForm({
            full_name: client.full_name,
            phone: client.phone || '',
            email: client.email || '',
            project_address: client.project_address || '',
            location_type: client.location_type || 'Goa',
            lead_status: client.lead_status || 'Inquiry',
        });
        setShowEditClient(true);
    };

    const handleEditClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await clientsApi.update(client.id, clientForm);
            toast.success('Client profile updated');
            setShowEditClient(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update client');
        }
    };

    const handleDeleteClient = async () => {
        if (!confirm("Are you sure you want to completely delete this client? This will remove all their visits, services, and payments permanently.")) return;
        try {
            await clientsApi.delete(client.id);
            toast.success("Client deleted successfully");
            router.push("/clients");
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete client');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-muted-foreground animate-pulse">Syncing consultant records...</span>
            </div>
        )
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">Client Not Found</h3>
                <Button onClick={() => router.push("/clients")}>Return to Directory</Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="group">
                    <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Directory
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="destructive" onClick={handleDeleteClient} className="mr-2">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Client
                    </Button>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
                        ID: {id?.slice(0, 8)}
                    </Badge>
                </div>
            </div>

            {/* Profile Overview */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-background">
                    <CardHeader className="relative pb-8">
                        <div className="absolute top-0 right-0 p-6">
                            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <User className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-4xl font-extrabold flex items-center gap-3">
                                {client.full_name}
                                <Badge variant="secondary" className="text-sm bg-primary/10 text-primary">{client.lead_status || 'Inquiry'}</Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 text-base">
                                <MapPin className="h-4 w-4" />
                                {client.project_address || "Project address not specified"}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-3 border-t bg-muted/30 pt-6">
                        <div className="space-y-1">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Consulting Fee</span>
                            <div className="text-2xl font-bold">{formatCurrency(client.total_fees_fixed)}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Outstanding Balance</span>
                            <div className={cn(
                                "text-2xl font-bold",
                                (ledger?.current_balance > 0) ? "text-destructive animate-pulse" : "text-emerald-500"
                            )}>
                                {formatCurrency(ledger?.current_balance || 0)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Visits</span>
                            <div className="text-2xl font-bold">{visits.length}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Contact Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Phone className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground font-medium">Primary Contact</span>
                                <span className="text-sm font-semibold">{client.phone || "No contact linked"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Mail className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground font-medium">Email Address</span>
                                <span className="text-sm font-semibold truncate max-w-[180px]">{client.email || "No email linked"}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="outline" className="w-full" onClick={startEditClient}>Edit Profile</Button>
                    </CardFooter>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Ledger History */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xl">
                            <Receipt className="h-5 w-5 text-primary" />
                            Financial Ledger
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadBill}
                                className="bg-blue-500/5 text-blue-600 border-blue-200 hover:bg-blue-500/10 hover:text-blue-700 transition-all font-medium"
                            >
                                <FileDown className="mr-2 h-4 w-4" />
                                Download Bill
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddCharge(true)}
                                className="bg-orange-500/5 text-orange-600 border-orange-200 hover:bg-orange-500/10 hover:text-orange-700 transition-all font-medium"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Charge
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setShowAddPayment(true)}
                                className="shadow-lg shadow-primary/20 transition-all active:scale-95 font-medium"
                            >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Record Payment
                            </Button>
                        </div>
                    </div>

                    <Card className="border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead>Execution Date</TableHead>
                                    <TableHead>Transaction Detail</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Statement Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ledger?.history.map((entry: any, i: number) => (
                                    <TableRow key={entry.id + i} className="group hover:bg-accent/30 transition-colors">
                                        <TableCell className="text-muted-foreground font-medium">
                                            <div className="flex flex-col">
                                                {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                {entry.id !== 'initial-fee' && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <button
                                                            onClick={() => entry.type === 'charge' ? startEditCharge(entry) : startEditPayment(entry)}
                                                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Edit3 className="h-2.5 w-2.5" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => entry.type === 'charge' ? handleDeleteCharge(entry.id) : handleDeletePayment(entry.id)}
                                                            className="text-[10px] text-destructive hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="h-2.5 w-2.5" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold">{entry.description}</span>
                                                <div className="flex">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px] uppercase font-bold px-1.5 py-0",
                                                            entry.type === 'charge'
                                                                ? "text-orange-600 bg-orange-50 border-orange-200"
                                                                : "text-emerald-600 bg-emerald-50 border-emerald-200"
                                                        )}
                                                    >
                                                        {entry.type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className={cn(
                                            "text-right font-bold",
                                            entry.type === 'payment' ? "text-emerald-500" : "text-foreground"
                                        )}>
                                            {entry.type === 'payment' ? '-' : ''}{formatCurrency(entry.amount)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold text-base">
                                            {formatCurrency(entry.balance_after)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!ledger?.history || ledger.history.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                                            No financial activity recorded for this profile.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>

                {/* Visits History */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xl">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            Consultation Visits
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowAddVisit(true)}
                            className="bg-primary/5 text-primary hover:bg-primary/10 transition-all font-medium border border-primary/10"
                        >
                            <Calendar className="mr-2 h-4 w-4" />
                            Record Visit
                        </Button>
                    </div>

                    <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-4">
                            {visits.map((v, i) => (
                                <motion.div
                                    key={v.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Card className="group border-border/50 hover:border-primary/30 transition-colors bg-card/50 backdrop-blur-sm relative">
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="outline" className="text-xs font-medium">
                                                    {new Date(v.date).toLocaleDateString()}
                                                </Badge>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                                        onClick={() => handleDeleteVisit(v.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => startEditVisit(v)}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {v.purpose.toLowerCase().includes('vastu') && (
                                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                    )}
                                                </div>
                                            </div>
                                            <CardTitle className="text-base mt-2">{v.purpose}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <p className="text-sm text-muted-foreground leading-relaxed italic">
                                                "{v.observations || "No specific observations recorded."}"
                                            </p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                            {visits.length === 0 && (
                                <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed">
                                    <p className="text-muted-foreground italic text-sm">No documented visits.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {showEditClient && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md"
                        >
                            <Card className="shadow-2xl border-primary/20">
                                <CardHeader className="bg-primary/5">
                                    <CardTitle>Edit Client Profile</CardTitle>
                                    <CardDescription>Update consultant contact details or preferences.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleEditClient}>
                                    <CardContent className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="c-name">Full Name</Label>
                                            <Input id="c-name" required value={clientForm.full_name} onChange={e => setClientForm({ ...clientForm, full_name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="c-phone">Phone</Label>
                                            <Input id="c-phone" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="c-email">Email</Label>
                                            <Input id="c-email" type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="c-address">Project Address</Label>
                                            <Input id="c-address" value={clientForm.project_address} onChange={e => setClientForm({ ...clientForm, project_address: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="c-loc">Location</Label>
                                                <select id="c-loc" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={clientForm.location_type} onChange={e => setClientForm({ ...clientForm, location_type: e.target.value })}>
                                                    <option>Goa</option>
                                                    <option>Karnataka</option>
                                                    <option>Maharashtra</option>
                                                    <option>Other</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="c-status">Status</Label>
                                                <select id="c-status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={clientForm.lead_status} onChange={e => setClientForm({ ...clientForm, lead_status: e.target.value })}>
                                                    <option>Inquiry</option>
                                                    <option>Active</option>
                                                    <option>Completed</option>
                                                    <option>Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-4 border-t">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditClient(false)}>Cancel</Button>
                                        <Button type="submit" className="flex-1">Update Profile</Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showAddCharge && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md"
                        >
                            <Card className="shadow-2xl border-orange-500/20">
                                <CardHeader className="bg-orange-500/5">
                                    <CardTitle>{editingCharge ? 'Edit' : 'Add'} Extra Service Charge</CardTitle>
                                    <CardDescription>
                                        {editingCharge ? 'Modify existing ledger entry details.' : 'Include professional remedies or travel expenses.'}
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAddCharge}>
                                    <CardContent className="space-y-4 pt-4">

                                        {!editingCharge && (
                                            <div className="space-y-2">
                                                <Label htmlFor="addon_type">Select Charge Type</Label>
                                                <Select
                                                    value={chargeForm.addon_type}
                                                    onValueChange={(value) => onAddonSelect(value)}
                                                >
                                                    <SelectTrigger className="w-full bg-background border-muted-foreground/20 focus:ring-orange-500/20 rounded-xl h-11 overflow-hidden">
                                                        <AnimatePresence mode="wait">
                                                            <motion.div
                                                                key={chargeForm.addon_type}
                                                                initial={{ opacity: 0, y: 5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -5 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="w-full flex items-center"
                                                            >
                                                                <SelectValue placeholder="Choose a standard charge..." />
                                                            </motion.div>
                                                        </AnimatePresence>
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-orange-500/10 shadow-2xl">
                                                        <SelectGroup>
                                                            <SelectItem value="custom" className="font-semibold text-orange-600 focus:text-orange-700 focus:bg-orange-50">
                                                                ✨ Custom Manual Entry
                                                            </SelectItem>
                                                            {availableAddons.length > 0 && (
                                                                <>
                                                                    <SelectSeparator className="bg-orange-500/10" />
                                                                    <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground pt-3">
                                                                        {client.service_id ? "Recommended for Project" : "Standard Catalog Addons"}
                                                                    </SelectLabel>
                                                                    {availableAddons.map(addon => (
                                                                        <SelectItem key={addon.id} value={addon.id} className="py-2.5">
                                                                            <div className="flex items-center justify-between w-full gap-3">
                                                                                <span className="font-medium truncate">{addon.name}</span>
                                                                                <span className="text-xs text-orange-600 font-mono font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 flex-shrink-0">
                                                                                    ₹{addon.price.toLocaleString()}
                                                                                </span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[10px] text-muted-foreground italic mt-1 px-1">
                                                    Professional consulting rates pre-configured in your service catalog.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="description">Service Description</Label>
                                            <Input
                                                id="description"
                                                placeholder="e.g. Vastu Remedy Installation"
                                                value={chargeForm.description}
                                                onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })}
                                                disabled={chargeForm.addon_type !== 'custom'}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Amount (₹)</Label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    className="pl-9 font-mono"
                                                    value={chargeForm.amount}
                                                    onChange={e => setChargeForm({ ...chargeForm, amount: parseFloat(e.target.value) })}
                                                    disabled={chargeForm.addon_type !== 'custom'}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-4 border-t">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowAddCharge(false); setEditingCharge(null); }}>Cancel</Button>
                                        <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">
                                            {editingCharge ? 'Update Entry' : 'Add Charge'}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showAddPayment && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md"
                        >
                            <Card className="shadow-2xl border-emerald-500/20">
                                <CardHeader className="bg-emerald-500/5">
                                    <CardTitle>{editingPayment ? 'Edit' : 'Record'} New Payment</CardTitle>
                                    <CardDescription>
                                        {editingPayment ? 'Modify payment record details.' : 'Update the outstanding balance for this consultant.'}
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAddPayment}>
                                    <CardContent className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="pay-amount">Amount (₹)</Label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="pay-amount"
                                                    type="number"
                                                    className="pl-9 font-mono"
                                                    value={paymentForm.amount}
                                                    onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pay-date" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Payment Date</Label>
                                            <Input
                                                id="pay-date"
                                                type="date"
                                                className="rounded-xl bg-secondary/30 border-none h-11"
                                                value={paymentForm.date}
                                                onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="method" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Payment Method</Label>
                                            <select
                                                id="method"
                                                className="flex h-11 w-full rounded-xl border-none bg-secondary/30 px-3 py-2 text-sm"
                                                value={paymentForm.method}
                                                onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                            >
                                                <option>Cash</option>
                                                <option>UPI / GPay</option>
                                                <option>Bank Transfer</option>
                                                <option>Cheque</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="notes" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Reference Notes</Label>
                                            <Input
                                                id="notes"
                                                className="rounded-xl bg-secondary/30 border-none h-11"
                                                placeholder="Transaction ID or remarks..."
                                                value={paymentForm.notes}
                                                onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-6 pb-8 px-6 border-t">
                                        <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => { setShowAddPayment(false); setEditingPayment(null); }}>Cancel</Button>
                                        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                                            {editingPayment ? 'Update Payment' : 'Save Payment'}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showAddVisit && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md"
                        >
                            <Card className="shadow-2xl border-primary/20 overflow-hidden rounded-3xl">
                                <CardHeader className="bg-primary/5 pb-6">
                                    <CardTitle>{editingVisit ? 'Edit' : 'Document'} Consultation Visit</CardTitle>
                                    <CardDescription>
                                        {editingVisit ? 'Modify existing visit documentation.' : 'Record your findings and service purpose.'}
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAddVisit}>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="visit-date" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Visit Date</Label>
                                            <Input
                                                id="visit-date"
                                                type="date"
                                                className="rounded-xl bg-secondary/30 border-none h-11"
                                                value={visitForm.date}
                                                onChange={e => setVisitForm({ ...visitForm, date: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="visit-amount" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Visit Charge Amount (Optional)</Label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="visit-amount"
                                                    type="number"
                                                    className="pl-9 rounded-xl bg-secondary/30 border-none h-11 font-black"
                                                    placeholder="Leave blank for no charge"
                                                    value={visitForm.amount}
                                                    onChange={e => setVisitForm({ ...visitForm, amount: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="purpose" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Purpose of Visit</Label>
                                            <Input
                                                id="purpose"
                                                className="rounded-xl bg-secondary/30 border-none h-11"
                                                placeholder="e.g. Site Inspection, Remedy Verify"
                                                value={visitForm.purpose}
                                                onChange={e => setVisitForm({ ...visitForm, purpose: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="observations" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Clinical Observations</Label>
                                            <textarea
                                                id="observations"
                                                className="flex min-h-[140px] w-full rounded-xl border-none bg-secondary/30 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                placeholder="Detail your professional findings here..."
                                                value={visitForm.observations}
                                                onChange={e => setVisitForm({ ...visitForm, observations: e.target.value })}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-6 pb-8 px-6 border-t">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="flex-1 rounded-xl h-12 font-bold"
                                            onClick={() => {
                                                setShowAddVisit(false);
                                                setEditingVisit(null);
                                                setVisitForm({ date: '', purpose: '', observations: '', amount: '' });
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold bg-foreground text-background">
                                            {editingVisit ? 'Update Findings' : 'Save Findings'}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
                
                {showPhase2Calculator && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl my-8"
                        >
                            <Card className="shadow-2xl border-indigo-500/20 relative overflow-hidden rounded-3xl">
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="absolute right-4 top-4 text-muted-foreground hover:bg-muted rounded-full z-20"
                                    onClick={() => setShowPhase2Calculator(false)}
                                >
                                    ✕
                                </Button>
                                <CardHeader className="bg-indigo-500/5 pb-8 relative">
                                    <CardTitle className="text-2xl">Phase 2 Execution</CardTitle>
                                    <CardDescription className="max-w-[80%]">
                                        Configure detailed structural fixes, remedies, or interior element packages.
                                    </CardDescription>
                                    <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/10 blur-3xl -z-10 rounded-full" />
                                </CardHeader>
                                <CardContent className="pt-8 px-8">
                                    <ServiceCalculator 
                                        onCalculated={async (fee, serviceId) => {
                                            try {
                                                const payload = {
                                                    description: "Phase 2 Vastu Execution & Remedies",
                                                    amount: fee,
                                                    client_id: id as string
                                                };
                                                await ledgerApi.addService(payload);
                                                toast.success('Phase 2 Service added to ledger');
                                                setShowPhase2Calculator(false);
                                                loadData();
                                            } catch(err: any) {
                                                toast.error(err.message || 'Failed to add Phase 2 charge');
                                            }
                                        }} 
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function ClientDetailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Loading Consultant Records</p>
                </div>
            </div>
        }>
            <ClientDetailContent />
        </Suspense>
    );
}
