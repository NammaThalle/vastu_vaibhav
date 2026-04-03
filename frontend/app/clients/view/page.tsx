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
    Minus,
    MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

    // Mobile tab state: 'profile' | 'ledger' | 'visits'
    const [mobileTab, setMobileTab] = useState<'ledger' | 'visits' | 'profile'>('ledger');

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
    const [billStatus, setBillStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [billError, setBillError] = useState<string>('');

    // AlertDialog confirm state (replaces window.confirm)
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    }>({ open: false, title: '', description: '', onConfirm: () => {} });

    const showConfirm = (title: string, description: string, onConfirm: () => void) => {
        setConfirmDialog({ open: true, title, description, onConfirm });
    };

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
        showConfirm(
            "Delete Visit",
            "Are you sure you want to delete this consultation visit? This action cannot be undone.",
            async () => {
                try {
                    await visitsApi.delete(visitId);
                    toast.success("Visit deleted");
                    loadData();
                } catch (err: any) {
                    toast.error("Failed to delete visit");
                }
            }
        );
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
        showConfirm(
            "Delete Charge",
            "Are you sure you want to remove this charge from the ledger? This action cannot be undone.",
            async () => {
                try {
                    await ledgerApi.deleteService(chargeId);
                    toast.success("Charge deleted");
                    loadData();
                } catch (err: any) {
                    toast.error("Failed to delete charge");
                }
            }
        );
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
            const payload = { ...paymentForm };
            if (payload.date) {
                payload.date = new Date(payload.date).toISOString();
            } else {
                delete (payload as any).date;
            }

            if (editingPayment) {
                await ledgerApi.updatePayment(editingPayment.id, payload);
                toast.success('Payment updated');
            } else {
                await ledgerApi.addPayment({ ...payload, client_id: id as string });
                toast.success('Payment recorded');
            }
            setPaymentForm({ amount: 0, method: 'Cash', notes: '', date: '' });
            setShowAddPayment(false);
            setEditingPayment(null);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to process payment');
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        showConfirm(
            "Delete Payment",
            "Are you sure you want to remove this payment record? The outstanding balance will be recalculated.",
            async () => {
                try {
                    await ledgerApi.deletePayment(paymentId);
                    toast.success("Payment deleted");
                    loadData();
                } catch (err: any) {
                    toast.error("Failed to delete payment");
                }
            }
        );
    };

    const startEditPayment = (entry: any) => {
        setEditingPayment(entry);
        setPaymentForm({
            amount: entry.amount,
            method: entry.description.replace('Payment via ', ''),
            notes: '', // Notes are not explicitly stored in the consolidated ledger entry but we can handle it
            date: formatVisitDateForInput(entry.date)
        });
        setShowAddPayment(true);
    };

     const handleDownloadBill = async () => {
        setBillStatus('loading');
        setBillError('');
        try {
            const blob = await ledgerApi.downloadBill(id as string);

            // Filename: Invoice-{Client-Name}-{YYYY-MM-DD}.pdf
            const safeName = client.full_name.replace(/\s+/g, '-');
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `Invoice-${safeName}-${dateStr}.pdf`;

            // ── HTTPS: Web Share API → native iOS share sheet ────────────────
            // Gives AirDrop, Save to Files, WhatsApp etc. Requires HTTPS.
            const file = new File([blob], fileName, { type: 'application/pdf' });
            if (
                typeof navigator !== 'undefined' &&
                navigator.canShare &&
                navigator.canShare({ files: [file] })
            ) {
                await navigator.share({
                    files: [file],
                    title: `Invoice — ${client.full_name}`,
                    text: '',
                });
                setBillStatus('success');
                setTimeout(() => setBillStatus('idle'), 2000);
                return;
            }

            // ── HTTP fallback: data URL via FileReader ────────────────────────
            // Converts the blob to a base64 data URL (data:application/pdf;base64,...)
            // instead of a blob URL (blob:http://...). A data URL has no domain/host,
            // so it CANNOT appear as a link/caption in WhatsApp or any share target.
            // On iOS Safari this triggers the native PDF viewer with the system
            // "Open In / Share" button — the user can share to WhatsApp from there.
            // On desktop browsers the anchor download attribute saves it directly.
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const anchor = document.createElement('a');
                anchor.href = dataUrl;
                anchor.download = fileName;
                anchor.style.display = 'none';
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
            };
            reader.readAsDataURL(blob);

            setBillStatus('success');
            setTimeout(() => setBillStatus('idle'), 2000);
        } catch (err: any) {
            if (err?.name === 'AbortError') { setBillStatus('idle'); return; }
            setBillError(err.message || 'Failed to generate bill');
            setBillStatus('error');
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

    const handleDeleteClient = () => {
        showConfirm(
            "Delete Client Permanently",
            "This will permanently remove this client and ALL their visits, services, and payment history. This action cannot be undone.",
            async () => {
                try {
                    await clientsApi.delete(client.id);
                    toast.success("Client deleted successfully");
                    router.push("/clients");
                } catch (err: any) {
                    toast.error(err.message || 'Failed to delete client');
                }
            }
        );
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
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">

            {/* Bill Generation Overlay */}
            <AnimatePresence>
                {billStatus !== 'idle' && (
                    <motion.div
                        key="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            key="card"
                            initial={{ scale: 0.88, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.88, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="bg-white rounded-3xl shadow-2xl px-16 py-12 flex flex-col items-center gap-6 min-w-[280px] overflow-hidden"
                        >
                            <AnimatePresence mode="wait">
                                {billStatus === 'loading' && (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex flex-col items-center gap-6"
                                    >
                                        <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                                        <p className="text-[15px] font-semibold text-slate-700">Generating bill…</p>
                                        <p className="text-[12px] text-slate-400">This may take a few seconds</p>
                                    </motion.div>
                                )}
                                {billStatus === 'success' && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.7 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.7 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                        className="flex flex-col items-center gap-6"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
                                            className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center"
                                        >
                                            <svg className="h-9 w-9 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </motion.div>
                                        <p className="text-[15px] font-semibold text-slate-700 pb-2">Bill generated successfully</p>
                                    </motion.div>
                                )}
                                {billStatus === 'error' && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, scale: 0.7 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.7 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                        className="flex flex-col items-center gap-6"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
                                            className="h-16 w-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center"
                                        >
                                            <svg className="h-9 w-9 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </motion.div>
                                        <p className="text-[15px] font-semibold text-slate-700">Bill not generated</p>
                                        <p className="text-[12px] text-red-500 text-center max-w-[220px]">{billError}</p>
                                        <button
                                            onClick={() => setBillStatus('idle')}
                                            className="mt-2 px-6 py-2 rounded-full bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Top Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <Button 
                    variant="ghost" 
                    onClick={() => router.back()} 
                    className="text-muted-foreground hover:text-foreground transition-colors group px-0"
                >
                    <ChevronLeft className="mr-1 h-5 w-5 transition-transform group-hover:-translate-x-1" />
                    Back to Directory
                </Button>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="px-3 py-1 bg-secondary text-[10px] font-mono tracking-wider rounded-full text-muted-foreground border border-border">
                        ID: {id?.slice(0, 8)}
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDeleteClient}
                        className="text-destructive border-destructive/20 hover:bg-destructive/5 h-9"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* ── Mobile Tab Bar ──────────────────────────────────────────────── */}
            <div className="lg:hidden mb-6">
                <div className="flex rounded-2xl bg-secondary/50 p-1 gap-1">
                    {(["ledger", "visits", "profile"] as const).map((tab) => {
                            const badge = tab === 'ledger'
                                ? (ledger?.history?.length ?? 0)
                                : tab === 'visits'
                                ? visits.length
                                : null;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setMobileTab(tab)}
                                    className={cn(
                                        "flex-1 py-2.5 text-xs font-bold capitalize rounded-xl transition-all flex items-center justify-center gap-1",
                                        mobileTab === tab
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab === 'ledger' ? '💰 Ledger' : tab === 'visits' ? '📋 Visits' : '👤 Profile'}
                                    {badge !== null && badge > 0 && (
                                        <span className={cn(
                                            "text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none",
                                            mobileTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                        )}>{badge}</span>
                                    )}
                                </button>
                            );
                        })}
                </div>
            </div>

            {/* ── Sidebar+Main Grid ────────────────────────────────────────────── */}
            <div className="flex flex-col lg:grid lg:grid-cols-[350px_1fr] gap-10 lg:items-start">
                {/* Left Sidebar: Profile & KPIs — hidden on mobile when not on profile tab */}
                <aside className={cn(
                    "space-y-8 lg:sticky lg:top-24 w-full",
                    // On mobile: only show when profile tab is active
                    mobileTab !== 'profile' ? "hidden lg:block" : ""
                )}>
                    <div className="flex flex-col items-center text-center space-y-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-2xl relative z-10 overflow-hidden transition-transform duration-500 group-hover:scale-105">
                                <span className="text-4xl font-bold text-primary">
                                    {client.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full -z-10 opacity-50 group-hover:opacity-80 transition-opacity" />
                        </div>

                        {/* Name & Status */}
                        <div className="space-y-3">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                {client.full_name}
                            </h1>
                            <div className="flex items-center justify-center flex-wrap gap-2">
                                <StatusBadge client={client} onUpdate={loadData} />
                                <span className="text-xs text-muted-foreground flex items-center gap-1 bg-secondary/50 px-3 py-1 rounded-full">
                                    <MapPin className="h-3 w-3" />
                                    {client.location_type || "Goa"}
                                </span>
                            </div>
                        </div>

                        <Separator className="bg-border/60" />

                        {/* Contact Info */}
                        <div className="w-full space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 group hover:border-primary/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Phone</p>
                                        <p className="text-sm font-semibold">{client.phone || "Not linked"}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 group hover:border-primary/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Email</p>
                                        <p className="text-sm font-semibold truncate max-w-[150px]">{client.email || "Not linked"}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <Button 
                            variant="outline" 
                            className="w-full border-primary/20 text-primary hover:bg-primary/5 hover:border-primary font-bold py-6 rounded-xl transition-all"
                            onClick={startEditClient}
                        >
                            Edit Profile
                        </Button>
                    </div>

                    {/* KPIs Section */}
                    <div className="space-y-6 pt-6">
                        <div className="grid gap-4">
                            <div className="p-5 rounded-2xl bg-white shadow-sm border border-border/50 space-y-1">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Consulting Fee</p>
                                <p className="text-3xl font-black">{formatCurrency(client.total_fees_fixed)}</p>
                            </div>
                            <div className={cn(
                                "p-5 rounded-2xl shadow-sm border space-y-1 transition-all",
                                (ledger?.current_balance > 0) 
                                    ? "bg-red-50 border-red-100 text-red-900" 
                                    : "bg-emerald-50 border-emerald-100 text-emerald-900"
                            )}>
                                <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Outstanding Balance</p>
                                <p className="text-3xl font-black">
                                    {formatCurrency(ledger?.current_balance || 0)}
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl bg-white shadow-sm border border-border/50 space-y-1">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Visits</p>
                                <p className="text-3xl font-black">{visits.length}</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Right Column: Ledger & Visits — on mobile show based on tab */}
                <main className={cn(
                    "space-y-12",
                    // On mobile: hidden when profile tab active
                    mobileTab === 'profile' ? "hidden lg:block" : ""
                )}>
                    {/* Financial Ledger Section */}
                    <section className={cn("space-y-6", mobileTab !== 'ledger' ? "hidden lg:block" : "")}>

                        {/* ── Mobile-only summary bar ────────────────────────────────── */}
                        {ledger && (
                            <div className="lg:hidden grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Total Fees', value: formatCurrency(ledger.summary?.total_charges ?? 0), color: 'text-foreground' },
                                    { label: 'Paid', value: formatCurrency(ledger.summary?.total_payments ?? 0), color: 'text-emerald-600' },
                                    { label: 'Balance', value: formatCurrency(ledger.summary?.outstanding_balance ?? 0), color: ledger.summary?.outstanding_balance > 0 ? 'text-destructive' : 'text-emerald-600' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="bg-card border border-border/50 rounded-2xl px-3 py-2.5 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                                        <p className={cn("text-sm font-black mt-0.5 truncate", color)}>{value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 uppercase">
                                <Receipt className="h-6 w-6 text-primary" />
                                Financial Ledger
                            </h2>
                            {/* Desktop action buttons — on mobile these live in the sticky bottom bar */}
                            <div className="hidden lg:flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadBill}
                                    disabled={billStatus === 'loading'}
                                    className="h-9 px-4 rounded-full text-xs font-bold border-border/60 hover:bg-secondary"
                                >
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Generate Bill
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddCharge(true)}
                                    className="h-9 px-4 rounded-full text-xs font-bold border-orange-200 text-orange-700 hover:bg-orange-50"
                                >
                                    + Charge
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddDiscount(true)}
                                    className="h-9 px-4 rounded-full text-xs font-bold border-purple-200 text-purple-700 hover:bg-purple-50"
                                >
                                    - Discount
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowPhase2Calculator(true)}
                                    className="h-9 px-4 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none"
                                >
                                    Phase 2
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setShowAddPayment(true)}
                                    className="h-9 px-5 rounded-full text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    + Payment
                                </Button>
                            </div>
                        </div>

                        {/* ── Mobile card list (lg:hidden) ─────────────────── */}
                        <div className="lg:hidden space-y-2 w-full">
                            {(!ledger?.history || ledger.history.length === 0) ? (
                                <div className="text-center py-12 text-muted-foreground italic text-sm">
                                    No financial activity recorded.
                                </div>
                            ) : ledger.history.map((entry: any, i: number) => {
                                const isPayment = entry.type === 'payment';
                                const isDiscount = entry.type === 'charge' && entry.amount < 0;
                                const dotColor = isDiscount ? 'bg-purple-500' : isPayment ? 'bg-emerald-500' : 'bg-orange-500';
                                const amtColor = isPayment ? 'text-emerald-600' : isDiscount ? 'text-purple-600' : 'text-foreground';
                                return (
                                    <div key={entry.id + i} className="bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-foreground leading-snug truncate">{entry.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    {isDiscount ? 'discount' : entry.type}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">·</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                            {!entry.visit_id && (
                                                <div className="flex items-center gap-3 mt-2">
                                                    <button
                                                        onClick={() => entry.type === 'charge' ? startEditCharge(entry) : startEditPayment(entry)}
                                                        className="text-[10px] font-bold text-primary uppercase"
                                                    >Edit</button>
                                                    {entry.id !== 'initial-fee' && (
                                                        <button
                                                            onClick={() => entry.type === 'charge' ? handleDeleteCharge(entry.id) : handleDeletePayment(entry.id)}
                                                            className="text-[10px] font-bold text-destructive uppercase"
                                                        >Delete</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={cn("font-black text-sm", amtColor)}>
                                                {isPayment ? '-' : ''}{formatCurrency(entry.amount)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                bal {formatCurrency(entry.balance_after)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Desktop table (hidden on mobile) ─────────────── */}
                        <div className="hidden lg:block bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden">
                            <div className="overflow-x-auto scrollbar-hide">
                                <Table className="min-w-full">
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-b bg-secondary/30">
                                            <TableHead className="font-bold text-foreground h-14 pl-6">Date</TableHead>
                                            <TableHead className="font-bold text-foreground h-14">Transaction Details</TableHead>
                                            <TableHead className="font-bold text-foreground h-14">Type</TableHead>
                                            <TableHead className="font-bold text-foreground h-14 text-right">Amount</TableHead>
                                            <TableHead className="font-bold text-foreground h-14 text-right pr-6">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                <TableBody>
                                    {ledger?.history.map((entry: any, i: number) => (
                                        <TableRow key={entry.id + i} className="group hover:bg-secondary/20 transition-colors border-b last:border-0 h-16">
                                            <TableCell className="pl-6">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">
                                                        {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    {!entry.visit_id && (
                                                        <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => entry.type === 'charge' ? startEditCharge(entry) : startEditPayment(entry)}
                                                                className="text-[10px] font-bold text-primary hover:underline uppercase"
                                                            >Edit</button>
                                                            {entry.id !== 'initial-fee' && (
                                                                <button
                                                                    onClick={() => entry.type === 'charge' ? handleDeleteCharge(entry.id) : handleDeletePayment(entry.id)}
                                                                    className="text-[10px] font-bold text-destructive hover:underline uppercase"
                                                                >Delete</button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-foreground">{entry.description}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "h-2 w-2 rounded-full",
                                                        entry.type === 'charge' && entry.amount < 0 ? "bg-purple-500" :
                                                        entry.type === 'charge' ? "bg-orange-500" : "bg-emerald-500"
                                                    )} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                                                        {entry.type === 'charge' && entry.amount < 0 ? 'discount' : entry.type}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-black",
                                                entry.type === 'payment' ? "text-emerald-600" : entry.amount < 0 ? "text-purple-600" : "text-foreground"
                                            )}>
                                                {entry.type === 'payment' ? '-' : ''}{formatCurrency(entry.amount)}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-mono font-bold text-sm text-muted-foreground">
                                                {formatCurrency(entry.balance_after)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!ledger?.history || ledger.history.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                                                No financial activity recorded for this profile.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                </Table>
                            </div>
                        </div>
                    </section>

                    {/* Consultation Visits Section — on mobile shown only on visits tab */}
                    <section className={cn("space-y-8", mobileTab !== 'visits' ? "hidden lg:block" : "")}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 uppercase">
                                <ClipboardList className="h-6 w-6 text-primary" />
                                Consultation History
                            </h2>
                            {/* Hidden on mobile — bottom action bar handles this */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddVisit(true)}
                                className="hidden lg:inline-flex h-10 px-5 rounded-full text-xs font-bold border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Record Visit
                            </Button>
                        </div>

                        <div className="relative pl-8 space-y-10 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                            {visits.map((v, i) => (
                                <motion.div
                                    key={v.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="relative"
                                >
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[35px] top-1.5 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 shadow-sm">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                    </div>

                                    <div className="grid sm:grid-cols-[140px_1fr] gap-3 items-start">
                                        <div className="pt-1">
                                            <span className="text-xs font-black uppercase tracking-widest text-primary/70">
                                                {new Date(v.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="bg-card p-4 sm:p-6 rounded-2xl shadow-sm border border-border/50 group hover:border-primary/30 hover:shadow-md transition-all relative">
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight pr-2">
                                                    {v.purpose}
                                                </h3>
                                                <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => startEditVisit(v)}>
                                                        <Edit3 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteVisit(v.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/10 rounded-full" />
                                                <p className="text-sm text-muted-foreground leading-relaxed pl-3 italic">
                                                    "{v.observations || "No specific observations recorded."}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {visits.length === 0 && (
                                <div className="text-center py-16 bg-white/50 rounded-3xl border border-dashed border-border flex flex-col items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                                        <Calendar className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground font-medium italic">No documented consultation visits yet.</p>
                                    <Button variant="ghost" className="text-primary font-bold text-xs" onClick={() => setShowAddVisit(true)}>
                                        + Record Your First Visit
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            </div>

            {/* ── Mobile Sticky Bottom Action Bar ──────────────────────────────── */}
            <div
                className="lg:hidden fixed inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/60 px-4 py-3 flex items-center gap-2"
                style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
            >
                {mobileTab === 'visits' ? (
                    <Button
                        className="flex-1 h-11 rounded-xl font-bold text-sm shadow-lg"
                        onClick={() => setShowAddVisit(true)}
                    >
                        <Calendar className="mr-1.5 h-4 w-4" />
                        Record Visit
                    </Button>
                ) : (
                    <Button
                        className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/30"
                        onClick={() => setShowAddPayment(true)}
                    >
                        <IndianRupee className="mr-1.5 h-4 w-4" />
                        Record Payment
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-2xl" side="top">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowAddCharge(true)} className="gap-2 py-2.5">
                            <Plus className="h-4 w-4 text-orange-500" /> Add Charge
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowAddDiscount(true)} className="gap-2 py-2.5">
                            <Minus className="h-4 w-4 text-purple-500" /> Apply Discount
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowPhase2Calculator(true)} className="gap-2 py-2.5">
                            <Calculator className="h-4 w-4 text-indigo-500" /> Phase 2 Execution
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDownloadBill} disabled={billStatus === 'loading'} className="gap-2 py-2.5">
                            <FileDown className="h-4 w-4" /> Generate Bill
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {showEditClient && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
                        >
                            <Card className="shadow-2xl border-primary/20 overflow-hidden rounded-3xl">
                                <CardHeader className="bg-primary/5 pb-6">
                                    <CardTitle>Edit Client Profile</CardTitle>
                                    <CardDescription>Update consultant contact details or preferences.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleEditClient}>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="c-name" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Full Name</Label>
                                            <Input id="c-name" className="rounded-xl bg-secondary/30 border-none h-11" required value={clientForm.full_name} onChange={e => setClientForm({ ...clientForm, full_name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="c-phone" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Phone</Label>
                                            <Input id="c-phone" className="rounded-xl bg-secondary/30 border-none h-11" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="c-email" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Email</Label>
                                            <Input id="c-email" type="email" className="rounded-xl bg-secondary/30 border-none h-11" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="c-address" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Project Address</Label>
                                            <Input id="c-address" className="rounded-xl bg-secondary/30 border-none h-11" value={clientForm.project_address} onChange={e => setClientForm({ ...clientForm, project_address: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="c-loc" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Location</Label>
                                                <select id="c-loc" className="flex h-11 w-full rounded-xl border-none bg-secondary/30 px-3 py-2 text-sm" value={clientForm.location_type} onChange={e => setClientForm({ ...clientForm, location_type: e.target.value })}>
                                                    <option>Goa</option>
                                                    <option>Karnataka</option>
                                                    <option>Maharashtra</option>
                                                    <option>Other</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="c-status" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Status</Label>
                                                <select id="c-status" className="flex h-11 w-full rounded-xl border-none bg-secondary/30 px-3 py-2 text-sm" value={clientForm.lead_status} onChange={e => setClientForm({ ...clientForm, lead_status: e.target.value })}>
                                                    <option>Inquiry</option>
                                                    <option>Active</option>
                                                    <option>Completed</option>
                                                    <option>Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-6 pb-8 px-6 border-t">
                                        <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setShowEditClient(false)}>Cancel</Button>
                                        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold bg-foreground text-background">Update Profile</Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showAddCharge && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
                        >
                            <Card className="shadow-2xl border-orange-500/20 overflow-hidden rounded-3xl">
                                <CardHeader className="bg-orange-500/5 pb-6">
                                    <CardTitle>{editingCharge ? 'Edit' : 'Add'} Extra Service Charge</CardTitle>
                                    <CardDescription>
                                        {editingCharge ? 'Modify existing ledger entry details.' : 'Include professional remedies or travel expenses.'}
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAddCharge}>
                                    <CardContent className="space-y-4 pt-6">
                                        {!editingCharge && (
                                            <div className="space-y-2">
                                                <Label htmlFor="addon_type" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Select Charge Type</Label>
                                                <Select
                                                    value={chargeForm.addon_type}
                                                    onValueChange={(value) => onAddonSelect(value)}
                                                >
                                                    <SelectTrigger className="w-full bg-secondary/30 border-none focus:ring-orange-500/20 rounded-xl h-11 overflow-hidden">
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
                                                            <SelectItem value="custom" className="font-semibold text-orange-600 focus:text-orange-700 focus:bg-orange-50 cursor-pointer">
                                                                ✨ Custom Manual Entry
                                                            </SelectItem>
                                                            {availableAddons.length > 0 && (
                                                                <>
                                                                    <SelectSeparator className="bg-orange-500/10" />
                                                                    <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground pt-3">
                                                                        {client.service_id ? "Recommended for Project" : "Standard Catalog Addons"}
                                                                    </SelectLabel>
                                                                    {availableAddons.map(addon => (
                                                                        <SelectItem key={addon.id} value={addon.id} className="py-2.5 cursor-pointer">
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
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="description" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Service Description</Label>
                                            <Input
                                                id="description"
                                                className="rounded-xl bg-secondary/30 border-none h-11"
                                                placeholder="e.g. Vastu Remedy Installation"
                                                value={chargeForm.description}
                                                onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })}
                                                disabled={chargeForm.addon_type !== 'custom'}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="amount" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Amount (₹)</Label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    className="pl-9 rounded-xl bg-secondary/30 border-none h-11 font-black"
                                                    value={chargeForm.amount}
                                                    onChange={e => setChargeForm({ ...chargeForm, amount: parseFloat(e.target.value) })}
                                                    disabled={chargeForm.addon_type !== 'custom'}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="charge-date" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Charge Date</Label>
                                            <Input
                                                id="charge-date"
                                                type="date"
                                                className="rounded-xl bg-secondary/30 border-none h-11"
                                                value={chargeForm.date}
                                                onChange={e => setChargeForm({ ...chargeForm, date: e.target.value })}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-6 pb-8 px-6 border-t">
                                        <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => { setShowAddCharge(false); setEditingCharge(null); }}>Cancel</Button>
                                        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold bg-orange-600 hover:bg-orange-700 text-white">
                                            {editingCharge ? 'Update Entry' : 'Add Charge'}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showAddDiscount && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
                        >
                            <Card className="shadow-2xl border-purple-500/20 overflow-hidden rounded-3xl">
                                <CardHeader className="bg-purple-500/5 pb-6">
                                    <CardTitle>Apply Account Discount</CardTitle>
                                    <CardDescription>
                                        Discounts reflect as negative adjustments to the client's overall bill.
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAddDiscount}>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="disc-description" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Discount Label</Label>
                                            <Input
                                                id="disc-description"
                                                className="rounded-xl bg-secondary/30 border-none h-11"
                                                placeholder="e.g. Special Discount, Courtesy Adjustment"
                                                value={discountForm.description}
                                                onChange={e => setDiscountForm({ ...discountForm, description: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="disc-amount" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Discount Amount (₹)</Label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="disc-amount"
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    className="pl-9 rounded-xl bg-secondary/30 border-none h-11 font-black text-purple-700"
                                                    value={discountForm.amount}
                                                    onChange={e => setDiscountForm({ ...discountForm, amount: parseFloat(e.target.value) })}
                                                    required
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground italic px-1 pt-1">-₹{(discountForm.amount || 0).toLocaleString()} deduction from bill.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="disc-date" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Date Applied</Label>
                                            <Input
                                                id="disc-date"
                                                type="date"
                                                className="rounded-xl bg-secondary/30 border-none h-11"
                                                value={discountForm.date}
                                                onChange={e => setDiscountForm({ ...discountForm, date: e.target.value })}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-6 pb-8 px-6 border-t">
                                        <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setShowAddDiscount(false)}>Cancel</Button>
                                        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold bg-purple-600 hover:bg-purple-700 text-white">
                                            Apply Discount
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showAddPayment && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
                        >
                            <Card className="shadow-2xl border-emerald-500/20 overflow-hidden rounded-3xl">
                                <CardHeader className="bg-emerald-500/5 pb-6">
                                    <CardTitle>{editingPayment ? 'Edit' : 'Record'} New Payment</CardTitle>
                                    <CardDescription>
                                        {editingPayment ? 'Modify payment record details.' : 'Update the outstanding balance for this consultant.'}
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAddPayment}>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="pay-amount" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground ml-1">Amount (₹)</Label>
                                                {(ledger?.current_balance || 0) > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentForm(prev => ({ ...prev, amount: ledger.current_balance }))}
                                                        className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-black px-2 py-1 rounded-md transition-all uppercase tracking-tighter"
                                                    >
                                                        Pay Full (₹{ledger.current_balance.toLocaleString()})
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="pay-amount"
                                                    type="number"
                                                    className="pl-9 rounded-xl bg-secondary/30 border-none h-11 font-black text-emerald-700"
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
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
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
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 60 }}
                            className="w-full sm:max-w-2xl max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
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

            {/* ── Confirm AlertDialog (replaces all window.confirm() calls) ─────── */}
            <AlertDialog
                open={confirmDialog.open}
                onOpenChange={(open: boolean) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}
            >
                <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            onClick={() => {
                                confirmDialog.onConfirm();
                                setConfirmDialog(prev => ({ ...prev, open: false }));
                            }}
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
