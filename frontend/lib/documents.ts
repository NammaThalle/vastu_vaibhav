/** Fetch a PDF from the API and hand it to the phone's share sheet, a new tab, or a download. */

export type PdfFile = { file: File; url: string }

function fileName(response: Response, fallback: string): string {
    const header = response.headers.get("content-disposition") ?? ""
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1]
    if (encoded) return decodeURIComponent(encoded)
    return /filename="([^"]+)"/i.exec(header)?.[1] ?? fallback
}

export async function fetchPdf(path: string): Promise<PdfFile> {
    const response = await fetch(path, { credentials: "include" })
    if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(typeof body?.detail === "string" ? body.detail : `Could not make the PDF (${response.status})`)
    }
    const blob = await response.blob()
    const file = new File([blob], fileName(response, "document.pdf"), { type: "application/pdf" })
    return { file, url: URL.createObjectURL(file) }
}

/** True on phones and Safari, where a PDF can go straight to WhatsApp through the share sheet. */
export function canShareFile(file: File): boolean {
    return typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })
}

export async function shareFile(file: File, text?: string): Promise<void> {
    try {
        await navigator.share({ files: [file], title: file.name, text })
    } catch (error) {
        if ((error as Error).name !== "AbortError") throw error
    }
}

export function downloadFile({ file, url }: PdfFile): void {
    const link = document.createElement("a")
    link.href = url
    link.download = file.name
    link.click()
}

export function reminderMessage(opts: {
    clientName: string
    label: string
    balance: string
    business: string
    upiId?: string
    gpay?: string
}): string {
    const firstName = opts.clientName.trim().split(/\s+/)[0]
    const ways = [opts.upiId && `UPI ID ${opts.upiId}`, opts.gpay && `GPay ${opts.gpay}`].filter(Boolean).join(" or ")
    return [
        `Namaste ${firstName} ji,`,
        `This is a gentle reminder from ${opts.business} that ${opts.balance} is pending for ${opts.label}.`,
        ways ? `You can pay by ${ways}.` : "",
        "Please ignore this if already paid. Thank you.",
    ].filter(Boolean).join("\n")
}
