
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { clientsApi } from '@/services/api';

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            const data = await clientsApi.getAll();
            setClients(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Consultant <span style={{ color: 'var(--primary)' }}>Clients</span></h1>
                <Link href="/clients/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    + New Client
                </Link>
            </header>

            {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}

            {loading ? (
                <p>Loading clients...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {clients.map(client => (
                        <Link key={client.id} href={`/clients/view?id=${client.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="glass-card fade-in" style={{ padding: '1.5rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>{client.full_name}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    {client.address || 'No address provided'}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        {client.phone || 'No phone'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                        ₹{client.total_fees_fixed.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {clients.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No clients found. Start by adding one!</p>}
                </div>
            )}
        </div>
    );
}
 