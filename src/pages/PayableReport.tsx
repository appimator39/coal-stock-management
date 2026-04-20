import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Scale, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getPayments, getPurchaseRecords, getVendors } from "@/lib/store";
import { toast } from "sonner";
import { useStoreTick } from "@/hooks/useStore";
import { downloadCSV } from "@/lib/csv";

interface VendorRow {
  vendorId: string;
  vendor: string;
  purchased: number;
  paid: number;
  balance: number;
}

export default function PayableReport() {
  useStoreTick();
  const vendors = getVendors();
  const purchaseRecords = getPurchaseRecords();
  const payments = getPayments();

  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();

  const fromStr = fromDate ? format(fromDate, "yyyy-MM-dd") : "";
  const toStr = toDate ? format(toDate, "yyyy-MM-dd") : "";

  const withinRange = (dateStr?: string): boolean => {
    if (!dateStr) return !fromStr && !toStr; // missing date only matches when no filter set
    if (fromStr && dateStr < fromStr) return false;
    if (toStr && dateStr > toStr) return false;
    return true;
  };

  const rows = useMemo<VendorRow[]>(() => {
    // Seed a row for every vendor so zero-activity vendors still appear when
    // the report has no filter, but hidden when the totals are both zero.
    const byId = new Map<string, VendorRow>();
    vendors.forEach((v) => {
      byId.set(v.id, { vendorId: v.id, vendor: v.name, purchased: 0, paid: 0, balance: 0 });
    });

    purchaseRecords.forEach((r) => {
      if (!withinRange(r.date)) return;
      // Purchase records store vendor name (denormalized); resolve to id via lookup.
      const v = vendors.find((vv) => vv.name === r.vendor);
      if (!v) return;
      const row = byId.get(v.id)!;
      row.purchased += r.totalAmount;
    });

    payments.forEach((p) => {
      if (!withinRange(p.chequeDate)) return;
      const row = byId.get(p.vendorId);
      if (!row) return;
      row.paid += p.amount;
    });

    const result = Array.from(byId.values()).map((r) => ({
      ...r,
      balance: r.purchased - r.paid,
    }));

    // Hide vendors with no activity in the filter window.
    return result
      .filter((r) => r.purchased !== 0 || r.paid !== 0)
      .sort((a, b) => b.balance - a.balance);
  }, [vendors, purchaseRecords, payments, fromStr, toStr]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.purchased += r.purchased;
        acc.paid += r.paid;
        acc.balance += r.balance;
        return acc;
      },
      { purchased: 0, paid: 0, balance: 0 },
    );
  }, [rows]);

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("No rows to export");
      return;
    }
    downloadCSV(
      `payable-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        Vendor: r.vendor,
        "Purchased (Rs)": r.purchased.toFixed(2),
        "Paid (Rs)": r.paid.toFixed(2),
        "Balance Payable (Rs)": r.balance.toFixed(2),
      })),
    );
    toast.success("Payable report exported");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payable Report</h1>
        <p className="page-subtitle">
          Vendor-wise outstanding balance based on purchases and payments
        </p>
      </div>

      <div className="content-card mb-6">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Filters</h2>
        </div>
        <div className="content-card-body">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                From Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1.5 min-w-[180px]",
                      !fromDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                To Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1.5 min-w-[180px]",
                      !toDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate(undefined);
                  setToDate(undefined);
                }}
              >
                Clear
              </Button>
            )}
            <Button onClick={handleExportCSV} variant="secondary">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Range filters purchase dates and cheque dates. Vendors with no activity in the window are hidden.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="content-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Total Purchased
            </span>
          </div>
          <p className="font-heading font-bold text-xl">Rs {totals.purchased.toLocaleString()}</p>
        </div>
        <div className="content-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Total Paid
            </span>
          </div>
          <p className="font-heading font-bold text-xl">Rs {totals.paid.toLocaleString()}</p>
        </div>
        <div className="content-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Balance Payable
            </span>
          </div>
          <p
            className={cn(
              "font-heading font-bold text-xl",
              totals.balance > 0 ? "text-amber-500" : totals.balance < 0 ? "text-success" : "",
            )}
          >
            Rs {totals.balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Vendor Balances</h2>
          <span className="text-xs text-muted-foreground">{rows.length} vendor(s)</span>
        </div>
        <div className="content-card-body p-0">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Scale className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No vendor activity in this window</p>
              <p className="empty-state-text">Adjust the date filters or record purchases and payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th className="text-right">Purchased (Rs)</th>
                    <th className="text-right">Paid (Rs)</th>
                    <th className="text-right">Balance Payable (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.vendorId}>
                      <td className="font-medium">{r.vendor}</td>
                      <td className="text-right">Rs {r.purchased.toLocaleString()}</td>
                      <td className="text-right">Rs {r.paid.toLocaleString()}</td>
                      <td
                        className={cn(
                          "text-right font-semibold",
                          r.balance > 0 ? "text-amber-500" : r.balance < 0 ? "text-success" : "",
                        )}
                      >
                        Rs {r.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t border-border/60">
                    <td>Total</td>
                    <td className="text-right">Rs {totals.purchased.toLocaleString()}</td>
                    <td className="text-right">Rs {totals.paid.toLocaleString()}</td>
                    <td
                      className={cn(
                        "text-right",
                        totals.balance > 0 ? "text-amber-500" : totals.balance < 0 ? "text-success" : "",
                      )}
                    >
                      Rs {totals.balance.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
