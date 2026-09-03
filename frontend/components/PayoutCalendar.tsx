"use client";

import { useMemo } from "react";
import { formatDateTime, type TransactionDto, TRANSACTION_TYPE_LABELS } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PayoutCalendarProps {
  transactions: TransactionDto[];
}

export function PayoutCalendar({ transactions }: PayoutCalendarProps) {
  const incomeTxs = useMemo(() => {
    return transactions.filter(
      (tx) => tx.type === "Dividend" || tx.type === "Coupon" || tx.type === "Tax"
    );
  }, [transactions]);

  const { totalDividends, totalCoupons, totalTaxes, groupedByMonth, chartData } = useMemo(() => {
    let div = 0;
    let coup = 0;
    let tax = 0;

    const groups: Record<string, TransactionDto[]> = {};

    incomeTxs.forEach((tx) => {
      if (tx.type === "Dividend") div += tx.priceAmount;
      if (tx.type === "Coupon") coup += tx.priceAmount;
      if (tx.type === "Tax") tax += tx.priceAmount;

      const date = new Date(tx.executedAt);
      const monthYear = date.toLocaleString("ru-RU", { month: "long", year: "2-digit" });
      const groupKey = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "|" + monthYear;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(tx);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    const groupedList = sortedGroupKeys.map((key) => {
      const [, label] = key.split("|");
      return {
        label,
        transactions: groups[key],
      };
    });

    const chartKeys = [...sortedGroupKeys].reverse(); // For chart, chronological order is better
    const chart = chartKeys.map((key) => {
      const [, label] = key.split("|");
      const txs = groups[key];
      const divSum = txs.filter((t) => t.type === "Dividend").reduce((s, t) => s + t.priceAmount, 0);
      const coupSum = txs.filter((t) => t.type === "Coupon").reduce((s, t) => s + t.priceAmount, 0);
      return {
        name: label,
        Дивиденды: divSum,
        Купоны: coupSum,
      };
    });

    return {
      totalDividends: div,
      totalCoupons: coup,
      totalTaxes: tax,
      groupedByMonth: groupedList,
      chartData: chart,
    };
  }, [incomeTxs]);

  const netIncome = totalDividends + totalCoupons - totalTaxes;

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <p className="text-xs text-muted uppercase">Дивиденды</p>
          <p className="mt-1 font-mono text-xl text-success">
            +{totalDividends.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <p className="text-xs text-muted uppercase">Купоны</p>
          <p className="mt-1 font-mono text-xl text-success">
            +{totalCoupons.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <p className="text-xs text-muted uppercase">Налоги</p>
          <p className="mt-1 font-mono text-xl text-danger">
            -{totalTaxes.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <p className="text-xs text-muted uppercase">Чистый доход</p>
          <p className={"mt-1 font-mono text-xl " + (netIncome >= 0 ? "text-success" : "text-danger")}>
            {netIncome >= 0 ? "+" : ""}{netIncome.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="mt-8 rounded-xl border border-surface-border bg-surface p-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--foreground)" }} tickMargin={10} />
              <YAxis tick={{ fontSize: 12, fill: "var(--foreground)" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--surface-border)", borderRadius: "8px" }}
                itemStyle={{ fontSize: "14px", fontWeight: "bold" }}
                labelStyle={{ color: "var(--muted)", marginBottom: "4px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", marginTop: "10px" }} />
              <Bar dataKey="Дивиденды" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Купоны" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="mt-8 mb-4 text-xs font-medium tracking-[0.15em] text-muted uppercase">
        История выплат (Фактическая)
      </h2>

      {groupedByMonth.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-surface-border p-8 text-center">
          <p className="text-sm text-muted">Нет данных о дивидендах, купонах или налогах.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedByMonth.map((group) => (
            <div key={group.label}>
              <h3 className="mb-3 text-sm font-semibold capitalize text-foreground">{group.label}</h3>
              <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface">
                <table className="w-full text-xs">
                  <tbody>
                    {group.transactions.map((tx, i) => (
                      <tr
                        key={tx.id}
                        className={
                          "border-b border-surface-border last:border-0 " +
                          (i % 2 === 0 ? "bg-surface/50" : "bg-transparent")
                        }
                      >
                        <td className="px-4 py-3 text-foreground whitespace-nowrap w-[100px]">
                          {formatDateTime(tx.executedAt).split(",")[0]}
                        </td>
                        <td className="px-4 py-3 text-muted w-[120px]">
                          {TRANSACTION_TYPE_LABELS[tx.type]}
                        </td>
                        <td className="px-4 py-3 text-foreground font-mono">
                          {tx.assetTicker || <span className="text-muted">—</span>}
                          {tx.assetName && (
                            <span className="ml-2 font-sans text-muted truncate max-w-[200px] inline-block align-bottom">
                              {tx.assetName}
                            </span>
                          )}
                        </td>
                        <td
                          className={"px-4 py-3 text-right font-mono font-medium " + (tx.type === "Tax" ? "text-danger" : "text-success")}
                        >
                          {tx.type === "Tax" ? "-" : "+"}
                          {tx.priceAmount.toLocaleString("ru-RU", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {tx.priceCurrency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
