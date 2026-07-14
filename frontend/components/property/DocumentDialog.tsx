"use client"

import * as React from "react"
import { Download, ExternalLink, Loader2, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { canShareFile, downloadFile, fetchPdf, shareFile, type PdfFile } from "@/lib/documents"

export type DocumentRequest = { title: string; path: string; shareText?: string }

/**
 * Makes the PDF first, then offers Share, Open and Download. Sharing needs a fresh tap after
 * the PDF is ready: phones only open the share sheet straight after a tap.
 */
export function DocumentDialog({ request, onOpenChange }: { request: DocumentRequest; onOpenChange: (open: boolean) => void }) {
    const [pdf, setPdf] = React.useState<PdfFile | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        let cancelled = false
        let made: PdfFile | null = null
        fetchPdf(request.path)
            .then((result) => {
                made = result
                if (!cancelled) setPdf(result)
            })
            .catch((e: Error) => !cancelled && setError(e.message))
        return () => {
            cancelled = true
            if (made) URL.revokeObjectURL(made.url)
        }
    }, [request.path])

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{request.title}</DialogTitle>
                    <DialogDescription>{pdf ? pdf.file.name : error ? "" : "Making the PDF..."}</DialogDescription>
                </DialogHeader>
                {error && <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
                {!pdf && !error && (
                    <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                )}
                {pdf && (
                    <div className="grid gap-2">
                        {canShareFile(pdf.file) && (
                            <Button className="h-12" onClick={() => shareFile(pdf.file, request.shareText)}>
                                <Share2 className="mr-2 h-4 w-4" /> Share, e.g. on WhatsApp
                            </Button>
                        )}
                        <Button variant="outline" className="h-11" asChild>
                            <a href={pdf.url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Open to view or print</a>
                        </Button>
                        <Button variant="outline" className="h-11" onClick={() => downloadFile(pdf)}>
                            <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
