"use client";

import { useMemo, useState } from "react";
import { formatDateTime, type TransactionDto } from "@/lib/api";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface PayoutCalendarProps {
  transactions: TransactionDto[];
}

const MONTH_NAMES = [
  "янв.", "фев.", "март", "апр.", "май", "июнь",
  "июль", "авг.", "сент.", "окт.", "нояб.", "дек."
];
const FULL_MONTH_NAMES = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
];

export function PayoutCalendar({ transactions }: PayoutCalendarProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Текущий год");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  
  // Extract all relevant income transactions
  const allIncomeTxs = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "Dividend" || tx.type === "Coupon" || tx.type === "Tax")
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
  }, [transactions]);

  // Determine available years for dropdown
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allIncomeTxs.forEach((tx) => years.add(new Date(tx.executedAt).getFullYear()));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [allIncomeTxs]);

  // Filter transactions based on selected period
  const filteredTxs = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return allIncomeTxs.filter((tx) => {
      const year = new Date(tx.executedAt).getFullYear();
      if (selectedPeriod === "Текущий год") return year === currentYear;
      if (selectedPeriod === "На год вперед") return true; // simplified for now
      return year.toString() === selectedPeriod;
    });
  }, [allIncomeTxs, selectedPeriod]);

  // Group and calculate stats
  const { totalAmount, groupedByMonth, chartData, avgPerMonth } = useMemo(() => {
    let total = 0;
    const groups: Record<string, { monthDate: Date, total: number, txs: TransactionDto[] }> = {};

    filteredTxs.forEach((tx) => {
      const isTax = tx.type === "Tax";
      const amount = isTax ? -tx.priceAmount : tx.priceAmount;
      total += amount;

      const date = new Date(tx.executedAt);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;

      if (!groups[key]) {
        groups[key] = {
          monthDate: new Date(year, month, 1),
          total: 0,
          txs: []
        };
      }
      groups[key].total += amount;
      groups[key].txs.push(tx);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const groupedList = sortedGroupKeys.map((key) => {
      const g = groups[key];
      const monthName = FULL_MONTH_NAMES[g.monthDate.getMonth()];
      const yearStr = g.monthDate.getFullYear().toString().slice(-2);
      return {
        label: `${monthName} ${yearStr}`,
        total: g.total,
        transactions: g.txs
      };
    });

    // Chart data (12 months of the selected year)
    let chartYear = new Date().getFullYear();
    if (selectedPeriod !== "Текущий год" && selectedPeriod !== "На год вперед") {
      chartYear = parseInt(selectedPeriod);
    }
    
    const chart = [];
    for (let i = 0; i < 12; i++) {
      const key = `${chartYear}-${String(i + 1).padStart(2, "0")}`;
      chart.push({
        name: MONTH_NAMES[i],
        Выплачены: groups[key] ? groups[key].total : 0,
      });
    }

    const avg = total / 12;

    return { totalAmount: total, groupedByMonth: groupedList, chartData: chart, avgPerMonth: avg };
  }, [filteredTxs, selectedPeriod]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-[family-name:var(--font-display)] font-semibold text-foreground">
            Календарь выплат
          </h1>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-surface border border-surface-border hover:border-accent rounded-full px-4 py-1.5 text-sm font-medium text-foreground transition-colors outline-none cursor-pointer appearance-none pr-8 relative"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238b949e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.2em" }}
          >
            <option>На год вперед</option>
            <option>Текущий год</option>
            {availableYears.map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 group cursor-pointer">
            <span className="text-muted group-hover:text-foreground transition-colors text-sm">Статус</span>
            <span className="text-xs text-muted">▼</span>
          </div>
          <div className="flex items-center gap-2 group cursor-pointer">
            <span className="text-muted group-hover:text-foreground transition-colors text-sm">Тип выплаты</span>
            <span className="text-xs text-muted">▼</span>
          </div>
          <div className="text-muted hover:text-foreground cursor-pointer tracking-widest leading-none pb-2">...</div>
        </div>
      </div>

      {/* Main Stats + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        
        {/* Left Card: Summary */}
        <div className="bg-[#1E2329] border border-surface-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="text-center mt-2">
            <p className="text-sm font-medium text-muted flex items-center justify-center gap-1">
              Всего за год <span className="text-[10px] w-4 h-4 rounded-full border border-muted inline-flex items-center justify-center">?</span>
            </p>
            <p className="text-3xl font-[family-name:var(--font-display)] font-semibold mt-2 text-foreground tracking-tight">
              {totalAmount.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
            </p>
          </div>
          
          <div className="space-y-4 mt-10">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted flex items-center gap-2">
                <span className="text-[#3b82f6]">📊</span> В месяц
              </span>
              <span className="font-medium text-foreground">{avgPerMonth.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted flex items-center gap-2">
                <span className="text-[#0ea5e9]">☀️</span> В день
              </span>
              <span className="font-medium text-foreground">{(avgPerMonth / 30).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted flex items-center gap-2">
                <span className="text-[#8b5cf6]">⏱️</span> Ожидает получения
              </span>
              <span className="font-medium text-foreground">0,00 ₽</span>
            </div>
          </div>
        </div>

        {/* Right Card: Chart */}
        <div className="bg-[#1E2329] border border-surface-border rounded-2xl p-6 relative shadow-sm min-h-[300px] flex flex-col">
          <div className="flex-1 w-full h-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8b949e" }} tickLine={false} axisLine={false} dy={10} />
                {chartData.some(d => d.Выплачены > 0) && (
                  <ReferenceLine y={avgPerMonth} stroke="#0ea5e9" strokeDasharray="3 3" label={{ position: 'right', value: 'средн.', fill: '#0ea5e9', fontSize: 10 }} />
                )}
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ backgroundColor: "#2A2F35", borderColor: "#414853", borderRadius: "8px", color: "#fff" }}
                  itemStyle={{ fontSize: "14px", fontWeight: "bold" }}
                  formatter={(val: any) => [`${Number(val).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, "Выплачены"]}
                />
                <Bar dataKey="Выплачены" fill="#9D4EDD" radius={[4, 4, 4, 4]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="absolute bottom-6 right-6 flex items-center bg-[#2A2F35] rounded-lg p-1">
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "calendar" ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
              onClick={() => setViewMode("calendar")}
            >
              📅 Календарь
            </button>
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "list" ? "bg-white text-black shadow" : "text-muted hover:text-foreground"}`}
              onClick={() => setViewMode("list")}
            >
              ≡ Список
            </button>
          </div>
          
          <div className="absolute bottom-6 left-6 flex items-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[#0ea5e9]"></span> Объявлены</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[#3b82f6]"></span> Прогноз</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[#f59e0b]"></span> Погашения/амортизация</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[#9D4EDD]"></span> Выплачены</span>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex flex-col gap-8 mt-6">
          {groupedByMonth.length === 0 ? (
            <div className="text-center py-12 text-muted">Нет выплат за выбранный период</div>
          ) : (
            groupedByMonth.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold capitalize text-foreground">{group.label}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${group.total >= 0 ? "bg-success/20 text-success" : "bg-danger/20 text-danger"}`}>
                    {group.total >= 0 ? "+" : ""}{group.total.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                  </span>
                </div>
                
                <div className="flex flex-col gap-2">
                  {group.transactions.map((tx) => {
                    const isTax = tx.type === "Tax";
                    const isCoupon = tx.type === "Coupon";
                    const amount = isTax ? -tx.priceAmount : tx.priceAmount;
                    const dateStr = formatDateTime(tx.executedAt).split(",")[0];
                    // Example format: "10 янв. 26"
                    const dateObj = new Date(tx.executedAt);
                    const formattedDate = `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear().toString().slice(-2)}`;

                    return (
                      <div key={tx.id} className="bg-[#1E2329] border border-surface-border rounded-xl p-4 flex items-center justify-between hover:bg-[#232930] transition-colors cursor-pointer group">
                        
                        {/* Asset Info */}
                        <div className="flex items-center gap-4 w-[250px]">
                          <div className="w-10 h-10 rounded bg-white text-black font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                            {tx.assetTicker ? tx.assetTicker.substring(0, 4) : "TAX"}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-medium text-foreground truncate">{tx.assetName || (isTax ? "Налог" : "Неизвестный актив")}</span>
                            <span className="text-xs text-muted truncate">{tx.assetTicker || "—"}</span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex flex-col w-[150px]">
                          <span className="text-sm font-medium text-foreground">{formattedDate}</span>
                          <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isTax ? "bg-danger" : "bg-[#9D4EDD]"}`}></span>
                            {isTax ? "Удержан" : "Получены"} {formattedDate}
                          </span>
                        </div>

                        {/* Amount */}
                        <div className="flex flex-col w-[120px] text-right">
                          <span className={`text-sm font-semibold ${isTax ? "text-danger" : "text-foreground"}`}>
                            {amount.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                          </span>
                          {!isTax && (
                            <span className="text-xs text-muted mt-0.5">
                              {/* Fake quantity display for visual likeness to screenshot */}
                              1 × {amount.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
                            </span>
                          )}
                        </div>

                        {/* Frequency / Yield (Stubbed as we don't have this data) */}
                        <div className="hidden md:flex flex-col w-[120px] items-center text-center">
                          <span className="text-xs text-muted flex items-center gap-1">
                            <span className="text-lg leading-none">...</span> {isCoupon ? "Купон" : isTax ? "Налог" : "Дивиденд"}
                          </span>
                        </div>

                        {/* Status (Right side) */}
                        <div className="flex flex-col items-end w-[120px] pr-2">
                          <span className="text-sm font-medium text-foreground">{formattedDate}</span>
                          <span className="text-xs text-muted mt-0.5 border-b border-dashed border-muted cursor-help">
                            {isTax ? "Дата удержания" : "Дата выплаты"}
                          </span>
                        </div>

                        {/* Checkmark */}
                        <div className="text-muted group-hover:text-foreground transition-colors ml-4">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === "calendar" && (
        <div className="mt-6 p-12 text-center border border-dashed border-surface-border rounded-xl">
          <p className="text-muted">Режим календаря в разработке 📅</p>
        </div>
      )}
    </div>
  );
}
