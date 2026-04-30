import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LayoutShell } from "@/components/LayoutShell"
import { QueryProvider } from "@/components/QueryProvider"
import { Toaster } from "@/components/ui/sonner"

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#C96C2D" },
        { media: "(prefers-color-scheme: dark)", color: "#D4891A" },
    ],
}

export const metadata: Metadata = {
    title: "Vastu Vaibhav | Professional Consulting",
    description: "Advanced Platform for Vastu Consultants — manage clients, visits, and financials.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Vastu Vaibhav",
    },
    icons: {
        icon: [
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [
            { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
    },
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <QueryProvider>
                        <LayoutShell>{children}</LayoutShell>
                        <Toaster position="top-center" />
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
