import { useMemo, useState } from "react";
import { format, parse } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Trash2,
  Pencil,
  Wallet,
  Download,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getPayments,
  getPurchaseRecords,
  getVendors,
  savePayment,
  updatePayment,
  deletePayment,
} from "@/lib/store";
import { Payment } from "@/lib/types";
import { toast } from "sonner";
import { useStoreTick } from "@/hooks/useStore";
import { downloadCSV } from "@/lib/csv";
import { useAuth } from "@/components/AuthProvider";

export default function Payments() {
  useStoreTick();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const vendors = getVendors();
  const purchaseRecords = getPurchaseRecords();
  const payments = getPayments();

  // Create form state
  const [vendorId, setVendorId] = useState("");
  const [ciNo, setCiNo] = useState("");
  const [amount, setAmount] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeDate, setChequeDate] = useState<Date>();

  // Edit dialog
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editVendorId, setEditVendorId] = useState("");
  const [editCiNo, setEditCiNo] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editChequeNo, setEditChequeNo] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editChequeDate, setEditChequeDate] = useState<Date>();

  const [search, setSearch] = useState("");

  // CI No options are derived from purchase records for the selected vendor.
  const ciOptionsForVendor = (vId: string): string[] => {
    const vendorName = vendors.find((v) => v.id === vId)?.name ?? "";
    const set = new Set<string>();
    purchaseRecords.forEach((r) => {
      if ((r.vendor === vendorName || r.poNumber) && r.vendor === vendorName && r.ciNo) {
        set.add(r.ciNo);
      }
    });
    return Array.from(set).sort();
  };

  const createCiOptions = useMemo(() => ciOptionsForVendor(vendorId), [vendorId, purchaseRecords, vendors]);
  const editCiOptions = useMemo(
    () => ciOptionsForVendor(editVendorId),
    [editVendorId, purchaseRecords, vendors],
  );

  const resetForm = () => {
    setVendorId("");
    setCiNo("");
    setAmount("");
    setChequeNo("");
    setBankName("");
    setChequeDate(undefined);
  };

  const handleAdd = async () => {
    if (!vendorId || !amount) {
      toast.error("Vendor and amount are required");
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }
    const payment: Payment = {
      id: crypto.randomUUID(),
      vendorId,
      ciNo: ciNo.trim() || undefined,
      amount: parseFloat(amt.toFixed(2)),
      chequeNo: chequeNo.trim() || undefined,
      bankName: bankName.trim() || undefined,
      chequeDate: chequeDate ? format(chequeDate, "yyyy-MM-dd") : undefined,
    };
    try {
      await savePayment(payment);
      resetForm();
      toast.success("Payment recorded");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to record payment");
    }
  };

  const handleStartEdit = (p: Payment) => {
    setEditPayment(p);
    setEditVendorId(p.vendorId);
    setEditCiNo(p.ciNo ?? "");
    setEditAmount(String(p.amount));
    setEditChequeNo(p.chequeNo ?? "");
    setEditBankName(p.bankName ?? "");
    setEditChequeDate(p.chequeDate ? parse(p.chequeDate, "yyyy-MM-dd", new Date()) : undefined);
  };

  const handleSaveEdit = async () => {
    if (!editPayment) return;
    if (!editVendorId || !editAmount) {
      toast.error("Vendor and amount are required");
      return;
    }
    const amt = parseFloat(editAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }
    const updated: Payment = {
      ...editPayment,
      vendorId: editVendorId,
      ciNo: editCiNo.trim() || undefined,
      amount: parseFloat(amt.toFixed(2)),
      chequeNo: editChequeNo.trim() || undefined,
      bankName: editBankName.trim() || undefined,
      chequeDate: editChequeDate ? format(editChequeDate, "yyyy-MM-dd") : undefined,
    };
    try {
      await updatePayment(updated);
      setEditPayment(null);
      toast.success("Payment updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update payment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePayment(id);
      toast.success("Payment deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete payment");
    }
  };

  const vendorName = (vId: string) => vendors.find((v) => v.id === vId)?.name ?? "Unknown";

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(
      (p) =>
        (p.vendorName ?? vendorName(p.vendorId)).toLowerCase().includes(q) ||
        (p.ciNo ?? "").toLowerCase().includes(q) ||
        (p.chequeNo ?? "").toLowerCase().includes(q) ||
        (p.bankName ?? "").toLowerCase().includes(q) ||
        (p.chequeDate ?? "").includes(q),
    );
  }, [payments, search, vendors]);

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error("No payments to export");
      return;
    }
    downloadCSV(
      `payments-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredPayments.map((p) => ({
        "Cheque Date": p.chequeDate ?? "",
        Vendor: p.vendorName ?? vendorName(p.vendorId),
        "CI #": p.ciNo ?? "",
        "Cheque #": p.chequeNo ?? "",
        Bank: p.bankName ?? "",
        Amount: p.amount,
      })),
    );
    toast.success("Payments exported");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Record vendor payments against purchase invoices</p>
      </div>

      {isAdmin && (
        <div className="form-section">
          <div className="form-section-header">
            <h2 className="font-heading font-semibold text-sm">Record Payment</h2>
          </div>
          <div className="form-section-body">
            {vendors.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-state-icon">
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="empty-state-title">No vendors available</p>
                <p className="empty-state-text">
                  Please{" "}
                  <a href="/vendors" className="text-primary underline font-medium">
                    add vendors
                  </a>{" "}
                  first.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Vendor
                    </Label>
                    <Select
                      value={vendorId}
                      onValueChange={(v) => {
                        setVendorId(v);
                        setCiNo("");
                      }}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      CI Number
                    </Label>
                    {vendorId && createCiOptions.length > 0 ? (
                      <Select value={ciNo} onValueChange={setCiNo}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select CI #" />
                        </SelectTrigger>
                        <SelectContent>
                          {createCiOptions.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={ciNo}
                        onChange={(e) => setCiNo(e.target.value)}
                        className="mt-1.5"
                        placeholder={vendorId ? "Type CI # (none recorded yet)" : "Select vendor first"}
                        disabled={!vendorId}
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Paid Amount (Rs)
                    </Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1.5"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cheque Number
                    </Label>
                    <Input
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                      className="mt-1.5"
                      placeholder="e.g. 001234"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Bank Name
                    </Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="mt-1.5"
                      placeholder="e.g. HBL"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cheque Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1.5",
                            !chequeDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {chequeDate ? format(chequeDate, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={chequeDate}
                          onSelect={setChequeDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button onClick={handleAdd} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> Record Payment
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Payment History</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-7 pr-3 w-56 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
            </Button>
            <span className="text-xs text-muted-foreground">
              {filteredPayments.length} / {payments.length}
            </span>
          </div>
        </div>
        <div className="content-card-body p-0">
          {filteredPayments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Wallet className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No payments recorded</p>
              <p className="empty-state-text">Record your first payment using the form above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cheque Date</th>
                    <th>Vendor</th>
                    <th>CI #</th>
                    <th>Cheque #</th>
                    <th>Bank</th>
                    <th>Amount (Rs)</th>
                    {isAdmin && <th className="w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.chequeDate ?? "—"}</td>
                      <td className="font-medium">{p.vendorName ?? vendorName(p.vendorId)}</td>
                      <td className="font-mono text-xs">{p.ciNo ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="font-mono text-xs">{p.chequeNo ?? <span className="text-muted-foreground">—</span>}</td>
                      <td>{p.bankName ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="font-medium">Rs {p.amount.toLocaleString()}</td>
                      {isAdmin && (
                        <td>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleStartEdit(p)}
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(p.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editPayment} onOpenChange={(open) => !open && setEditPayment(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Payment</DialogTitle>
          </DialogHeader>
          {editPayment && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Vendor
                  </Label>
                  <Select
                    value={editVendorId}
                    onValueChange={(v) => {
                      setEditVendorId(v);
                      setEditCiNo("");
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    CI Number
                  </Label>
                  {editVendorId && editCiOptions.length > 0 ? (
                    <Select value={editCiNo} onValueChange={setEditCiNo}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select CI #" />
                      </SelectTrigger>
                      <SelectContent>
                        {editCiOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={editCiNo}
                      onChange={(e) => setEditCiNo(e.target.value)}
                      className="mt-1.5"
                      placeholder="CI #"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount (Rs)
                  </Label>
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cheque Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1.5",
                          !editChequeDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editChequeDate ? format(editChequeDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editChequeDate}
                        onSelect={setEditChequeDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cheque Number
                  </Label>
                  <Input
                    value={editChequeNo}
                    onChange={(e) => setEditChequeNo(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bank Name
                  </Label>
                  <Input
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayment(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
