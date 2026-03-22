"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

type InvoiceData = {
  company: {
    name: string
    memberLabel: string
  }
  meta: {
    invoiceNo: string
    date: string
    dueDate: string
  }
  customer: {
    name: string
    address: string
    phone: string
    projectAddress: string
    builtUpArea?: number | null
  }
  items: Array<{
    title: string
    description: string
    amount: number
  }>
  summary: {
    subtotal: number
    taxRate: number
    taxAmount: number
    amountPaid: number
    balanceAmount: number
  }
  payment: {
    preferredMode: string
    bankName: string
    accountNo: string
    ifsc: string
  }
  contact: {
    email: string
    phone: string
    secondaryPhone?: string
    gpayPhone?: string
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function InvoicePageContent() {
  const searchParams = useSearchParams()
  const dataParam = searchParams.get("data")

  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.body.setAttribute("data-invoice-ready", "false")
  }, [])

  useEffect(() => {
    try {
      if (!dataParam) {
        throw new Error("Missing invoice data")
      }

      const parsed = JSON.parse(dataParam) as InvoiceData
      setInvoice(parsed)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice")
    } finally {
      setLoading(false)
      document.body.setAttribute("data-invoice-ready", "true")
    }
  }, [dataParam])

  const projectDetails = useMemo(() => {
    if (!invoice) return []
    return [
      invoice.customer.projectAddress
        ? { label: "Project Site", value: invoice.customer.projectAddress }
        : null,
      invoice.customer.builtUpArea
        ? { label: "Built-up Area", value: `${invoice.customer.builtUpArea} sq.ft.` }
        : null,
      invoice.payment.preferredMode
        ? { label: "Preferred Mode", value: invoice.payment.preferredMode }
        : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>
  }, [invoice])

  if (loading) {
    return <div className="min-h-screen bg-stone-100" />
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-8 text-center text-sm text-red-700">
        {error || "Invoice unavailable"}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100 px-3 py-4 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[780px] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="px-7 pt-2 pb-0">
          <div className="relative flex items-center justify-center min-h-[130px]">
            <div className="absolute left-0 flex items-center gap-2">
              <div className="flex h-[130px] w-[130px] shrink-0 items-center justify-center overflow-hidden bg-white">
                <img
                  src="/invoice-assets/vastu_vaibhav_logo.png"
                  alt={invoice.company.name}
                  className="h-full w-full scale-[1.9] object-contain"
                />
              </div>
            </div>

            <div className="text-center">
              <div className="text-[2.2rem] font-black tracking-wide text-[#0f172a] leading-none uppercase">
                {invoice.company.name}
              </div>
            </div>

            <div className="absolute right-0 text-right">
              <div className="flex justify-end">
                <img
                  src="/invoice-assets/bni_logo.png"
                  alt={invoice.company.memberLabel}
                  className="h-6 w-auto object-contain"
                />
              </div>
              <div className="mt-3 text-[1.65rem] font-semibold tracking-[0.05em] text-slate-700">
                INVOICE
              </div>
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                #{invoice.meta.invoiceNo}
              </div>
            </div>
          </div>
        </div>

        <div className="border-y border-indigo-100 bg-indigo-50/40 px-7 py-2">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[12px] font-medium text-slate-700">
            {/* Primary Phone Bubble */}
              <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 shadow-sm">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{invoice.contact.phone}</span>
            </div>

            {/* Secondary Phone Bubble */}
            {invoice.contact.secondaryPhone ? (
                <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 shadow-sm">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{invoice.contact.secondaryPhone}</span>
              </div>
            ) : null}

            {/* Email Bubble */}
              <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 shadow-sm">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{invoice.contact.email}</span>
            </div>
          </div>
        </div>

        <div className="px-7 pb-4 pt-1.5">
          <div className="grid grid-cols-3 gap-4 border-b border-slate-200 pb-2 text-sm">
            <div>
              <div className="text-[9px] text-slate-400">Invoice Date</div>
              <div className="mt-1 font-semibold text-[13px] text-slate-900">{invoice.meta.date}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">Due Date</div>
              <div className="mt-1 font-semibold text-[13px] text-slate-900">{invoice.meta.dueDate}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">Invoice No</div>
              <div className="mt-1 font-semibold text-[13px] text-slate-900">{invoice.meta.invoiceNo}</div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[1.2fr,0.8fr] gap-5">
            <div>
              <div className="text-[10px] text-slate-400">
                Bill To
              </div>
              <div className="mt-1.5 text-[1.2rem] font-semibold text-slate-900">{invoice.customer.name}</div>
              {invoice.customer.address ? (
                <div className="mt-1.5 max-w-xl text-[13px] leading-5 text-slate-500">{invoice.customer.address}</div>
              ) : null}
              {invoice.customer.phone ? (
                <div className="text-[13px] leading-5 text-slate-500">{invoice.customer.phone}</div>
              ) : null}
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="mt-2.5 space-y-2">
                {projectDetails.length > 0 ? (
                  projectDetails.map((detail) => (
                    <div key={detail.label}>
                      <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">
                        {detail.label}
                      </div>
                      <div className="mt-0.5 text-[12px] font-medium text-slate-700">{detail.value}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No project details available.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 overflow-hidden rounded-[14px] border border-slate-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#23409f] text-white">
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em]">
                    DESCRIPTION OF SERVICES
                  </th>
                  <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold tracking-[0.1em]">
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr
                    key={`${item.title}-${index}`}
                    className="border-t border-slate-200 odd:bg-white even:bg-slate-50/60"
                  >
                    <td className="px-3.5 py-3 align-top">
                      <div className="text-[13px] font-semibold text-slate-900">
                        {index + 1}. {item.title}
                      </div>
                      {item.description ? (
                        <div className="mt-0.5 text-[11px] text-slate-500">{item.description}</div>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-3 text-right align-top text-[13px] font-semibold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-7 flex items-start justify-between gap-5">
            <div className="flex-1">
              <div className="text-[13px] font-bold text-slate-900">Payment Instructions</div>
              <div className="mt-2.5 space-y-1.5 text-[12px] leading-5 text-slate-600">
                <div>Bank details: {invoice.payment.bankName}</div>
                <div>Account No: {invoice.payment.accountNo} | IFSC: {invoice.payment.ifsc}</div>
                <div className="flex items-center gap-2 pt-1">
                  <img src="/invoice-assets/gpay.png" alt="GPay" className="h-[14px] w-auto object-contain" />
                  <span>- {invoice.contact.gpayPhone || invoice.contact.phone}</span>
                </div>
                <div className="pt-1">Pay by Date: {invoice.meta.dueDate}</div>
              </div>
            </div>

            <div className="w-full max-w-[220px] shrink-0 rounded-[18px] border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between py-1 text-[12px]">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">{formatCurrency(invoice.summary.subtotal)}</span>
              </div>
              {invoice.summary.taxAmount > 0 ? (
                <div className="flex items-center justify-between py-1 text-[12px]">
                  <span className="text-slate-500">Tax ({invoice.summary.taxRate}%)</span>
                  <span className="font-medium text-slate-800">{formatCurrency(invoice.summary.taxAmount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between py-1 text-[12px]">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-medium text-slate-800">{formatCurrency(invoice.summary.amountPaid)}</span>
              </div>
              <div className="mt-3 rounded-2xl bg-[#dfe6ed] px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Balance
                  </span>
                  <span className="text-[1.55rem] font-black text-slate-900">
                    {formatCurrency(invoice.summary.balanceAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <div className="text-[10px] text-slate-500">Signature of the Receiver</div>
            <div className="mt-0.5 text-[10px] text-slate-500">( Ravindra Manerikar )</div>
            <div className="mt-2 border-t border-slate-200 pt-1.5 text-center text-[10px] text-slate-500">
              Generated on {invoice.meta.date}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InvoiceFallback() {
  return <div className="min-h-screen bg-stone-100" />
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<InvoiceFallback />}>
      <InvoicePageContent />
    </Suspense>
  )
}
