
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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
    login: (data: any) => {
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

    register: (data: any) => apiFetch('/api/v1/register', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    getMe: () => apiFetch('/api/v1/login/test-token', { method: 'POST' }),
};

export const clientsApi = {
    getAll: () => apiFetch('/api/v1/clients/'),
    get: (id: string) => apiFetch(`/api/v1/clients/${id}`),
    create: (data: any) => apiFetch('/api/v1/clients/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => apiFetch(`/api/v1/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch(`/api/v1/clients/${id}`, {
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
    addService: (data: { client_id: string; description: string; amount: number }) => apiFetch('/api/v1/ledger/services', {
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
        const token = localStorage.getItem('token');
        return fetch(`${API_BASE_URL}/api/v1/ledger/client/${clientId}/bill`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }).then(res => {
            if (!res.ok) throw new Error('Failed to download bill');
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
