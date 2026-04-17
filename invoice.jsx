import { useState } from "react";
import appSettings from "./config/app-settings.json";

const COMPANY = {
  name: appSettings.project.name,
  tagline: appSettings.project.tagline,
  email: appSettings.contact.email,
  phone: appSettings.contact.phone,
  website: appSettings.contact.website,
};

const PAYMENT = appSettings.payment;
const TAX_RATE = appSettings.payment.taxRate;

const INVOICE_META = {
  invoiceNo: "VV-2024-102",
  date: "28 May 2024",
  dueDate: "12 June 2024",
};

const CUSTOMER = {
  name: "Mr. Akash Sharma",
  address: "451, Oakwood Drive",
  city: "Pune, MH — 411001",
  phone: "+91 98765 43210",
};

const ITEMS = [
  {
    id: 1,
    title: "Vastu Consultation & Analysis",
    description: "Comprehensive site evaluation, detailed report",
    amount: 25000,
  },
  {
    id: 2,
    title: "Conceptual Floor Plan Design",
    description: "Modern layout based on Vastu principles",
    amount: 15000,
  },
  {
    id: 3,
    title: "Site Visits & Advisory",
    description: "4 visits during construction phase",
    amount: 10000,
  },
  {
    id: 4,
    title: "Material Selection Guide",
    description: "Textures, lighting, color palette",
    amount: 8000,
  },
];

function formatCurrency(amount) {
  return "₹" + amount.toLocaleString("en-IN");
}


const StatusBadge = ({ label }) => (
  <span
    style={{ fontFamily: "'DM Sans', sans-serif" }}
    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide"
    style={{
      background: "#FEF3C7",
      color: "#92400E",
      border: "1px solid #FDE68A",
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: "0.04em",
    }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
    {label}
  </span>
);

export default function Invoice() {
  const subtotal = ITEMS.reduce((sum, item) => sum + item.amount, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .invoice-root * { box-sizing: border-box; }
        .invoice-root { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Cormorant Garamond', Georgia, serif; }
        .item-row { transition: background 0.15s ease; }
      `}</style>

      <div
        className="invoice-root min-h-screen py-10 px-4"
        style={{ background: "#F7F5F0" }}
      >
        {/* Paper */}
        <div
          className="mx-auto max-w-3xl"
          style={{
            background: "#FEFCF8",
            borderRadius: "16px",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 8px 40px rgba(0,0,0,0.07)",
            overflow: "hidden",
          }}
        >
          {/* ── HEADER ─────────────────────────────────────────── */}
          <div
            style={{
              background: "#1C1917",
              padding: "36px 44px 32px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative circle */}
            <div
              style={{
                position: "absolute",
                right: -60,
                top: -60,
                width: 220,
                height: 220,
                borderRadius: "50%",
                border: "1px solid rgba(217,119,6,0.15)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: -30,
                top: -30,
                width: 140,
                height: 140,
                borderRadius: "50%",
                border: "1px solid rgba(217,119,6,0.1)",
              }}
            />

            <div className="flex items-start justify-between">
              {/* Brand */}
              <div className="flex items-center gap-4">
                {/* Logo mark */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "rgba(217,119,6,0.15)",
                    border: "1.5px solid rgba(217,119,6,0.5)",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="font-display"
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#F59E0B",
                      lineHeight: 1,
                    }}
                  >
                    W
                  </span>
                </div>
                <div>
                  <h1
                    className="font-display"
                    style={{
                      color: "#FAFAF9",
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {COMPANY.name}
                  </h1>
                  <p
                    style={{
                      color: "#A8A29E",
                      fontSize: 11.5,
                      letterSpacing: "0.1em",
                      margin: "4px 0 0",
                      fontWeight: 300,
                    }}
                  >
                    {COMPANY.tagline}
                  </p>
                </div>
              </div>

              {/* Invoice badge */}
              <div style={{ textAlign: "right" }}>
                <div
                  className="font-display"
                  style={{
                    color: "#F59E0B",
                    fontSize: 13,
                    letterSpacing: "0.14em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Invoice
                </div>
                <div
                  style={{
                    color: "#E7E5E4",
                    fontSize: 20,
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  }}
                >
                  {INVOICE_META.invoiceNo}
                </div>
                <StatusBadge label="Payment Due" />
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background:
                  "linear-gradient(90deg, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0.1) 60%, transparent 100%)",
                margin: "28px 0 24px",
              }}
            />

            {/* Meta row */}
            <div className="flex gap-10">
              {[
                { label: "Issue Date", value: INVOICE_META.date },
                { label: "Due Date", value: INVOICE_META.dueDate },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div
                    style={{
                      color: "#78716C",
                      fontSize: 10.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      color: "#E7E5E4",
                      fontSize: 14,
                      fontWeight: 400,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── BODY ───────────────────────────────────────────── */}
          <div style={{ padding: "36px 44px" }}>
            {/* Billed To */}
            <div
              className="flex gap-8 mb-10"
              style={{
                paddingBottom: 28,
                borderBottom: "1px solid #E7E5E4",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#A8A29E",
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  Billed To
                </div>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#1C1917",
                    marginBottom: 6,
                  }}
                >
                  {CUSTOMER.name}
                </div>
                <div style={{ color: "#57534E", fontSize: 13.5, lineHeight: 1.7 }}>
                  <div>{CUSTOMER.address}</div>
                  <div>{CUSTOMER.city}</div>
                  <div style={{ marginTop: 4, color: "#78716C" }}>
                    {CUSTOMER.phone}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#A8A29E",
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  Payment Details
                </div>
                <div style={{ color: "#57534E", fontSize: 13.5, lineHeight: 1.9 }}>
                  {[
                    ["Bank", PAYMENT.bank],
                    ["Account No", PAYMENT.accountNo],
                    ["IFSC", PAYMENT.ifsc],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                      <span style={{ color: "#A8A29E", minWidth: 80 }}>{label}</span>
                      <span style={{ color: "#292524", fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1.5px solid #E7E5E4",
                  }}
                >
                  {["Description", "Amount"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i === 0 ? "left" : "right",
                        fontSize: 10.5,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#A8A29E",
                        fontWeight: 600,
                        paddingBottom: 12,
                        paddingLeft: i === 0 ? 12 : 0,
                        paddingRight: i === 1 ? 12 : 0,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ITEMS.map((item) => (
                  <tr
                    key={item.id}
                    className="item-row"
                    onMouseEnter={() => setHoveredRow(item.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background:
                        hoveredRow === item.id ? "#FAF8F4" : "transparent",
                      borderRadius: 8,
                      transition: "background 0.15s",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px 12px",
                        borderBottom: "1px solid #F5F5F4",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: 14,
                          color: "#1C1917",
                          marginBottom: 3,
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#A8A29E" }}>
                        {item.description}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "16px 12px",
                        borderBottom: "1px solid #F5F5F4",
                        textAlign: "right",
                        fontWeight: 500,
                        fontSize: 14,
                        color: "#292524",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div
              className="mt-6 flex justify-end"
            >
              <div style={{ width: "100%", maxWidth: 320 }}>
                {/* Subtotal + Tax */}
                <div
                  style={{
                    background: "#F5F4F0",
                    borderRadius: 12,
                    padding: "16px 20px",
                    marginBottom: 12,
                  }}
                >
                  {[
                    ["Subtotal", formatCurrency(subtotal)],
                    [`GST (${TAX_RATE * 100}%)`, formatCurrency(tax)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between"
                      style={{ marginBottom: 10 }}
                    >
                      <span style={{ fontSize: 13, color: "#78716C" }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#44403C",
                          fontWeight: 500,
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                  {/* Divider */}
                  <div
                    style={{
                      height: "1px",
                      background: "#E7E5E4",
                      margin: "12px 0",
                    }}
                  />
                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span
                      className="font-display"
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#1C1917",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Total Due
                    </span>
                    <span
                      className="font-display"
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#1C1917",
                      }}
                    >
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Highlighted CTA band */}
                <div
                  style={{
                    background: "#1C1917",
                    borderRadius: 10,
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ color: "#A8A29E", fontSize: 11, letterSpacing: "0.06em", marginBottom: 2 }}>
                      DUE BY
                    </div>
                    <div
                      style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 500 }}
                    >
                      {INVOICE_META.dueDate}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#F59E0B",
                      color: "#1C1917",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "8px 18px",
                      borderRadius: 8,
                      letterSpacing: "0.02em",
                    }}
                  >
                    Pay Now
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div
              style={{
                marginTop: 32,
                padding: "14px 18px",
                borderLeft: "3px solid #F59E0B",
                background: "#FFFBEB",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
                <strong>Note:</strong> Please include the invoice number{" "}
                <strong>{INVOICE_META.invoiceNo}</strong> in your payment
                reference. Payments after the due date may attract a late fee of 2%
                per month.
              </p>
            </div>
          </div>

          {/* ── FOOTER ─────────────────────────────────────────── */}
          <div
            style={{
              borderTop: "1px solid #E7E5E4",
              padding: "20px 44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#FAFAF9",
            }}
          >
            <div style={{ fontSize: 12, color: "#A8A29E" }}>
              Thank you for trusting Vastu Vaibhav.
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                fontSize: 12,
                color: "#78716C",
              }}
            >
              {[COMPANY.email, COMPANY.phone, COMPANY.website].map((val) => (
                <span key={val} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {val}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Subtle watermark below */}
        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 11.5,
            color: "#C7C4BC",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          This is a computer-generated invoice. No signature required.
        </p>
      </div>
    </>
  );
}