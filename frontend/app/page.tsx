
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { clientsApi, visitsApi, ledgerApi } from '@/services/api';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalClients: 0,
        totalVisits: 0,
        pendingBalance: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [clients, visits] = await Promise.all([
                clientsApi.getAll(),
                visitsApi.getAll()
            ]);

            // Fetch each client's ledger to get the total pending balance
            const ledgers = await Promise.all(
                clients.map((c: any) =>
                    ledgerApi.getClientLedger(c.id).catch(() => ({ current_balance: 0 }))
                )
            );
            const totalBalance = ledgers.reduce((acc, l: any) => acc + (l.current_balance || 0), 0);

            setStats({
                totalClients: clients.length,
                totalVisits: visits.length,
                pendingBalance: totalBalance
            });
        } catch (err) {
            console.error('Failed to load dashboard stats', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2.5rem' }}>
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>
                    Vastu <span style={{ color: 'var(--primary)' }}>Vaibhav</span>
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>Consultant Dashboard & Portfolio Manager</p>
            </header>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="glass-card fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Clients</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.totalClients}</div>
                </div>

                <div className="glass-card fade-in" style={{ padding: '2rem', textAlign: 'center', animationDelay: '0.1s' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Consulting Visits</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.totalVisits}</div>
                </div>

                <div className="glass-card fade-in" style={{ padding: '2rem', textAlign: 'center', animationDelay: '0.2s' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Outstanding Ledger</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: (stats.pendingBalance > 0) ? 'var(--error)' : 'var(--primary)' }}>
                        ₹{stats.pendingBalance.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <section>
                <h3 style={{ marginBottom: '1.5rem' }}>Quick Actions</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link href="/clients" className="btn btn-primary" style={{ textDecoration: 'none', padding: '1rem 2rem' }}>
                        Manage Clients
                    </Link>
                    <Link href="/clients/new" className="btn" style={{ textDecoration: 'none', padding: '1rem 2rem', background: 'rgba(255,255,255,0.05)' }}>
                        + Add New Client
                    </Link>
                    <button className="btn" style={{ padding: '1rem 2rem', background: 'rgba(255,255,255,0.05)', opacity: 0.5, cursor: 'not-allowed' }}>
                        Generate Report (Phase 6)
                    </button>
                </div>
            </section>
        </div>
    );
}
 