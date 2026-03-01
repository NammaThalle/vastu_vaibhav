"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calculator, IndianRupee, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { servicesApi } from "@/services/api"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

interface ServiceCalculatorProps {
    onCalculated: (fee: number, serviceId?: string) => void;
    initialFee?: number;
}

export function ServiceCalculator({ onCalculated, initialFee = 0 }: ServiceCalculatorProps) {
    const [services, setServices] = React.useState<any[]>([])
    const [loadingParams, setLoadingParams] = React.useState(true)
    const [calculating, setCalculating] = React.useState(false)

    // Form State for rules
    const [selectedServiceId, setSelectedServiceId] = React.useState<string>("")
    const [propertyType, setPropertyType] = React.useState("Residential")
    const [numRooms, setNumRooms] = React.useState(0)
    const [numRemedies, setNumRemedies] = React.useState(0)
    const [interiorItems, setInteriorItems] = React.useState(0)
    const [exteriorItems, setExteriorItems] = React.useState(0)
    const [fullInterior, setFullInterior] = React.useState(false)
    const [fullExterior, setFullExterior] = React.useState(false)
    const [extraVisits, setExtraVisits] = React.useState(0)
    const [bundleType, setBundleType] = React.useState("Pre-Construction")
    const [customBundlePrice, setCustomBundlePrice] = React.useState(0)

    const [result, setResult] = React.useState<{ total: number, breakdown: Record<string, number> } | null>(null)

    React.useEffect(() => {
        servicesApi.getCatalog().then(data => {
            // Filter out Phase 1 Initial Audit since this calculator is generally for Phase 2 Execution
            const phase2Services = data.filter((s: any) => !s.name.includes("Initial Property Audit"));
            setServices(phase2Services)
            if (phase2Services.length > 0) setSelectedServiceId(phase2Services[0].id)
            setLoadingParams(false)
        }).catch(() => setLoadingParams(false))
    }, [])

    const handleCalculate = async () => {
        setCalculating(true)
        try {
            const data = await servicesApi.calculateFee({
                service_id: selectedServiceId,
                property_type: propertyType,
                num_rooms: numRooms,
                num_remedies: numRemedies,
                interior_items: interiorItems,
                exterior_items: exteriorItems,
                full_interior: fullInterior,
                full_exterior: fullExterior,
                extra_visits: extraVisits,
                bundle_type: bundleType,
                custom_bundle_price: customBundlePrice
            })
            setResult({ total: data.estimated_total, breakdown: data.breakdown })
        } catch (error) {
            console.error(error)
        } finally {
            setCalculating(false)
        }
    }

    const applyFee = () => {
        if (result) {
            onCalculated(result.total, selectedServiceId)
            toast.success(`Fee of ${formatCurrency(result.total)} applied to client form.`)
        }
    }

    if (loadingParams) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading service catalog...</div>

    const selectedService = services.find(s => s.id === selectedServiceId)
    const serviceName = selectedService?.name?.toLowerCase() || ""

    return (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold">
                <Calculator className="h-4 w-4 text-primary" />
                Dynamic Fee Quote Estimator
            </div>

            <div className="grid gap-4">
                <div className="space-y-2">
                    <Label>Select Core Service</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                    >
                        {services.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name} {s.base_price > 0 ? `(Base: ₹${s.base_price})` : "(Dynamic)"}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-dashed">
                    {/* Dynamic Fields Based on Selection */}
                    {serviceName.includes("plot") && (
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Property Scale Type</Label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={propertyType}
                                onChange={(e) => setPropertyType(e.target.value)}
                            >
                                <option>Residential</option>
                                <option>Commercial</option>
                                <option>Agricultural</option>
                                <option>Industrial</option>
                            </select>
                        </div>
                    )}

                    {(serviceName.includes("modification") || serviceName.includes("remedial")) && (
                        <>
                            <div className="space-y-2">
                                <Label>Number of Rooms Evaluated</Label>
                                <Input type="number" min="0" value={numRooms} onChange={e => setNumRooms(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Number of Remedies Placed</Label>
                                <Input type="number" min="0" value={numRemedies} onChange={e => setNumRemedies(Number(e.target.value))} />
                            </div>
                        </>
                    )}

                    {serviceName.includes("interior & exterior") && (
                        <>
                            <div className="space-y-2">
                                <Label>Interior Items Analyzed</Label>
                                <Input type="number" min="0" value={interiorItems} onChange={e => setInteriorItems(Number(e.target.value))} disabled={fullInterior} />
                            </div>
                            <div className="space-y-2">
                                <Label>Exterior Items Analyzed</Label>
                                <Input type="number" min="0" value={exteriorItems} onChange={e => setExteriorItems(Number(e.target.value))} disabled={fullExterior} />
                            </div>
                            <div className="flex items-center gap-2 sm:col-span-2 mt-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={fullInterior} onChange={e => setFullInterior(e.target.checked)} className="rounded border-gray-300" />
                                    Full Comprehensive Interior
                                </label>
                                <label className="flex items-center gap-2 text-sm ml-4">
                                    <input type="checkbox" checked={fullExterior} onChange={e => setFullExterior(e.target.checked)} className="rounded border-gray-300" />
                                    Full Comprehensive Exterior
                                </label>
                            </div>
                        </>
                    )}

                    {serviceName.includes("bundle") && (
                        <>
                            <div className="space-y-2 sm:col-span-2">
                                <Label>Bundle Package Type</Label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    value={bundleType}
                                    onChange={(e) => setBundleType(e.target.value)}
                                >
                                    <option>Pre-Construction</option>
                                    <option>Post-Construction</option>
                                    <option>Complete Vastu</option>
                                    <option>Custom</option>
                                </select>
                            </div>
                            {bundleType === "Custom" && (
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>Custom Negotiated Price</Label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" min="0" className="pl-9" value={customBundlePrice} onChange={e => setCustomBundlePrice(Number(e.target.value))} />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Common Fields */}
                    <div className="space-y-2 sm:col-span-2 pt-2">
                        <Label>Extra / Long Distance Consultation Visits</Label>
                        <Input type="number" min="0" value={extraVisits} onChange={e => setExtraVisits(Number(e.target.value))} className="w-full sm:w-1/2" />
                    </div>
                </div>

                <Button type="button" variant="secondary" onClick={handleCalculate} disabled={calculating}>
                    {calculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    Calculate Estimate
                </Button>

                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-primary/5 rounded-lg border border-primary/20 overflow-hidden"
                        >
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-primary/10">
                                    <span className="font-semibold text-sm">Breakdown of Fees</span>
                                    <Badge variant="outline" className="bg-background">Suggested</Badge>
                                </div>
                                <div className="space-y-1.5 text-sm">
                                    {Object.entries(result.breakdown).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-muted-foreground">
                                            <span>{key}</span>
                                            <span className="font-mono">{formatCurrency(value)}</span>
                                        </div>
                                    ))}
                                </div>
                                <Separator className="bg-primary/10" />
                                <div className="flex justify-between items-center font-bold">
                                    <span>Total Estimate</span>
                                    <span className="text-lg text-primary">{formatCurrency(result.total)}</span>
                                </div>
                                <Button type="button" className="w-full mt-2" onClick={applyFee}>
                                    <Check className="mr-2 h-4 w-4" /> Apply {formatCurrency(result.total)} to Client
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
