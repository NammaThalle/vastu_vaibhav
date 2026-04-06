import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LayoutShell } from "@/components/LayoutShell"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"], display: "swap" })

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
    title: "Vastu Vaibhav | Professional Consulting CRM",
    description: "Advanced CRM for Vastu Consultants — manage clients, visits, and financials.",
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
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <LayoutShell>{children}</LayoutShell>
                    <Toaster position="top-center" />
                </ThemeProvider>
            </body>
        </html>
    )
}
