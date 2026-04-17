import { Flame, CloudCog, Wallet, Package, CalendarDays, ArrowRight, Calendar, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { getDailyRecords, getPurchaseRecords, getOpeningBalance, flattenDailyItems } from "@/lib/store";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useStoreTick } from "@/hooks/useStore";

const CHART_COLORS = ["hsl(24, 100%, 50%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(213, 85%, 55%)", "hsl(280, 70%, 55%)", "hsl(0, 84%, 60%)"];

export default function Dashboard() {
  useStoreTick();
  const daily = getDailyRecords();
  const purchases = getPurchaseRecords();
  const opening = getOpeningBalance();
  const flatItems = useMemo(() => flattenDailyItems(daily), [daily]);

  const last14DaysConsumption = useMemo(() => {
    const days: Array<{ date: string; consumed: number; steam: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const dayRecs = daily.filter((r) => r.date === d);
      days.push({
        date: format(subDays(new Date(), i), "dd MMM"),
        consumed: dayRecs.reduce((s, r) => s + r.totalCoal, 0),
        steam: dayRecs.reduce((s, r) => s + r.steamProduced, 0),
      });
    }
    return days;
  }, [daily]);

  const consumptionByItem = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((i) => {
      map.set(i.itemName, (map.get(i.itemName) ?? 0) + i.quantity);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [flatItems]);

  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");

  const stats = useMemo(() => {
    const totalConsumed = daily.reduce((s, r) => s + r.totalCoal, 0);
    const totalSteam = daily.reduce((s, r) => s + r.steamProduced, 0);
    const totalCost = daily.reduce((s, r) => s + r.totalCost, 0);
    const totalPurchased = purchases.reduce((s, r) => s + r.quantity, 0);
    const balance = opening + totalPurchased - totalConsumed;
    return { totalConsumed, totalSteam, totalCost, totalPurchased, balance };
  }, [daily, purchases, opening]);

  const todayStats = useMemo(() => {
    const todayDaily = daily.filter((r) => r.date === today);
    const todayPurchases = purchases.filter((p) => p.date === today);
    return {
      consumed: todayDaily.reduce((s, r) => s + r.totalCoal, 0),
      steam: todayDaily.reduce((s, r) => s + r.steamProduced, 0),
      purchased: todayPurchases.reduce((s, r) => s + r.quantity, 0),
    };
  }, [daily, purchases, today]);

  const monthStats = useMemo(() => {
    const monthDaily = daily.filter((r) => r.date.startsWith(currentMonth));
    const monthPurchases = purchases.filter((p) => p.date.startsWith(currentMonth));
    return {
      consumed: monthDaily.reduce((s, r) => s + r.totalCoal, 0),
      steam: monthDaily.reduce((s, r) => s + r.steamProduced, 0),
      purchased: monthPurchases.reduce((s, r) => s + r.quantity, 0),
    };
  }, [daily, purchases, currentMonth]);

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
      .map(([item, { purchased, consumed }]) => ({ item, purchased, consumed, balance: purchased - consumed }))
      .sort((a, b) => a.item.localeCompare(b.item));
  }, [flatItems, purchases]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of coal consumption and production metrics</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Coal Consumed" value={stats.totalConsumed.toFixed(1)} unit="tons" icon={Flame} variant="primary" />
        <StatCard title="Total Steam Produced" value={stats.totalSteam.toFixed(1)} unit="tons" icon={CloudCog} variant="success" />
        <StatCard title="Total Cost" value={`Rs ${stats.totalCost.toFixed(2)}`} icon={Wallet} variant="warning" />
        <StatCard title="Coal Balance" value={stats.balance.toFixed(1)} unit="tons" icon={Package} />
      </div>

      {/* Today & Monthly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Today ({format(new Date(), "dd MMM yyyy")})
            </h2>
          </div>
          <div className="content-card-body">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Consumed</p>
                <p className="text-xl font-heading font-bold text-primary">{todayStats.consumed.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">tons</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Steam</p>
                <p className="text-xl font-heading font-bold text-success">{todayStats.steam.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">tons</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Purchased</p>
                <p className="text-xl font-heading font-bold text-warning">{todayStats.purchased.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">tons</p>
              </div>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-header">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" /> This Month ({format(new Date(), "MMMM yyyy")})
            </h2>
          </div>
          <div className="content-card-body">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Consumed</p>
                <p className="text-xl font-heading font-bold text-primary">{monthStats.consumed.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">tons</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Steam</p>
                <p className="text-xl font-heading font-bold text-success">{monthStats.steam.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">tons</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Purchased</p>
                <p className="text-xl font-heading font-bold text-warning">{monthStats.purchased.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">tons</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {daily.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="content-card lg:col-span-2">
            <div className="content-card-header">
              <h2 className="font-heading font-semibold text-sm">Consumption & Steam — Last 14 Days</h2>
            </div>
            <div className="content-card-body">
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last14DaysConsumption}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} />
                    <ReTooltip />
                    <Legend />
                    <Bar dataKey="consumed" name="Coal (t)" fill="hsl(var(--primary))" />
                    <Bar dataKey="steam" name="Steam (t)" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="font-heading font-semibold text-sm">Consumption by Item</h2>
            </div>
            <div className="content-card-body">
              {consumptionByItem.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No consumption data yet.
                </p>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={consumptionByItem}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {consumptionByItem.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                      <td className={cn("font-bold", ib.balance < 0 ? "text-destructive" : "text-foreground")}>{ib.balance.toFixed(1)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="font-bold">Total</td>
                    <td className="font-bold text-success">{itemBalances.reduce((s, i) => s + i.purchased, 0).toFixed(1)}</td>
                    <td className="font-bold text-primary">{itemBalances.reduce((s, i) => s + i.consumed, 0).toFixed(1)}</td>
                    <td className={cn("font-bold", stats.balance < 0 ? "text-destructive" : "text-foreground")}>{itemBalances.reduce((s, i) => s + i.balance, 0).toFixed(1)}</td>
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
              <div className="empty-state-icon"><CalendarDays className="w-5 h-5 text-muted-foreground" /></div>
              <p className="empty-state-title">No entries yet</p>
              <p className="empty-state-text">Start tracking by adding records in the Daily Log.</p>
              <Link to="/daily-log" className="mt-4"><Button size="sm">Go to Daily Log</Button></Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Coal (tons)</th>
                    <th>Steam (tons)</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.slice(-5).reverse().map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.date}</td>
                      <td>
                        {r.items.map((item, idx) => (
                          <span key={idx} className="text-xs">
                            {item.itemName}{idx < r.items.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </td>
                      <td>{r.totalCoal}</td>
                      <td>{r.steamProduced}</td>
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
