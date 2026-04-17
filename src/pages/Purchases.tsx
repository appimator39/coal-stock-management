import { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon, Plus, Trash2, ShoppingCart, Eye, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getPurchaseRecords,
  savePurchaseRecord,
  updatePurchaseRecord,
  deletePurchaseRecord,
  getPurchaseOrders,
  getVendors,
} from "@/lib/store";
import { PurchaseRecord } from "@/lib/types";
import { toast } from "sonner";
import { useStoreTick } from "@/hooks/useStore";
import { downloadCSV } from "@/lib/csv";
import { Download, Search } from "lucide-react";

function getReceivedQty(poId: string, excludeId?: string): number {
  return getPurchaseRecords()
    .filter((r) => r.poId === poId && r.id !== excludeId)
    .reduce((sum, r) => sum + r.quantity, 0);
}

export default function Purchases() {
  useStoreTick();
  const records = getPurchaseRecords();
  const [date, setDate] = useState<Date>();
  const [selectedPoId, setSelectedPoId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [builtyNumber, setBuiltyNumber] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [search, setSearch] = useState("");

  // View dialog
  const [viewRecord, setViewRecord] = useState<PurchaseRecord | null>(null);

  // Edit dialog
  const [editRecord, setEditRecord] = useState<PurchaseRecord | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editQuantity, setEditQuantity] = useState("");
  const [editBuilty, setEditBuilty] = useState("");
  const [editTruck, setEditTruck] = useState("");

  const vendors = getVendors();
  const activePOs = getPurchaseOrders().filter(
    (po) => po.status === "pending" || po.status === "partial"
  );
  const allPOs = getPurchaseOrders();

  const selectedPO = activePOs.find((po) => po.id === selectedPoId);
  const remainingQty = selectedPO
    ? selectedPO.quantity - getReceivedQty(selectedPO.id)
    : 0;
  const receivedQty = selectedPO ? getReceivedQty(selectedPO.id) : 0;

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId);
    const po = activePOs.find((p) => p.id === poId);
    if (po) {
      const remaining = po.quantity - getReceivedQty(po.id);
      setQuantity(String(remaining));
    }
  };

  const getVendorName = (vendorId: string) =>
    vendors.find((v) => v.id === vendorId)?.name || "Unknown";

  const enteredQty = parseFloat(quantity) || 0;
  const exceedsBalance = enteredQty > remainingQty && remainingQty > 0;

  const handleAdd = async () => {
    if (!date || !selectedPoId || !quantity) {
      toast.error("Please fill all required fields"); return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity"); return;
    }
    if (!selectedPO) { toast.error("Invalid purchase order"); return; }
    if (qty > remainingQty) {
      toast.error(`Quantity exceeds PO balance of ${remainingQty} tons`); return;
    }

    const record: PurchaseRecord = {
      id: crypto.randomUUID(),
      date: format(date, "yyyy-MM-dd"),
      poId: selectedPO.id,
      poNumber: selectedPO.poNumber,
      vendor: getVendorName(selectedPO.vendorId),
      item: selectedPO.item || "",
      quantity: qty,
      pricePerTon: selectedPO.pricePerTon,
      totalAmount: qty * selectedPO.pricePerTon,
      builtyNumber: builtyNumber.trim() || undefined,
      truckNumber: truckNumber.trim() || undefined,
    };

    try {
      await savePurchaseRecord(record);
      const newTotal = getReceivedQty(selectedPO.id) + qty;
      setDate(undefined); setSelectedPoId(""); setQuantity("");
      setBuiltyNumber(""); setTruckNumber("");
      const stillRemaining = selectedPO.quantity - newTotal;
      if (stillRemaining <= 0) {
        toast.success(`${selectedPO.poNumber} fully fulfilled`);
      } else {
        toast.success(`Recorded ${qty} tons — ${stillRemaining} tons balance remaining on ${selectedPO.poNumber}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to record purchase");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePurchaseRecord(id);
      toast.success("Record deleted, PO balance restored");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete record");
    }
  };

  // Edit handlers
  const handleStartEdit = (r: PurchaseRecord) => {
    setEditRecord(r);
    setEditDate(parse(r.date, "yyyy-MM-dd", new Date()));
    setEditQuantity(String(r.quantity));
    setEditBuilty(r.builtyNumber || "");
    setEditTruck(r.truckNumber || "");
  };

  const handleSaveEdit = async () => {
    if (!editRecord || !editDate || !editQuantity) {
      toast.error("Please fill all required fields"); return;
    }
    const qty = parseFloat(editQuantity);
    if (isNaN(qty) || qty <= 0) { toast.error("Please enter a valid quantity"); return; }

    const po = allPOs.find((p) => p.id === editRecord.poId);
    if (po) {
      const otherReceived = getReceivedQty(po.id, editRecord.id);
      const maxAllowed = po.quantity - otherReceived;
      if (qty > maxAllowed) {
        toast.error(`Quantity exceeds PO balance of ${maxAllowed} tons`); return;
      }
    }

    const updated: PurchaseRecord = {
      ...editRecord,
      date: format(editDate, "yyyy-MM-dd"),
      quantity: qty,
      totalAmount: qty * editRecord.pricePerTon,
      builtyNumber: editBuilty.trim() || undefined,
      truckNumber: editTruck.trim() || undefined,
    };

    try {
      await updatePurchaseRecord(updated);
      setEditRecord(null);
      toast.success("Purchase record updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update record");
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.poNumber.toLowerCase().includes(q) ||
      r.vendor.toLowerCase().includes(q) ||
      (r.builtyNumber ?? "").toLowerCase().includes(q) ||
      (r.truckNumber ?? "").toLowerCase().includes(q) ||
      (r.item ?? "").toLowerCase().includes(q) ||
      r.date.includes(q)
    );
  });

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }
    downloadCSV(
      `purchases-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredRecords.map((r) => ({
        Date: r.date,
        "PO #": r.poNumber,
        Vendor: r.vendor,
        Item: r.item,
        "Builty #": r.builtyNumber ?? "",
        "Truck #": r.truckNumber ?? "",
        "Qty (tons)": r.quantity,
        "Price/Ton (Rs)": r.pricePerTon,
        "Total (Rs)": r.totalAmount,
      })),
    );
    toast.success("Purchases exported");
  };

  // Edit dialog max allowed qty
  const editMaxQty = editRecord
    ? (() => {
        const po = allPOs.find((p) => p.id === editRecord.poId);
        if (!po) return Infinity;
        return po.quantity - getReceivedQty(po.id, editRecord.id);
      })()
    : Infinity;

  const editPO = editRecord ? allPOs.find((p) => p.id === editRecord.poId) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Coal Purchases</h1>
        <p className="page-subtitle">Record purchases against approved purchase orders</p>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm">Record Purchase (from PO)</h2>
        </div>
        <div className="form-section-body">
          {activePOs.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon"><ShoppingCart className="w-5 h-5 text-muted-foreground" /></div>
              <p className="empty-state-title">No pending Purchase Orders</p>
              <p className="empty-state-text">
                Please{" "}
                <a href="/purchase-orders" className="text-primary underline font-medium">create a Purchase Order</a>{" "}
                first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Purchase Order</Label>
                  <Select value={selectedPoId} onValueChange={handlePoChange}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select PO" /></SelectTrigger>
                    <SelectContent>
                      {activePOs.map((po) => {
                        const rem = po.quantity - getReceivedQty(po.id);
                        return (
                          <SelectItem key={po.id} value={po.id}>
                            {po.poNumber} — {getVendorName(po.vendorId)} ({rem}/{po.quantity} t remaining)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receipt Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1.5", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quantity (tons)
                    {selectedPO && <span className="ml-1.5 normal-case font-normal text-muted-foreground">— balance: {remainingQty} t</span>}
                  </Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={cn("mt-1.5", exceedsBalance && "border-destructive focus-visible:ring-destructive")}
                    placeholder="0.00"
                    max={remainingQty || undefined}
                  />
                  {exceedsBalance && (
                    <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Exceeds PO balance of {remainingQty} tons
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Builty Number</Label>
                  <Input value={builtyNumber} onChange={(e) => setBuiltyNumber(e.target.value)} className="mt-1.5" placeholder="e.g. BLT-20240410" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Truck Number</Label>
                  <Input value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} className="mt-1.5" placeholder="e.g. ABC-1234" />
                </div>
              </div>

              <Button onClick={handleAdd} className="w-full sm:w-auto" disabled={exceedsBalance}>
                <Plus className="w-4 h-4 mr-2" /> Record Purchase
              </Button>
            </div>
          )}

          {/* PO Balance Callout */}
          {selectedPO && (
            <div className="mt-5 rounded-lg border border-border/60 overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PO Balance — {selectedPO.poNumber}</p>
                <span className="text-xs text-muted-foreground">{getVendorName(selectedPO.vendorId)} · {selectedPO.item || "—"} · Rs {selectedPO.pricePerTon}/ton</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ordered</p>
                    <p className="text-xl font-bold mt-0.5">{selectedPO.quantity} <span className="text-xs font-normal text-muted-foreground">tons</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Received</p>
                    <p className="text-xl font-bold mt-0.5">{receivedQty} <span className="text-xs font-normal text-muted-foreground">tons</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Balance</p>
                    <p className={cn("text-xl font-bold mt-0.5", remainingQty > 0 ? "text-amber-500" : "text-muted-foreground")}>
                      {remainingQty} <span className="text-xs font-normal">tons</span>
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min((receivedQty / selectedPO.quantity) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {((receivedQty / selectedPO.quantity) * 100).toFixed(0)}% received
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purchase History Table */}
      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Purchase History</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-7 pr-3 w-48 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
            </Button>
            <span className="text-xs text-muted-foreground">{filteredRecords.length} / {records.length}</span>
          </div>
        </div>
        <div className="content-card-body p-0">
          {filteredRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ShoppingCart className="w-5 h-5 text-muted-foreground" /></div>
              <p className="empty-state-title">No purchases yet</p>
              <p className="empty-state-text">Record your first purchase by selecting a pending PO above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>PO #</th>
                    <th>Vendor</th>
                    <th>Builty #</th>
                    <th>Truck #</th>
                    <th>Qty (tons)</th>
                    <th>Total (Rs)</th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.date}</td>
                      <td className="font-mono text-xs">{r.poNumber}</td>
                      <td className="font-medium">{r.vendor}</td>
                      <td className="font-mono text-xs">{r.builtyNumber || <span className="text-muted-foreground">—</span>}</td>
                      <td className="font-mono text-xs">{r.truckNumber || <span className="text-muted-foreground">—</span>}</td>
                      <td>{r.quantity}</td>
                      <td className="font-medium">Rs {r.totalAmount.toLocaleString()}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewRecord(r)}>
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(r)}>
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Purchase Details</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">PO Number</p>
                  <p className="font-mono font-semibold mt-0.5">{viewRecord.poNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Date</p>
                  <p className="font-semibold mt-0.5">{viewRecord.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Vendor</p>
                  <p className="font-semibold mt-0.5">{viewRecord.vendor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Item</p>
                  <p className="font-semibold mt-0.5">{viewRecord.item || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Builty Number</p>
                  <p className="font-mono font-semibold mt-0.5">{viewRecord.builtyNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Truck Number</p>
                  <p className="font-mono font-semibold mt-0.5">{viewRecord.truckNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Quantity</p>
                  <p className="font-semibold mt-0.5">{viewRecord.quantity} tons</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Price / Ton</p>
                  <p className="font-semibold mt-0.5">Rs {viewRecord.pricePerTon.toLocaleString()}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border/50 p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Amount</span>
                <span className="font-heading font-bold text-lg">Rs {viewRecord.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Purchase Record</DialogTitle>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-4 py-2">
              {/* PO Balance info */}
              {editPO && (
                <div className="rounded-lg bg-muted/40 border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">PO Balance — {editPO.poNumber}</p>
                  <div className="flex gap-6 text-sm">
                    <div><span className="text-muted-foreground text-xs">Ordered: </span><span className="font-semibold">{editPO.quantity} t</span></div>
                    <div><span className="text-muted-foreground text-xs">Others: </span><span className="font-semibold">{editPO.quantity - editMaxQty} t</span></div>
                    <div><span className="text-muted-foreground text-xs">Max allowed: </span><span className="font-semibold text-amber-500">{editMaxQty} t</span></div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1.5", !editDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editDate ? format(editDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={editDate} onSelect={setEditDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quantity (tons)
                    <span className="ml-1 normal-case font-normal text-muted-foreground">max {editMaxQty}</span>
                  </Label>
                  <Input
                    type="number"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className={cn("mt-1.5", parseFloat(editQuantity) > editMaxQty && "border-destructive")}
                    max={editMaxQty}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Builty Number</Label>
                  <Input value={editBuilty} onChange={(e) => setEditBuilty(e.target.value)} className="mt-1.5" placeholder="e.g. BLT-20240410" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Truck Number</Label>
                  <Input value={editTruck} onChange={(e) => setEditTruck(e.target.value)} className="mt-1.5" placeholder="e.g. ABC-1234" />
                </div>
              </div>
              {editQuantity && !isNaN(parseFloat(editQuantity)) && (
                <div className="rounded-lg bg-muted/50 border border-border/50 p-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</span>
                  <span className="font-heading font-bold">Rs {(parseFloat(editQuantity) * editRecord.pricePerTon).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
