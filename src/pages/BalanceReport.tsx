import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  getDailyRecords,
  getPurchaseRecords,
  getOpeningBalance,
  setOpeningBalance,
  flattenDailyItems,
} from "@/lib/store";
import {
  Package,
  TrendingDown,
  TrendingUp,
  Scale,
  BarChart3,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useStoreTick } from "@/hooks/useStore";
import { downloadCSV } from "@/lib/csv";

export default function BalanceReport() {
  useStoreTick();
  const opening = getOpeningBalance();
  const [openingInput, setOpeningInput] = useState(String(opening));

  useEffect(() => {
    setOpeningInput(String(opening));
  }, [opening]);

  const daily = getDailyRecords();
  const purchases = getPurchaseRecords();
  const flatItems = useMemo(() => flattenDailyItems(daily), [daily]);

  const summary = useMemo(() => {
    const totalPurchased = purchases.reduce((s, r) => s + r.quantity, 0);
    const totalConsumed = daily.reduce((s, r) => s + r.totalCoal, 0);
    const closing = opening + totalPurchased - totalConsumed;
    return { totalPurchased, totalConsumed, closing };
  }, [daily, purchases, opening]);

  const handleSaveOpening = async () => {
    const val = parseFloat(openingInput);
    if (isNaN(val)) {
      toast.error("Enter a valid number");
      return;
    }
    try {
      await setOpeningBalance(val);
      toast.success("Opening balance updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    }
  };

  const dateEntries = useMemo(() => {
    const map = new Map<string, { purchased: number; consumed: number }>();
    purchases.forEach((p) => {
      const e = map.get(p.date) || { purchased: 0, consumed: 0 };
      e.purchased += p.quantity;
      map.set(p.date, e);
    });
    daily.forEach((d) => {
      const e = map.get(d.date) || { purchased: 0, consumed: 0 };
      e.consumed += d.totalCoal;
      map.set(d.date, e);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let running = opening;
    return sorted.map(([date, { purchased, consumed }]) => {
      running += purchased - consumed;
      return { date, purchased, consumed, balance: running };
    });
  }, [daily, purchases, opening]);

  const itemBalances = useMemo(() => {
    const map = new Map<string, { purchased: number; consumed: number }>();
    purchases.forEach((p) => {
      const item = p.item || "Unspecified";
      const e = map.get(item) || { purchased: 0, consumed: 0 };
      e.purchased += p.quantity;
      map.set(item, e);
    });
    flatItems.forEach((d) => {
      const item = d.itemName || "Unspecified";
      const e = map.get(item) || { purchased: 0, consumed: 0 };
      e.consumed += d.quantity;
      map.set(item, e);
    });
    return Array.from(map.entries())
      .map(([item, { purchased, consumed }]) => ({
        item,
        purchased,
        consumed,
        balance: purchased - consumed,
      }))
      .sort((a, b) => a.item.localeCompare(b.item));
  }, [flatItems, purchases]);

  const exportItemBalances = () => {
    if (itemBalances.length === 0) return;
    downloadCSV(
      `item-balance-${new Date().toISOString().slice(0, 10)}.csv`,
      itemBalances.map((ib) => ({
        Item: ib.item,
        "Purchased (tons)": ib.purchased.toFixed(2),
        "Consumed (tons)": ib.consumed.toFixed(2),
        "In Stock (tons)": ib.balance.toFixed(2),
      })),
    );
    toast.success("Item balance exported");
  };

  const exportDateBalances = () => {
    if (dateEntries.length === 0) return;
    downloadCSV(
      `date-balance-${new Date().toISOString().slice(0, 10)}.csv`,
      dateEntries.map((e) => ({
        Date: e.date,
        "Purchased (tons)": e.purchased,
        "Consumed (tons)": e.consumed,
        "Running Balance (tons)": e.balance.toFixed(2),
      })),
    );
    toast.success("Date-wise balance exported");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Balance Report</h1>
        <p className="page-subtitle">Track coal inventory with running balance calculations</p>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm">Opening Balance</h2>
        </div>
        <div className="form-section-body">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="max-w-xs">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Coal in stock (tons)
              </Label>
              <Input
                type="number"
                value={openingInput}
                onChange={(e) => setOpeningInput(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleSaveOpening}>Save Balance</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Opening Balance" value={opening.toFixed(1)} unit="tons" icon={Package} />
        <StatCard
          title="Total Purchased"
          value={summary.totalPurchased.toFixed(1)}
          unit="tons"
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Total Consumed"
          value={summary.totalConsumed.toFixed(1)}
          unit="tons"
          icon={TrendingDown}
          variant="primary"
        />
        <StatCard
          title="Closing Balance"
          value={summary.closing.toFixed(1)}
          unit="tons"
          icon={Scale}
          variant={summary.closing < 0 ? "warning" : "default"}
        />
      </div>

      {dateEntries.length > 1 && (
        <div className="content-card mb-6">
          <div className="content-card-header">
            <h2 className="font-heading font-semibold text-sm">Running Balance Trend</h2>
            <span className="text-xs text-muted-foreground">{dateEntries.length} data points</span>
          </div>
          <div className="content-card-body">
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dateEntries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <ReTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Running Balance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchased"
                    name="Purchased"
                    stroke="hsl(var(--success))"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="consumed"
                    name="Consumed"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {itemBalances.length > 0 && (
        <div className="content-card mb-6">
          <div className="content-card-header">
            <h2 className="font-heading font-semibold text-sm">Item-wise Coal Balance</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={exportItemBalances}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
              </Button>
              <span className="text-xs text-muted-foreground">{itemBalances.length} items</span>
            </div>
          </div>
          <div className="content-card-body p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Coal Item</th>
                    <th>Purchased (tons)</th>
                    <th>Consumed (tons)</th>
                    <th>In Stock (tons)</th>
                  </tr>
                </thead>
                <tbody>
                  {itemBalances.map((ib) => (
                    <tr key={ib.item}>
                      <td className="font-medium">{ib.item}</td>
                      <td className="text-success font-medium">+{ib.purchased.toFixed(1)}</td>
                      <td className="text-primary font-medium">-{ib.consumed.toFixed(1)}</td>
                      <td
                        className={cn("font-bold", ib.balance < 0 ? "text-destructive" : "text-foreground")}
                      >
                        {ib.balance.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="font-bold">Total</td>
                    <td className="font-bold text-success">
                      +{itemBalances.reduce((s, i) => s + i.purchased, 0).toFixed(1)}
                    </td>
                    <td className="font-bold text-primary">
                      -{itemBalances.reduce((s, i) => s + i.consumed, 0).toFixed(1)}
                    </td>
                    <td
                      className={cn(
                        "font-bold",
                        summary.closing < 0 ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {itemBalances.reduce((s, i) => s + i.balance, 0).toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Date-wise Balance</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={exportDateBalances}
              disabled={dateEntries.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
            </Button>
            <span className="text-xs text-muted-foreground">{dateEntries.length} entries</span>
          </div>
        </div>
        <div className="content-card-body p-0">
          {dateEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No data available</p>
              <p className="empty-state-text">
                Add daily log entries and purchases to see the running balance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Purchased (tons)</th>
                    <th>Consumed (tons)</th>
                    <th>Running Balance (tons)</th>
                  </tr>
                </thead>
                <tbody>
                  {dateEntries.map((e) => (
                    <tr key={e.date}>
                      <td className="font-medium">{e.date}</td>
                      <td className="text-success font-medium">
                        {e.purchased > 0 ? `+${e.purchased}` : "—"}
                      </td>
                      <td className="text-primary font-medium">
                        {e.consumed > 0 ? `-${e.consumed}` : "—"}
                      </td>
                      <td
                        className={cn("font-bold", e.balance < 0 ? "text-destructive" : "text-foreground")}
                      >
                        {e.balance.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        For backup &amp; reset actions, open the{" "}
        <a href="/settings" className="text-primary underline">
          Settings page
        </a>
        .
      </p>
    </div>
  );
}
