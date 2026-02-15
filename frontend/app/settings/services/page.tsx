"use client";

import { useState, useEffect } from "react";
import { servicesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

    const handleDeleteAddon = async (id: string) => {
        if (!confirm("Are you sure you want to delete this addon?")) return;
        try {
            await servicesApi.deleteAddon(id);
            toast.success("Addon deleted");
            if (selectedServiceId) fetchServiceDetails(selectedServiceId);
        } catch (e: any) {
            toast.error("Failed to delete addon");
        }
    };

    if (loading && services.length === 0) return <div>Loading settings...</div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Service Catalog & Configuration</h1>
                <Button onClick={() => { setEditingService(null); setFormData({ name: '', base_price: 0, max_free_visits: 1 }); setShowServiceModal(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: List of Main Services */}
                <div className="md:col-span-1 border-r pr-4 space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Core Packages</h2>
                    {services.map((svc) => (
                        <div
                            key={svc.id}
                            onClick={() => setSelectedServiceId(svc.id)}
                            className={`p-4 rounded-lg cursor-pointer transition-colors border ${selectedServiceId === svc.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent'}`}
                        >
                            <h3 className="font-semibold">{svc.name}</h3>
                            <p className="text-sm text-muted-foreground">Base: ₹{svc.base_price}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs font-mono bg-accent px-2 py-1 rounded">Free Visits: {svc.max_free_visits}</span>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setEditingService(svc); setFormData({ name: svc.name, base_price: svc.base_price, max_free_visits: svc.max_free_visits }); setShowServiceModal(true); }}>
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Column: Addons for Selected Service */}
                <div className="md:col-span-2 pl-2">
                    {selectedServiceData ? (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Addons: {selectedServiceData.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">Configure drop-down charges for this specific project type.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => { setEditingAddon(null); setFormData({ name: '', price: 0 }); setShowAddonModal(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Sub-Charge
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {selectedServiceData.addons?.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No addons configured.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedServiceData.addons?.map((addon: any) => (
                                            <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                                <div>
                                                    <p className="font-medium">{addon.name}</p>
                                                    <p className="text-sm text-muted-foreground font-mono">₹{addon.price}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button size="icon" variant="ghost" onClick={() => { setEditingAddon(addon); setFormData({ name: addon.name, price: addon.price }); setShowAddonModal(true); }}>
                                                        <Pencil className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteAddon(addon.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-lg p-12">
                            Select a core package to manage its specific add-on charges.
                        </div>
                    )}
                </div>
            </div>

            {/* Service Modal */}
            <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Edit Protocol" : "New Service Protocol"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Service Package Name</Label>
                            <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Base Price (₹)</Label>
                                <Input type="number" value={formData.base_price || 0} onChange={e => setFormData({ ...formData, base_price: parseFloat(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Free Visits</Label>
                                <Input type="number" value={formData.max_free_visits || 0} onChange={e => setFormData({ ...formData, max_free_visits: parseInt(e.target.value) })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowServiceModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveService}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Addon Modal */}
            <Dialog open={showAddonModal} onOpenChange={setShowAddonModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAddon ? "Edit Preset Addon" : "New Preset Addon"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Charge Description (Line Item)</Label>
                            <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Supplementary Site Visit" />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (₹)</Label>
                            <Input type="number" value={formData.price || 0} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
                        </div>
                        <p className="text-xs text-muted-foreground">This amount will be automatically proposed in the client's dropdown if they are enrolled in this project type.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddonModal(false)}>Cancel</Button>
                        <Button onClick={handleSaveAddon}>Save Addon</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
