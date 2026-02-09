"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    User,
    MapPin,
    Phone,
    Mail,
    IndianRupee,
    ArrowLeft,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { clientsApi } from "@/services/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function NewClientPage() {
    const router = useRouter()
    const [loading, setLoading] = React.useState(false)
    const [success, setSuccess] = React.useState(false)

    const [formData, setFormData] = React.useState({
        full_name: "",
        address: "",
        phone: "",
        email: "",
        total_fees_fixed: 0
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.full_name) {
            toast.error("Client name is required")
            return
        }

        setLoading(true)
        try {
            await clientsApi.create(formData)
            setSuccess(true)
            toast.success("Client registered successfully")
            setTimeout(() => {
                router.push("/clients")
            }, 1500)
        } catch (err) {
            toast.error("Failed to register client profile")
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-20 w-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center"
                >
                    <CheckCircle2 size={48} />
                </motion.div>
                <h2 className="text-2xl font-bold">Registration Successful!</h2>
                <p className="text-muted-foreground">Redirecting you to the client directory...</p>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">New Client</h1>
                    <p className="text-muted-foreground">Initialize a new consulting profile.</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <form onSubmit={handleSubmit}>
                    <Card className="border-border/50 shadow-xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b pb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center border border-primary/20">
                                    <User size={20} />
                                </div>
                                <div>
                                    <CardTitle>Profile Information</CardTitle>
                                    <CardDescription>Primary identification and contact details.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-8">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="full_name" className="text-sm font-semibold">Full Legal Name *</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="full_name"
                                            placeholder="e.g. Rajesh Kumar Sharma"
                                            className="pl-9 bg-muted/20"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="address" className="text-sm font-semibold">Site / Property Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <textarea
                                            id="address"
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-muted/20 px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="Enter full property address for Vastu analysis..."
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone" className="text-sm font-semibold">Mobile Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="+91 00000 00000"
                                                className="pl-9 bg-muted/20"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="client@example.com"
                                                className="pl-9 bg-muted/20"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center border border-orange-500/20">
                                        <IndianRupee size={16} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Financial Configuration</h3>
                                        <p className="text-xs text-muted-foreground">Define professional consulting fees.</p>
                                    </div>
                                </div>

                                <div className="grid gap-2 max-w-[200px]">
                                    <Label htmlFor="fees" className="text-sm font-semibold">Base Fixed Fee (₹)</Label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="fees"
                                            type="number"
                                            placeholder="0"
                                            className="pl-9 bg-muted/20 font-mono font-bold"
                                            value={formData.total_fees_fixed}
                                            onChange={(e) => setFormData({ ...formData, total_fees_fixed: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/10 border-t p-6 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="px-8 flex gap-2">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Register Client
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </motion.div>

            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                    * Required fields must be completed. Finalizing this form will create a unique consulting ID for the client.
                    You can track visits and maintain the ledger after the profile is active.
                </p>
            </div>
        </div>
    )
}
