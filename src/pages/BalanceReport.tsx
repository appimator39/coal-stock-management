import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getDailyRecords, getPurchaseRecords, getOpeningBalance, setOpeningBalance, resetAllData } from "@/lib/store";
import { Package, TrendingDown, TrendingUp, Scale, BarChart3, AlertTriangle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coal in stock (tons)</Label>
              <Input type="number" value={openingInput} onChange={(e) => setOpeningInput(e.target.value)} className="mt-1.5" />
            </div>
            <Button onClick={handleSaveOpening}>Save Balance</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Opening Balance" value={opening.toFixed(1)} unit="tons" icon={Package} />
        <StatCard title="Total Purchased" value={summary.totalPurchased.toFixed(1)} unit="tons" icon={TrendingUp} variant="success" />
        <StatCard title="Total Consumed" value={summary.totalConsumed.toFixed(1)} unit="tons" icon={TrendingDown} variant="primary" />
        <StatCard title="Closing Balance" value={summary.closing.toFixed(1)} unit="tons" icon={Scale} variant={summary.closing < 0 ? "warning" : "default"} />
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Date-wise Balance</h2>
          <span className="text-xs text-muted-foreground">{dateEntries.length} entries</span>
        </div>
        <div className="content-card-body p-0">
          {dateEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No data available</p>
              <p className="empty-state-text">Add daily log entries and purchases to see the running balance.</p>
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
                      <td className="text-success font-medium">{e.purchased > 0 ? `+${e.purchased}` : "—"}</td>
                      <td className="text-primary font-medium">{e.consumed > 0 ? `-${e.consumed}` : "—"}</td>
                      <td className={cn("font-bold", e.balance < 0 ? "text-destructive" : "text-foreground")}>{e.balance.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reset Section */}
      <div className="content-card mt-6">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm text-destructive">Danger Zone</h2>
        </div>
        <div className="content-card-body">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Reset All Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently delete all records — daily logs, purchases, vendors, items, purchase orders, and balance. This cannot be undone.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all data including daily logs, purchase orders, purchases, vendors, items, and opening balance. There is no way to recover this data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      resetAllData();
                      toast.success("All data has been reset");
                      window.location.reload();
                    }}
                  >
                    Yes, Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
