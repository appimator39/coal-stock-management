import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getPurchaseRecords, savePurchaseRecord, deletePurchaseRecord, getPurchaseOrders, updatePurchaseOrder, getVendors } from "@/lib/store";
import { PurchaseRecord } from "@/lib/types";
import { toast } from "sonner";

export default function Purchases() {
  const [records, setRecords] = useState<PurchaseRecord[]>(getPurchaseRecords());
  const [date, setDate] = useState<Date>();
  const [selectedPoId, setSelectedPoId] = useState("");
  const [quantity, setQuantity] = useState("");

  const pendingPOs = getPurchaseOrders().filter((po) => po.status === "pending");
  const vendors = getVendors();

  const selectedPO = pendingPOs.find((po) => po.id === selectedPoId);

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId);
    const po = pendingPOs.find((p) => p.id === poId);
    if (po) setQuantity(String(po.quantity));
  };

  const getVendorName = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.name || "Unknown";

  const handleAdd = () => {
    if (!date || !selectedPoId || !quantity) {
      toast.error("Please fill all fields");
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!selectedPO) {
      toast.error("Invalid purchase order");
      return;
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
    };
    savePurchaseRecord(record);
    updatePurchaseOrder({ ...selectedPO, status: "fulfilled" });
    setRecords(getPurchaseRecords());
    setDate(undefined);
    setSelectedPoId("");
    setQuantity("");
    toast.success("Purchase recorded against " + selectedPO.poNumber);
  };

  const handleDelete = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (record) {
      const po = getPurchaseOrders().find((p) => p.id === record.poId);
      if (po) updatePurchaseOrder({ ...po, status: "pending" });
    }
    deletePurchaseRecord(id);
    setRecords(getPurchaseRecords());
    toast.success("Record deleted, PO reverted to pending");
  };

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
          {pendingPOs.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No pending Purchase Orders</p>
              <p className="empty-state-text">
                Please <a href="/purchase-orders" className="text-primary underline font-medium">create a Purchase Order</a> first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Purchase Order</Label>
                  <Select value={selectedPoId} onValueChange={handlePoChange}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select PO" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingPOs.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.poNumber} — {getVendorName(po.vendorId)} ({po.quantity} tons)
                        </SelectItem>
                      ))}
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
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity Received (tons)</Label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1.5" placeholder="0.00" />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Record Purchase
              </Button>
            </div>
          )}

          {selectedPO && (
            <div className="mt-5 p-4 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">PO Details</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Vendor</span>
                  <p className="font-semibold mt-0.5">{getVendorName(selectedPO.vendorId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Item</span>
                  <p className="font-semibold mt-0.5">{selectedPO.item || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Price/Ton</span>
                  <p className="font-semibold mt-0.5">Rs {selectedPO.pricePerTon}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Total Amount</span>
                  <p className="font-semibold mt-0.5">Rs {selectedPO.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Purchase History</h2>
          <span className="text-xs text-muted-foreground">{records.length} purchases</span>
        </div>
        <div className="content-card-body p-0">
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              </div>
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
                    <th>Qty (tons)</th>
                    <th>Price/Ton (Rs)</th>
                    <th>Total (Rs)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.date}</td>
                      <td className="font-mono text-xs">{r.poNumber}</td>
                      <td className="font-medium">{r.vendor}</td>
                      <td>{r.quantity}</td>
                      <td>Rs {r.pricePerTon}</td>
                      <td className="font-medium">Rs {r.totalAmount.toLocaleString()}</td>
                      <td>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </td>
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
