"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn, formatCurrency } from "@/lib/utils"

type LedgerEntry = {
    id: string;
    type: "charge" | "discount" | "payment" | string;
    description: string;
    amount: number;
    date: string;
    balance_after: number;
    visit_id?: string | null;
};

type LedgerHistoryProps = {
    ledger: { history?: LedgerEntry[] } | null;
    onEditService: (entry: LedgerEntry) => void;
    onEditPayment: (entry: LedgerEntry) => void;
    onDeleteService: (id: string) => void;
    onDeletePayment: (id: string) => void;
};

function formatLedgerDate(value: string) {
    return new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function isServiceEntry(entry: LedgerEntry) {
    return entry.type === "charge" || entry.type === "discount";
}

function entryStyles(entry: LedgerEntry) {
    const isPayment = entry.type === "payment";
    const isDiscount = entry.type === "discount";

    return {
        label: entry.type,
        dotColor: isDiscount ? "bg-purple-500" : isPayment ? "bg-emerald-500" : "bg-orange-500",
        amountColor: isPayment ? "text-emerald-600 dark:text-emerald-300" : isDiscount ? "text-purple-600 dark:text-violet-300" : "text-foreground",
        isDeduction: isPayment || isDiscount,
    };
}

export function LedgerHistory({
    ledger,
    onEditService,
    onEditPayment,
    onDeleteService,
    onDeletePayment,
}: LedgerHistoryProps) {
    const history = ledger?.history || [];

    const handleEdit = (entry: LedgerEntry) => {
        if (isServiceEntry(entry)) {
            onEditService(entry);
        } else {
            onEditPayment(entry);
        }
    };

    const handleDelete = (entry: LedgerEntry) => {
        if (isServiceEntry(entry)) {
            onDeleteService(entry.id);
        } else {
            onDeletePayment(entry.id);
        }
    };

    if (history.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground italic text-sm">
                No financial activity recorded.
            </div>
        );
    }

    return (
        <>
            <div className="lg:hidden space-y-2 w-full">
                {history.map((entry, index) => {
                    const styles = entryStyles(entry);
                    return (
                        <div key={entry.id + index} className="bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-foreground leading-snug truncate">{entry.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", styles.dotColor)} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        {styles.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">·</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {formatLedgerDate(entry.date)}
                                    </span>
                                </div>
                                {!entry.visit_id && (
                                    <div className="flex items-center gap-3 mt-2">
                                        <button
                                            onClick={() => handleEdit(entry)}
                                            className="text-[10px] font-bold text-primary uppercase"
                                        >Edit</button>
                                        {entry.id !== "initial-fee" && (
                                            <button
                                                onClick={() => handleDelete(entry)}
                                                className="text-[10px] font-bold text-destructive uppercase"
                                            >Delete</button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <p className={cn("font-black text-sm", styles.amountColor)}>
                                    {styles.isDeduction ? "-" : ""}{formatCurrency(entry.amount)}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    bal {formatCurrency(entry.balance_after)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hidden lg:block bg-white rounded-3xl shadow-sm border border-border/50 overflow-hidden dark:bg-white/[0.03] dark:border-white/[0.08] dark:backdrop-blur-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
                <div className="overflow-x-auto scrollbar-hide">
                    <Table className="min-w-full">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b bg-secondary/30">
                                <TableHead className="font-bold text-foreground h-14 pl-6">Date</TableHead>
                                <TableHead className="font-bold text-foreground h-14">Transaction Details</TableHead>
                                <TableHead className="font-bold text-foreground h-14">Type</TableHead>
                                <TableHead className="font-bold text-foreground h-14 text-right">Amount</TableHead>
                                <TableHead className="font-bold text-foreground h-14 text-right pr-6">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((entry, index) => {
                                const styles = entryStyles(entry);
                                return (
                                    <TableRow key={entry.id + index} className="group hover:bg-secondary/20 transition-colors border-b last:border-0 h-16">
                                        <TableCell className="pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                    {formatLedgerDate(entry.date)}
                                                </span>
                                                {!entry.visit_id && (
                                                    <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(entry)}
                                                            className="text-[10px] font-bold text-primary hover:underline uppercase"
                                                        >Edit</button>
                                                        {entry.id !== "initial-fee" && (
                                                            <button
                                                                onClick={() => handleDelete(entry)}
                                                                className="text-[10px] font-bold text-destructive hover:underline uppercase"
                                                            >Delete</button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-foreground">{entry.description}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("h-2 w-2 rounded-full", styles.dotColor)} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                                                    {styles.label}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className={cn("text-right font-black", styles.amountColor)}>
                                            {styles.isDeduction ? "-" : ""}{formatCurrency(entry.amount)}
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-mono font-bold text-sm text-muted-foreground">
                                            {formatCurrency(entry.balance_after)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}
