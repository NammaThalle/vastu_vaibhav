
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export type TokenResponse = {
    access_token: string;
    token_type: string;
};

export type ClientDto = {
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    personal_address?: string | null;
    project_address?: string | null;
    built_up_area?: number | null;
    location_type?: string | null;
    lead_status: string;
    total_fees_fixed: number;
    service_id?: string | null;
    created_at: string;
    updated_at?: string | null;
    total_billed: number;
    current_balance: number;
};

export type AppSettings = {
    project: {
        name: string;
        tagline: string;
        organization: string;
    };
    contact: {
        email: string;
        phone: string;
        secondaryPhone: string;
        gpayPhone: string;
        website: string;
    };
    payment: {
        bankName: string;
        accountNo: string;
        ifsc: string;
        taxRate: number;
    };
    invoice: {
        logoInitial: string;
        primaryColor: string;
        memberLabel: string;
        notes: {
            thankYou: string;
            watermark: string;
            lateFee: string;
        };
    };
};

export const authToken = {
    get: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
    set: (token: string) => {
        if (typeof window !== 'undefined') localStorage.setItem('token', token);
    },
    clear: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
    },
};

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = authToken.get();

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(error.detail || response.statusText);
    }

    return response.json();
}

export const authApi = {
    login: (data: { email: string; password: string }): Promise<TokenResponse> => {
        const formData = new URLSearchParams();
        formData.append('username', data.email);
        formData.append('password', data.password);

        return fetch(`${API_BASE_URL}/api/v1/login/access-token`, {
            method: 'POST',
            body: formData,
        }).then(res => {
            if (!res.ok) throw new Error('Invalid credentials');
            return res.json();
        });
    },

    register: (data: { email: string; password: string }) => apiFetch('/api/v1/register', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    getMe: () => apiFetch('/api/v1/login/test-token', { method: 'POST' }),
};

export const clientsApi = {
    getAll: () => apiFetch<ClientDto[]>('/api/v1/clients/'),
    get: (id: string) => apiFetch<ClientDto>(`/api/v1/clients/${id}`),
    create: (data: Partial<ClientDto>) => apiFetch<ClientDto>('/api/v1/clients/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: Partial<ClientDto>) => apiFetch<ClientDto>(`/api/v1/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<ClientDto>(`/api/v1/clients/${id}`, {
        method: 'DELETE',
    }),
};

export const visitsApi = {
    getAll: () => apiFetch('/api/v1/visits/'),
    get: (id: string) => apiFetch(`/api/v1/visits/${id}`),
    create: (data: any) => apiFetch('/api/v1/visits/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch(`/api/v1/visits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch(`/api/v1/visits/${id}`, {
        method: 'DELETE',
    }),
};

export const ledgerApi = {
    getClientLedger: (clientId: string) => apiFetch(`/api/v1/ledger/client/${clientId}`),
    getInvoiceData: (clientId: string) => apiFetch(`/api/v1/ledger/client/${clientId}/invoice-data`),
    addService: (data: { client_id: string; description: string; amount: number; entry_type?: 'charge' | 'discount'; date?: string; visit_id?: string }) => apiFetch('/api/v1/ledger/services', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    addPayment: (data: { client_id: string; amount: number; method: string; notes?: string }) => apiFetch('/api/v1/ledger/payments', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateService: (id: string, data: any) => apiFetch(`/api/v1/ledger/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    updatePayment: (id: string, data: any) => apiFetch(`/api/v1/ledger/payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    deleteService: (id: string) => apiFetch(`/api/v1/ledger/services/${id}`, {
        method: 'DELETE',
    }),
    deletePayment: (id: string) => apiFetch(`/api/v1/ledger/payments/${id}`, {
        method: 'DELETE',
    }),
    downloadBill: (clientId: string) => {
        const token = authToken.get();
        return fetch(`${API_BASE_URL}/api/v1/ledger/client/${clientId}/bill`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }).then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    throw new Error(text || 'Failed to download bill');
                });
            }
            return res.blob();
        });
    },
};

export const dashboardApi = {
    getSummary: (period: string = 'month') => apiFetch(`/api/v1/dashboard/summary?period=${period}`),
};

export const servicesApi = {
    getCatalog: () => apiFetch('/api/v1/services/catalog'),
    getCatalogItem: (id: string) => apiFetch(`/api/v1/services/catalog/${id}`),
    createCatalog: (data: any) => apiFetch('/api/v1/services/catalog', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateCatalog: (id: string, data: any) => apiFetch(`/api/v1/services/catalog/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    deleteCatalog: (id: string) => apiFetch(`/api/v1/services/catalog/${id}`, {
        method: 'DELETE',
    }),

    // Addons
    createAddon: (catalogId: string, data: any) => apiFetch(`/api/v1/services/catalog/${catalogId}/addons`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateAddon: (id: string, data: any) => apiFetch(`/api/v1/services/addons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    deleteAddon: (id: string) => apiFetch(`/api/v1/services/addons/${id}`, {
        method: 'DELETE',
    }),

    calculateFee: (calculationData: any) => apiFetch('/api/v1/services/calculate', {
        method: 'POST',
        body: JSON.stringify(calculationData),
    }),
};

export const configApi = {
    getSettings: () => apiFetch<AppSettings>('/api/v1/config'),
};
