import { Flame, CloudCog, Wallet, Package, CalendarDays, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { getDailyRecords, getPurchaseRecords, getOpeningBalance } from "@/lib/store";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const daily = getDailyRecords();
  const purchases = getPurchaseRecords();
  const opening = getOpeningBalance();

  const stats = useMemo(() => {
    const totalConsumed = daily.reduce((s, r) => s + r.coalConsumed, 0);
    const totalSteam = daily.reduce((s, r) => s + r.steamProduced, 0);
    const totalCost = daily.reduce((s, r) => s + r.totalCost, 0);
    const totalPurchased = purchases.reduce((s, r) => s + r.quantity, 0);
    const balance = opening + totalPurchased - totalConsumed;
    return { totalConsumed, totalSteam, totalCost, totalPurchased, balance };
  }, [daily, purchases, opening]);

  // Item-wise balance breakdown
  const itemBalances = useMemo(() => {
    const map = new Map<string, { purchased: number; consumed: number }>();
    purchases.forEach((p) => {
      const item = p.item || "Unspecified";
      const e = map.get(item) || { purchased: 0, consumed: 0 };
      e.purchased += p.quantity;
      map.set(item, e);
    });
    daily.forEach((d) => {
      const item = d.item || "Unspecified";
      const e = map.get(item) || { purchased: 0, consumed: 0 };
      e.consumed += d.coalConsumed;
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
  }, [daily, purchases]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of coal consumption and production metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Coal Consumed" value={stats.totalConsumed.toFixed(1)} unit="tons" icon={Flame} variant="primary" />
        <StatCard title="Steam Produced" value={stats.totalSteam.toFixed(1)} unit="tons" icon={CloudCog} variant="success" />
        <StatCard title="Total Cost" value={`Rs ${stats.totalCost.toLocaleString()}`} icon={Wallet} variant="warning" />
        <StatCard title="Coal Balance" value={stats.balance.toFixed(1)} unit="tons" icon={Package} />
      </div>

      {/* Item-wise Stock Breakdown */}
      {itemBalances.length > 0 && (
        <div className="content-card mb-8">
          <div className="content-card-header">
            <h2 className="font-heading font-semibold text-sm">Coal Stock by Item</h2>
            <span className="text-xs text-muted-foreground">{itemBalances.length} items</span>
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
                      <td className="text-success font-medium">{ib.purchased.toFixed(1)}</td>
                      <td className="text-primary font-medium">{ib.consumed.toFixed(1)}</td>
                      <td className={cn("font-bold", ib.balance < 0 ? "text-destructive" : "text-foreground")}>
                        {ib.balance.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="font-bold">Total</td>
                    <td className="font-bold text-success">{itemBalances.reduce((s, i) => s + i.purchased, 0).toFixed(1)}</td>
                    <td className="font-bold text-primary">{itemBalances.reduce((s, i) => s + i.consumed, 0).toFixed(1)}</td>
                    <td className={cn("font-bold", stats.balance < 0 ? "text-destructive" : "text-foreground")}>
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
          <h2 className="font-heading font-semibold text-sm">Recent Daily Entries</h2>
          <Link to="/daily-log">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="content-card-body p-0">
          {daily.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No entries yet</p>
              <p className="empty-state-text">Start tracking by adding records in the Daily Log.</p>
              <Link to="/daily-log" className="mt-4">
                <Button size="sm">Go to Daily Log</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Coal (tons)</th>
                    <th>Steam (tons)</th>
                    <th>Cost/Ton</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.slice(-5).reverse().map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.date}</td>
                      <td>{r.item || "—"}</td>
                      <td>{r.coalConsumed}</td>
                      <td>{r.steamProduced}</td>
                      <td>Rs {r.costPerTon.toFixed(2)}</td>
                      <td className="font-medium">Rs {r.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
