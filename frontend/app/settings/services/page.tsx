"use client";

import { useState, useEffect } from "react";
import { servicesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Pencil, Trash2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function ServicesSettingsPage() {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Manage Selected Service for Viewing Addons
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [selectedServiceData, setSelectedServiceData] = useState<any>(null);

    // Form States
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);
    const [showAddonModal, setShowAddonModal] = useState(false);
    const [editingAddon, setEditingAddon] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    // AlertDialog confirm (replaces window.confirm)
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        description: string;
        onConfirm: () => void;
    }>({ open: false, description: '', onConfirm: () => {} });

    const showConfirm = (description: string, onConfirm: () => void) => {
        setConfirmDialog({ open: true, description, onConfirm });
    };

    const fetchServices = async () => {
        try {
            setLoading(true);
            const data = await servicesApi.getCatalog();
            setServices(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to load services");
        } finally {
            setLoading(false);
        }
    };

    const fetchServiceDetails = async (id: string) => {
        try {
            const data = await servicesApi.getCatalogItem(id);
            setSelectedServiceData(data);
        } catch (error: any) {
            toast.error("Failed to load service details");
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    useEffect(() => {
        if (selectedServiceId) {
            fetchServiceDetails(selectedServiceId);
        }
    }, [selectedServiceId]);

    // --- Service Handlers ---
    const handleSaveService = async () => {
        if (!formData.name || formData.base_price === undefined) {
            return toast.error("Name and base price are required");
        }
        try {
            if (editingService) {
                await servicesApi.updateCatalog(editingService.id, formData);
                toast.success("Service updated");
            } else {
                await servicesApi.createCatalog(formData);
                toast.success("Service created");
            }
            setShowServiceModal(false);
            setEditingService(null);
            fetchServices();
            if (selectedServiceId) fetchServiceDetails(selectedServiceId);
        } catch (e: any) {
            toast.error(e.message || "Failed to save service");
        }
    };

    // --- Addon Handlers ---
    const handleSaveAddon = async () => {
        if (!selectedServiceId) return;
        if (!formData.name || formData.price === undefined) {
            return toast.error("Addon Name and Price are required");
        }
        try {
            if (editingAddon) {
                await servicesApi.updateAddon(editingAddon.id, formData);
                toast.success("Addon updated");
            } else {
                await servicesApi.createAddon(selectedServiceId, formData);
                toast.success("Addon created");
            }
            setShowAddonModal(false);
            setEditingAddon(null);
            fetchServiceDetails(selectedServiceId);
        } catch (e: any) {
            toast.error(e.message || "Failed to save addon");
        }
    };

    const handleDeleteAddon = (id: string) => {
        showConfirm("Are you sure you want to delete this addon? This cannot be undone.", async () => {
            try {
                await servicesApi.deleteAddon(id);
                toast.success("Addon deleted");
                if (selectedServiceId) fetchServiceDetails(selectedServiceId);
            } catch (e: any) {
                toast.error("Failed to delete addon");
            }
        });
    };

    if (loading && services.length === 0) return (
        <div className="flex items-center justify-center py-20 gap-4">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground animate-pulse">Loading settings...</span>
        </div>
    );

    // On mobile: if a service is selected, show addon panel (drill-down UX)
    const showAddonPanel = selectedServiceId !== null;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {/* Mobile back button when in addon drill-down */}
                    {showAddonPanel && (
                        <button
                            onClick={() => { setSelectedServiceId(null); setSelectedServiceData(null); }}
                            className="sm:hidden flex items-center gap-1 text-sm text-muted-foreground font-medium -ml-1"
                            aria-label="Back to packages"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </button>
                    )}
                    <h1 className="text-xl sm:text-3xl font-bold tracking-tight">
                        {showAddonPanel && selectedServiceData
                            ? <span className="sm:hidden">{selectedServiceData.name} — Addons</span>
                            : null}
                        <span className={cn(showAddonPanel ? "hidden sm:inline" : "")}>
                            Service Catalog &amp; Configuration
                        </span>
                    </h1>
                </div>
                <Button
                    onClick={() => { setEditingService(null); setFormData({ name: '', base_price: 0, max_free_visits: 1 }); setShowServiceModal(true); }}
                    className="w-full sm:w-auto min-h-[44px]"
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
                </Button>
            </div>

            {/* Grid: list + addon panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: List of Main Services — hidden on mobile when addon panel is open */}
                <div className={cn(
                    "md:col-span-1 md:border-r md:pr-4 space-y-3",
                    showAddonPanel ? "hidden md:block" : ""
                )}>
                    <h2 className="text-lg font-semibold">Core Packages</h2>
                    {services.map((svc) => (
                        <div
                            key={svc.id}
                            onClick={() => setSelectedServiceId(svc.id)}
                            className={cn(
                                "p-4 rounded-xl cursor-pointer transition-colors border min-h-[60px] flex flex-col justify-center",
                                selectedServiceId === svc.id
                                    ? 'bg-primary/10 border-primary'
                                    : 'hover:bg-accent border-border active:bg-accent/70'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-sm">{svc.name}</h3>
                                    <p className="text-xs text-muted-foreground">Base: ₹{svc.base_price} · {svc.max_free_visits} free visits</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-10 w-10 p-0 shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingService(svc);
                                        setFormData({ name: svc.name, base_price: svc.base_price, max_free_visits: svc.max_free_visits });
                                        setShowServiceModal(true);
                                    }}
                                    aria-label={`Edit ${svc.name}`}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Column: Addons — hidden on mobile when no service selected */}
                <div className={cn(
                    "md:col-span-2 md:pl-2",
                    !showAddonPanel ? "hidden md:block" : ""
                )}>
                    {selectedServiceData ? (
                        <Card className="rounded-2xl border-border/60">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
                                <div>
                                    <CardTitle className="text-base sm:text-lg">Addons: {selectedServiceData.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">Configure drop-down charges for this project type.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto min-h-[44px]"
                                    onClick={() => { setEditingAddon(null); setFormData({ name: '', price: 0 }); setShowAddonModal(true); }}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Sub-Charge
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {selectedServiceData.addons?.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">No addons configured.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedServiceData.addons?.map((addon: any) => (
                                            <div
                                                key={addon.id}
                                                className="flex items-center justify-between p-3 border border-border/50 rounded-xl bg-card"
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">{addon.name}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">₹{addon.price}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-10 w-10"
                                                        onClick={() => { setEditingAddon(addon); setFormData({ name: addon.name, price: addon.price }); setShowAddonModal(true); }}
                                                        aria-label="Edit addon"
                                                    >
                                                        <Pencil className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-10 w-10"
                                                        onClick={() => handleDeleteAddon(addon.id)}
                                                        aria-label="Delete addon"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="hidden md:flex items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-2xl p-12 text-sm">
                            Select a core package to manage its specific add-on charges.
                        </div>
                    )}
                </div>
            </div>

            {/* Service Modal */}
            <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
                <DialogContent className="rounded-2xl max-w-sm mx-auto">
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Edit Protocol" : "New Service Protocol"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Service Package Name</Label>
                            <Input
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="h-11"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Base Price (₹)</Label>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    value={formData.base_price || 0}
                                    onChange={e => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Free Visits</Label>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    value={formData.max_free_visits || 0}
                                    onChange={e => setFormData({ ...formData, max_free_visits: parseInt(e.target.value) })}
                                    className="h-11"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="flex-1 h-11" onClick={() => setShowServiceModal(false)}>Cancel</Button>
                        <Button className="flex-1 h-11" onClick={handleSaveService}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Addon Modal */}
            <Dialog open={showAddonModal} onOpenChange={setShowAddonModal}>
                <DialogContent className="rounded-2xl max-w-sm mx-auto">
                    <DialogHeader>
                        <DialogTitle>{editingAddon ? "Edit Preset Addon" : "New Preset Addon"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Charge Description (Line Item)</Label>
                            <Input
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Supplementary Site Visit"
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (₹)</Label>
                            <Input
                                type="number"
                                inputMode="numeric"
                                value={formData.price || 0}
                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                className="h-11"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">This amount will be automatically proposed in the client&apos;s dropdown if they are enrolled in this project type.</p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="flex-1 h-11" onClick={() => setShowAddonModal(false)}>Cancel</Button>
                        <Button className="flex-1 h-11" onClick={handleSaveAddon}>Save Addon</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm AlertDialog */}
            <AlertDialog
                open={confirmDialog.open}
                onOpenChange={(open: boolean) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}
            >
                <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Addon</AlertDialogTitle>
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
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
