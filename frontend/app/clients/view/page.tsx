
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { clientsApi, visitsApi, ledgerApi } from '@/services/api';

function ClientDetailContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();

    const [client, setClient] = useState<any>(null);
    const [visits, setVisits] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals Visibility
    const [showAddVisit, setShowAddVisit] = useState(false);
    const [showAddCharge, setShowAddCharge] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);

    // Forms State
    const [visitForm, setVisitForm] = useState({ purpose: '', observations: '' });
    const [chargeForm, setChargeForm] = useState({ description: '', amount: 0 });
    const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'Cash', notes: '' });

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        try {
            const [clientData, allVisits, ledgerData] = await Promise.all([
                clientsApi.get(id as string),
                visitsApi.getAll(),
                ledgerApi.getClientLedger(id as string)
            ]);
            setClient(clientData);
            setVisits(allVisits.filter((v: any) => v.client_id === id));
            setLedger(ledgerData);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await visitsApi.create({ ...visitForm, client_id: id as string });
            setVisitForm({ purpose: '', observations: '' });
            setShowAddVisit(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to add visit');
        }
    };

    const handleAddCharge = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ledgerApi.addService({ ...chargeForm, client_id: id as string });
            setChargeForm({ description: '', amount: 0 });
            setShowAddCharge(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to add charge');
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ledgerApi.addPayment({ ...paymentForm, client_id: id as string });
            setPaymentForm({ amount: 0, method: 'Cash', notes: '' });
            setShowAddPayment(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to record payment');
        }
    };

    const handleDownloadBill = async () => {
        try {
            const blob = await ledgerApi.downloadBill(id as string);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bill_${client.full_name.replace(' ', '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            alert(err.message || 'Failed to generate bill');
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading consultant records...</div>;
    if (!client) return <div style={{ padding: '2rem' }}>Client not found</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <button onClick={() => router.back()} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem' }}>
                ← Back to Client List
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

                {/* Header Stats Info */}
                <section className="glass-card fade-in" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{client.full_name}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>{client.address}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '3rem', textAlign: 'right' }}>
                        <div>
                            <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Outstanding Balance</label>
                            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: (ledger?.current_balance > 0) ? 'var(--error)' : 'var(--primary)' }}>
                                ₹{ledger?.current_balance.toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Consulting Fee</label>
                            <div style={{ fontWeight: 600, fontSize: '1.5rem' }}>₹{client.total_fees_fixed.toLocaleString()}</div>
                        </div>
                    </div>
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem' }}>

                    {/* Ledger Section */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Financial Ledger</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={handleDownloadBill} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'rgba(50,150,255,0.1)', color: '#5d5dff', border: '1px solid rgba(93,93,255,0.2)' }}>Download Bill</button>
                                <button onClick={() => setShowAddCharge(true)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}>+ Add Charge</button>
                                <button onClick={() => setShowAddPayment(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>+ Record Payment</button>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <th style={{ padding: '1rem' }}>Date</th>
                                        <th style={{ padding: '1rem' }}>Description</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledger?.history.map((entry: any, idx: number) => (
                                        <tr key={entry.id + idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                                {new Date(entry.date).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {entry.description}
                                                <span style={{
                                                    marginLeft: '0.5rem',
                                                    fontSize: '0.6rem',
                                                    textTransform: 'uppercase',
                                                    padding: '0.1rem 0.3rem',
                                                    borderRadius: '3px',
                                                    background: entry.type === 'charge' ? 'rgba(255,50,50,0.1)' : 'rgba(50,255,50,0.1)',
                                                    color: entry.type === 'charge' ? '#ff6666' : '#66ff66'
                                                }}>
                                                    {entry.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: entry.type === 'charge' ? 'var(--text)' : 'var(--primary)' }}>
                                                {entry.type === 'payment' ? '-' : ''}₹{entry.amount.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                                                ₹{entry.balance_after.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Visits Section */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Visits</h3>
                            <button onClick={() => setShowAddVisit(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>+ Record Visit</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {visits.map(v => (
                                <div key={v.id} className="glass-card" style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <strong style={{ fontSize: '0.85rem' }}>{v.purpose}</strong>
                                        <small style={{ color: 'var(--text-muted)' }}>{new Date(v.date).toLocaleDateString()}</small>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>{v.observations}</p>
                                </div>
                            ))}
                            {visits.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No visits yet.</p>}
                        </div>
                    </section>
                </div>
            </div>

            {/* MODALS (Simplified for this drill) */}
            {showAddCharge && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
                        <h3>Add Extra Charge</h3>
                        <form onSubmit={handleAddCharge}>
                            <div className="input-group">
                                <label className="label">Item Description</label>
                                <input className="input" placeholder="e.g. Travel Exp or Remedies" value={chargeForm.description} onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label className="label">Amount (₹)</label>
                                <input type="number" className="input" value={chargeForm.amount} onChange={e => setChargeForm({ ...chargeForm, amount: parseFloat(e.target.value) })} required />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Charge</button>
                                <button type="button" onClick={() => setShowAddCharge(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddPayment && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
                        <h3>Record Payment</h3>
                        <form onSubmit={handleAddPayment}>
                            <div className="input-group">
                                <label className="label">Amount (₹)</label>
                                <input type="number" className="input" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })} required />
                            </div>
                            <div className="input-group">
                                <label className="label">Method</label>
                                <select className="input" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                                    <option>Cash</option>
                                    <option>UPI</option>
                                    <option>Bank Transfer</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Payment</button>
                                <button type="button" onClick={() => setShowAddPayment(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Visit Modal (Included here for completeness) */}
            {showAddVisit && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-card" style={{ width: '500px', padding: '2rem' }}>
                        <h3>Record Visit</h3>
                        <form onSubmit={handleAddVisit}>
                            <div className="input-group">
                                <label className="label">Purpose</label>
                                <input className="input" value={visitForm.purpose} onChange={e => setVisitForm({ ...visitForm, purpose: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label className="label">Observations</label>
                                <textarea className="input" style={{ minHeight: '100px' }} value={visitForm.observations} onChange={e => setVisitForm({ ...visitForm, observations: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                                <button type="button" onClick={() => setShowAddVisit(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ClientDetailPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem' }}>Loading consultant module...</div>}>
            <ClientDetailContent />
        </Suspense>
    );
}
 