import { Flame, CloudCog, IndianRupee, Package } from "lucide-react";
import StatCard from "@/components/StatCard";
import { getDailyRecords, getPurchaseRecords, getOpeningBalance } from "@/lib/store";
import { useMemo } from "react";

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

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Coal Consumed" value={stats.totalConsumed.toFixed(1)} unit="tons" icon={Flame} variant="primary" />
        <StatCard title="Steam Produced" value={stats.totalSteam.toFixed(1)} unit="tons" icon={CloudCog} variant="success" />
        <StatCard title="Total Cost" value={`Rs ${stats.totalCost.toLocaleString()}`} icon={IndianRupee} variant="warning" />
        <StatCard title="Coal Balance" value={stats.balance.toFixed(1)} unit="tons" icon={Package} />
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold mb-4">Recent Daily Entries</h2>
        {daily.length === 0 ? (
          <p className="text-muted-foreground text-sm">No entries yet. Add records in the Daily Log.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Coal (tons)</th>
                  <th className="pb-2 font-medium">Steam (tons)</th>
                  <th className="pb-2 font-medium">Cost/Ton</th>
                  <th className="pb-2 font-medium">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {daily.slice(-5).reverse().map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5">{r.date}</td>
                    <td className="py-2.5">{r.coalConsumed}</td>
                    <td className="py-2.5">{r.steamProduced}</td>
                    <td className="py-2.5">Rs {r.costPerTon}</td>
                    <td className="py-2.5">Rs {r.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
