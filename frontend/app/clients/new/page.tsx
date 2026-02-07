
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientsApi } from '@/services/api';

export default function NewClientPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        full_name: '',
        address: '',
        phone: '',
        email: '',
        total_fees_fixed: 0
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await clientsApi.create(formData);
            router.push('/clients');
        } catch (err: any) {
            setError(err.message || 'Failed to create client');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'total_fees_fixed' ? parseFloat(value) : value
        }));
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <button onClick={() => router.back()} style={{ marginBottom: '1rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                ← Cancel
            </button>

            <div className="glass-card fade-in" style={{ padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '2rem' }}>Add New <span style={{ color: 'var(--primary)' }}>Client</span></h2>

                <form onSubmit={handleSubmit}>
                    {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                    <div className="input-group">
                        <label className="label">Full Name *</label>
                        <input
                            type="text"
                            name="full_name"
                            className="input"
                            placeholder="e.g. Rahul Sharma"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">Address</label>
                        <textarea
                            name="address"
                            className="input"
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            placeholder="Full property address"
                            value={formData.address}
                            onChange={handleChange}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                            <label className="label">Phone Number</label>
                            <input
                                type="text"
                                name="phone"
                                className="input"
                                placeholder="+91..."
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="input-group">
                            <label className="label">Total Fees (₹)</label>
                            <input
                                type="number"
                                name="total_fees_fixed"
                                className="input"
                                placeholder="50000"
                                value={formData.total_fees_fixed}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="input-group" style={{ marginBottom: '2rem' }}>
                        <label className="label">Email ID</label>
                        <input
                            type="email"
                            name="email"
                            className="input"
                            placeholder="client@email.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? 'Saving Client...' : 'Create Client Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}
