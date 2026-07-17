import createClient, { type Middleware } from "openapi-fetch"

import type { components, paths } from "./schema"

/** Shapes generated from the backend's OpenAPI schema. Run `npm run api:types` after API changes. */
export type Schemas = components["schemas"]
export type ClientListItem = Schemas["ClientListItem"]
export type ClientDetail = Schemas["ClientDetail"]
export type PropertyDetail = Schemas["PropertyDetail"]
export type PropertyWithSummary = Schemas["PropertyWithSummary"]
export type CatalogItem = Schemas["CatalogItemOut"]
export type Charge = Schemas["ChargeOut"]
export type Payment = Schemas["PaymentOut"]
export type Visit = Schemas["VisitOut"]
export type Bill = Schemas["BillOut"]
export type Quote = Schemas["QuoteOut"]
export type StockOverview = Schemas["StockOverview"]
export type StockItem = Schemas["StockItem"]
export type SupplierOrderSummary = Schemas["SupplierOrderSummary"]
export type SupplierOrderDetail = Schemas["SupplierOrderDetail"]
export type SupplierOrderLine = Schemas["SupplierOrderLineOut"]
export type SupplierProduct = Schemas["SupplierProductOut"]
export type HomeSummary = Schemas["HomeSummary"]
export type PropertyStatus = Schemas["PropertyStatus"]
export type PropertyType = Schemas["PropertyType"]
export type PaymentMethod = Schemas["PaymentMethod"]
export type ReferralSource = Schemas["ReferralSource"]
export type User = Schemas["User"]

const redirectOnLogout: Middleware = {
    onResponse({ response }) {
        if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login"
        }
    },
}

/** Same-origin client: Caddy (production) and the Next.js dev server both forward /api to FastAPI. */
export const api = createClient<paths>({ baseUrl: "", credentials: "include" })
api.use(redirectOnLogout)

/** Unwrap an openapi-fetch result, turning API errors into readable exceptions. */
export async function unwrap<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
    const { data, error, response } = await request
    if (error !== undefined || data === undefined) {
        throw new Error(errorMessage(error) ?? `Request failed (${response.status})`)
    }
    return data
}

function errorMessage(error: unknown): string | undefined {
    const detail = (error as { detail?: unknown } | undefined)?.detail
    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) {
        return detail.map((d: { loc?: unknown[]; msg?: string }) => `${d.loc?.slice(-1)[0] ?? ""}: ${d.msg}`).join(", ")
    }
    return undefined
}
