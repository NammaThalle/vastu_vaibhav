"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
    Home,
    Mail,
    Lock,
    Loader2,
    ArrowRight,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/services/api"
import { toast } from "sonner"

export default function LoginPage() {
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const data = await authApi.login({ email, password })
            localStorage.setItem("token", data.access_token)
            toast.success("Welcome back, Consultant!")
            router.push("/")
        } catch (err: any) {
            toast.error(err.message || "Invalid credentials. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md z-10"
            >
                <div className="flex flex-col items-center mb-8 gap-2">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40 animate-breathing">
                        <Home className="text-primary-foreground h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Vastu Vaibhav</h1>
                    <p className="text-muted-foreground text-sm font-medium">Professional Consulting Suite</p>
                </div>

                <Card className="glass-card">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
                        <CardDescription>
                            Enter your consultant credentials to access your dashboard.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@company.com"
                                        className="pl-9 bg-muted/20"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link href="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
                                </div>
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
                                        Continue to Dashboard
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                            <div className="text-sm text-center text-muted-foreground">
                                Don&apos;t have an account?{" "}
                                <Link href="/register" className="text-primary font-bold hover:underline">
                                    Join the platform
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>

                <div className="mt-8 flex items-center gap-2 p-3 rounded-lg border border-primary/10 bg-primary/5 text-primary">
                    <AlertCircle size={16} className="shrink-0" />
                    <p className="text-[10px] font-medium leading-tight">
                        Protected instance. All sessions are logged for professional record keeping compliance.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
