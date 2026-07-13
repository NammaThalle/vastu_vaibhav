import type { PaymentMethod, PropertyStatus, PropertyType, ReferralSource } from "@/lib/api/client"

const rupeeFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function rupees(amount: number): string {
    return rupeeFormat.format(amount)
}

/** Dates arrive as YYYY-MM-DD; format without timezone shifts. */
export function shortDate(value?: string | null): string {
    if (!value) return ""
    const [y, m, d] = value.slice(0, 10).split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function todayIso(): string {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    return local.toISOString().slice(0, 10)
}

export const STATUS_LABELS: Record<PropertyStatus, string> = {
    enquiry: "Enquiry",
    in_progress: "In progress",
    payment_due: "Payment due",
    closed: "Closed",
}

export const PROPERTY_TYPES: Record<PropertyType, string> = {
    apartment: "Apartment / Flat",
    house: "House",
    shop: "Shop",
    office: "Office",
    factory: "Factory",
    plot: "Plot / Land",
    other: "Other",
}

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
    upi: "UPI / GPay",
    cash: "Cash",
    bank_transfer: "Bank transfer",
    cheque: "Cheque",
}

export const REFERRAL_SOURCES: Record<ReferralSource, string> = {
    bni: "BNI",
    bbb: "BBB",
    word_of_mouth: "Word of mouth",
    other: "Other",
}

export function telLink(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, "")}`
}

export function whatsappLink(phone: string, message?: string): string {
    const digits = phone.replace(/\D/g, "")
    const number = digits.length === 10 ? `91${digits}` : digits
    return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`
}
