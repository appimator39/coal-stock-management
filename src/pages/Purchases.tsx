import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
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
    if (po) {
      setQuantity(String(po.quantity));
    }
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
      quantity: qty,
      pricePerTon: selectedPO.pricePerTon,
      totalAmount: qty * selectedPO.pricePerTon,
    };

    savePurchaseRecord(record);

    // Mark PO as fulfilled
    updatePurchaseOrder({ ...selectedPO, status: "fulfilled" });

    setRecords(getPurchaseRecords());
    setDate(undefined);
    setSelectedPoId("");
    setQuantity("");
    toast.success("Purchase recorded against " + selectedPO.poNumber);
  };

  const handleDelete = (id: string) => {
    // Revert PO status back to pending
    const record = records.find((r) => r.id === id);
    if (record) {
      const po = getPurchaseOrders().find((p) => p.id === record.poId);
      if (po) {
        updatePurchaseOrder({ ...po, status: "pending" });
      }
    }
    deletePurchaseRecord(id);
    setRecords(getPurchaseRecords());
    toast.success("Record deleted, PO reverted to pending");
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">Coal Purchases</h1>

      <div className="bg-card rounded-xl border p-5 mb-6">
        <h2 className="font-heading font-semibold mb-4">Record Purchase (from PO)</h2>
        {pendingPOs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No pending Purchase Orders. Please <a href="/purchase-orders" className="text-primary underline">create a Purchase Order</a> first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Purchase Order</Label>
              <Select value={selectedPoId} onValueChange={handlePoChange}>
                <SelectTrigger className="mt-1">
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
              <Label>Receipt Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !date && "text-muted-foreground")}>
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
              <Label>Quantity Received (tons)</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <Button onClick={handleAdd} className="mt-1">
              <Plus className="w-4 h-4 mr-1" /> Record Purchase
            </Button>
          </div>
        )}
        {selectedPO && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <p><span className="text-muted-foreground">Vendor:</span> <strong>{getVendorName(selectedPO.vendorId)}</strong></p>
            <p><span className="text-muted-foreground">Price/Ton:</span> <strong>PKR {selectedPO.pricePerTon}</strong></p>
            <p><span className="text-muted-foreground">PO Quantity:</span> <strong>{selectedPO.quantity} tons</strong></p>
            <p><span className="text-muted-foreground">Total Amount:</span> <strong>PKR {selectedPO.totalAmount.toLocaleString()}</strong></p>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold mb-4">Purchase History</h2>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm">No purchases yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">PO #</th>
                  <th className="pb-2 font-medium">Vendor</th>
                  <th className="pb-2 font-medium">Qty (tons)</th>
                  <th className="pb-2 font-medium">Price/Ton (PKR)</th>
                  <th className="pb-2 font-medium">Total (PKR)</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5">{r.date}</td>
                    <td className="py-2.5 font-mono text-xs">{r.poNumber}</td>
                    <td className="py-2.5">{r.vendor}</td>
                    <td className="py-2.5">{r.quantity}</td>
                    <td className="py-2.5">PKR {r.pricePerTon}</td>
                    <td className="py-2.5">PKR {r.totalAmount.toLocaleString()}</td>
                    <td className="py-2.5">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
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
  );
}
