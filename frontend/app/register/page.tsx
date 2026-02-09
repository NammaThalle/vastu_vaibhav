"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
    UserPlus,
    Mail,
    Lock,
    Loader2,
    ArrowRight,
    ShieldCheck,
    Home
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/services/api"
import { toast } from "sonner"

export default function RegisterPage() {
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await authApi.register({ email, password })
            toast.success("Account created! Please sign in to continue.")
            router.push("/login")
        } catch (err: any) {
            toast.error(err.message || "Registration failed. Is the email already in use?")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute -bottom-8 -right-4 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute top-0 left-20 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md z-10"
            >
                <div className="flex flex-col items-center mb-8 gap-2">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm border border-primary/20">
                        <Home className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Vastu Vaibhav</h1>
                    <p className="text-muted-foreground text-sm font-medium">Create Consultant Profile</p>
                </div>

                <Card className="glass-card shadow-2xl border-primary/10">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <UserPlus className="h-6 w-6 text-primary" />
                            Register
                        </CardTitle>
                        <CardDescription>
                            Join the professional consulting community.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleRegister}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="consultant@company.com"
                                        className="pl-9 bg-muted/20"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Set Secret Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-9 bg-muted/20"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Create My Account
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                            <div className="text-sm text-center text-muted-foreground">
                                Already registered?{" "}
                                <Link href="/login" className="text-primary font-bold hover:underline">
                                    Sign In
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>

                <div className="mt-8 flex items-center justify-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5 grayscale opacity-50">
                        <ShieldCheck size={16} />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Secure Infrastructure</span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
