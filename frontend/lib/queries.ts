"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api, unwrap } from "@/lib/api/client"
import { reminderMessage } from "@/lib/documents"
import { rupees } from "@/lib/format"

export const keys = {
    me: ["me"] as const,
    home: ["home"] as const,
    clients: ["clients"] as const,
    client: (id: string) => ["client", id] as const,
    property: (id: string) => ["property", id] as const,
    catalog: (all = false) => ["catalog", all] as const,
    users: ["users"] as const,
    config: ["config"] as const,
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => unwrap(api.GET("/api/v1/login/me")), retry: false })
export const useHome = () => useQuery({ queryKey: keys.home, queryFn: () => unwrap(api.GET("/api/v1/home")) })
export const useClients = () => useQuery({ queryKey: keys.clients, queryFn: () => unwrap(api.GET("/api/v1/clients")) })

export const useClient = (id: string) =>
    useQuery({
        queryKey: keys.client(id),
        queryFn: () => unwrap(api.GET("/api/v1/clients/{client_id}", { params: { path: { client_id: id } } })),
        enabled: Boolean(id),
    })

export const useProperty = (id: string) =>
    useQuery({
        queryKey: keys.property(id),
        queryFn: () => unwrap(api.GET("/api/v1/properties/{property_id}", { params: { path: { property_id: id } } })),
        enabled: Boolean(id),
    })

export const useCatalog = (includeInactive = false) =>
    useQuery({
        queryKey: keys.catalog(includeInactive),
        queryFn: () => unwrap(api.GET("/api/v1/catalog", { params: { query: { include_inactive: includeInactive } } })),
    })

export const useUsers = () => useQuery({ queryKey: keys.users, queryFn: () => unwrap(api.GET("/api/v1/users")) })

export const useAppConfig = () =>
    useQuery({
        queryKey: keys.config,
        queryFn: () => unwrap(api.GET("/api/v1/config")) as Promise<Record<string, Record<string, string>>>,
        staleTime: Infinity,
    })

/**
 * A mutation that shows a toast and then refreshes everything, since any money
 * change moves balances on the home, client and property screens at once.
 */
export function useAction<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, success?: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: fn,
        onSuccess: () => {
            if (success) toast.success(success)
            return queryClient.invalidateQueries()
        },
        onError: (error: Error) => toast.error(error.message),
    })
}

/** WhatsApp reminder text for a balance, with the payment details from the app settings. */
export function useReminderText() {
    const config = useAppConfig().data
    return (clientName: string, label: string, balance: number) =>
        reminderMessage({
            clientName,
            label,
            balance: rupees(balance),
            business: config?.project?.name ?? "Shree Vastu Vaibhav",
            upiId: config?.payment?.upiId || undefined,
            gpay: config?.contact?.gpayPhone || undefined,
        })
}
