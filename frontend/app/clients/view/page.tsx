"use client"

import * as React from "react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowLeft,
    IndianRupee,
    FileDown,
    PlusCircle,
    CreditCard,
    Calendar,
    MapPin,
    Phone,
    Mail,
    User,
    ChevronLeft,
    Plus,
    History,
    Receipt,
    ClipboardList,
    TrendingDown,
    TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { clientsApi, visitsApi, ledgerApi } from "@/services/api"
import { formatCurrency, cn } from "@/lib/utils"
import { toast } from "sonner"

function ClientDetailContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();

    const [client, setClient] = useState<any>(null);
    const [visits, setVisits] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals Visibility
    const [showAddVisit, setShowAddVisit] = useState(false);
    const [showAddCharge, setShowAddCharge] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);

    // Forms State
    const [visitForm, setVisitForm] = useState({ purpose: '', observations: '' });
    const [chargeForm, setChargeForm] = useState({ description: '', amount: 0 });
    const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'Cash', notes: '' });

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
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await visitsApi.create({ ...visitForm, client_id: id as string });
            setVisitForm({ purpose: '', observations: '' });
            setShowAddVisit(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to add visit');
        }
    };

    const handleAddCharge = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ledgerApi.addService({ ...chargeForm, client_id: id as string });
            setChargeForm({ description: '', amount: 0 });
            setShowAddCharge(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to add charge');
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ledgerApi.addPayment({ ...paymentForm, client_id: id as string });
            setPaymentForm({ amount: 0, method: 'Cash', notes: '' });
            setShowAddPayment(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to record payment');
        }
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
        } catch (err: any) {
            alert(err.message || 'Failed to generate bill');
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
                            <CardTitle className="text-4xl font-extrabold">{client.full_name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 text-base">
                                <MapPin className="h-4 w-4" />
                                {client.address || "Address not specified"}
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
                        <Button variant="outline" className="w-full" disabled>Edit Profile</Button>
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
                                            {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
                                    <Card className="border-border/50 hover:border-primary/30 transition-colors bg-card/50 backdrop-blur-sm">
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="outline" className="text-xs font-medium">
                                                    {new Date(v.date).toLocaleDateString()}
                                                </Badge>
                                                {v.purpose.toLowerCase().includes('vastu') && (
                                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                )}
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
                                    <CardTitle>Add Extra Service Charge</CardTitle>
                                    <CardDescription>Include professional remedies or travel expenses.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAddCharge}>
                                    <CardContent className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Service Description</Label>
                                            <Input
                                                id="description"
                                                placeholder="e.g. Vastu Remedy Installation"
                                                value={chargeForm.description}
                                                onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })}
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
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-4 border-t">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddCharge(false)}>Cancel</Button>
                                        <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">Add Charge</Button>
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
                                    <CardTitle>Record New Payment</CardTitle>
                                    <CardDescription>Update the outstanding balance for this consultant.</CardDescription>
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
                                            <Label htmlFor="method">Payment Method</Label>
                                            <select
                                                id="method"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                            <Label htmlFor="notes">Reference Notes</Label>
                                            <Input
                                                id="notes"
                                                placeholder="Transaction ID or remarks..."
                                                value={paymentForm.notes}
                                                onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-4 border-t">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddPayment(false)}>Cancel</Button>
                                        <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">Save Payment</Button>
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
                            <Card className="shadow-2xl border-primary/20">
                                <CardHeader className="bg-primary/5">
                                    <CardTitle>Document Consultation Visit</CardTitle>
                                    <CardDescription>Record your findings and service purpose.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAddVisit}>
                                    <CardContent className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="purpose">Purpose of Visit</Label>
                                            <Input
                                                id="purpose"
                                                placeholder="e.g. Site Inspection, Remedy Verify"
                                                value={visitForm.purpose}
                                                onChange={e => setVisitForm({ ...visitForm, purpose: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="observations">Clinical Observations</Label>
                                            <textarea
                                                id="observations"
                                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="Detail your professional findings here..."
                                                value={visitForm.observations}
                                                onChange={e => setVisitForm({ ...visitForm, observations: e.target.value })}
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-3 pt-4 border-t">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddVisit(false)}>Cancel</Button>
                                        <Button type="submit" className="flex-1">Save Findings</Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function ClientDetailPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem' }}>Loading consultant module...</div>}>
            <ClientDetailContent />
        </Suspense>
    );
}
