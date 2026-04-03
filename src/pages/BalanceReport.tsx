import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getDailyRecords, getPurchaseRecords, getOpeningBalance, setOpeningBalance } from "@/lib/store";
import { Package, TrendingDown, TrendingUp, Scale } from "lucide-react";
import StatCard from "@/components/StatCard";
import { toast } from "sonner";

export default function BalanceReport() {
  const [opening, setOpening] = useState(getOpeningBalance());
  const [openingInput, setOpeningInput] = useState(String(opening));
  const daily = getDailyRecords();
  const purchases = getPurchaseRecords();

  const summary = useMemo(() => {
    const totalPurchased = purchases.reduce((s, r) => s + r.quantity, 0);
    const totalConsumed = daily.reduce((s, r) => s + r.coalConsumed, 0);
    const closing = opening + totalPurchased - totalConsumed;
    return { totalPurchased, totalConsumed, closing };
  }, [daily, purchases, opening]);

  const handleSaveOpening = () => {
    const val = parseFloat(openingInput);
    if (isNaN(val)) {
      toast.error("Enter a valid number");
      return;
    }
    setOpeningBalance(val);
    setOpening(val);
    toast.success("Opening balance updated");
  };

  // Build date-wise running balance
  const dateEntries = useMemo(() => {
    const map = new Map<string, { purchased: number; consumed: number }>();
    purchases.forEach((p) => {
      const e = map.get(p.date) || { purchased: 0, consumed: 0 };
      e.purchased += p.quantity;
      map.set(p.date, e);
    });
    daily.forEach((d) => {
      const e = map.get(d.date) || { purchased: 0, consumed: 0 };
      e.consumed += d.coalConsumed;
      map.set(d.date, e);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let running = opening;
    return sorted.map(([date, { purchased, consumed }]) => {
      running += purchased - consumed;
      return { date, purchased, consumed, balance: running };
    });
  }, [daily, purchases, opening]);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">Balance Report</h1>

      <div className="bg-card rounded-xl border p-5 mb-6">
        <h2 className="font-heading font-semibold mb-3">Opening Balance</h2>
        <div className="flex items-end gap-3">
          <div>
            <Label>Coal in stock (tons)</Label>
            <Input type="number" value={openingInput} onChange={(e) => setOpeningInput(e.target.value)} className="mt-1 w-48" />
          </div>
          <Button onClick={handleSaveOpening}>Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Opening Balance" value={opening.toFixed(1)} unit="tons" icon={Package} />
        <StatCard title="Total Purchased" value={summary.totalPurchased.toFixed(1)} unit="tons" icon={TrendingUp} variant="success" />
        <StatCard title="Total Consumed" value={summary.totalConsumed.toFixed(1)} unit="tons" icon={TrendingDown} variant="primary" />
        <StatCard title="Closing Balance" value={summary.closing.toFixed(1)} unit="tons" icon={Scale} variant={summary.closing < 0 ? "warning" : "default"} />
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold mb-4">Date-wise Balance</h2>
        {dateEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Purchased (tons)</th>
                  <th className="pb-2 font-medium">Consumed (tons)</th>
                  <th className="pb-2 font-medium">Running Balance (tons)</th>
                </tr>
              </thead>
              <tbody>
                {dateEntries.map((e) => (
                  <tr key={e.date} className="border-b last:border-0">
                    <td className="py-2.5">{e.date}</td>
                    <td className="py-2.5 text-success">{e.purchased > 0 ? `+${e.purchased}` : "—"}</td>
                    <td className="py-2.5 text-primary">{e.consumed > 0 ? `-${e.consumed}` : "—"}</td>
                    <td className={`py-2.5 font-semibold ${e.balance < 0 ? "text-destructive" : ""}`}>{e.balance.toFixed(1)}</td>
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
