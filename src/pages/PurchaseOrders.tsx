import { useState, useMemo } from "react";
import { format, parse, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, Plus, Trash2, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getPurchaseOrders, savePurchaseOrder, deletePurchaseOrder, getVendors } from "@/lib/store";
import { PurchaseOrder } from "@/lib/types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(getPurchaseOrders());
  const vendors = getVendors();
  const [date, setDate] = useState<Date>();
  const [vendorId, setVendorId] = useState("");
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerTon, setPricePerTon] = useState("");

  // Export filters
  const [exportFrom, setExportFrom] = useState<Date>();
  const [exportTo, setExportTo] = useState<Date>();

  const generatePONumber = () => {
    const count = getPurchaseOrders().length + 1;
    return `PO-${String(count).padStart(4, "0")}`;
  };

  const handleAdd = () => {
    if (!date || !vendorId || !item.trim() || !quantity || !pricePerTon) {
      toast.error("Please fill all fields");
      return;
    }
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerTon);
    if (isNaN(qty) || isNaN(price)) {
      toast.error("Please enter valid numbers");
      return;
    }
    const po: PurchaseOrder = {
      id: crypto.randomUUID(),
      poNumber: generatePONumber(),
      date: format(date, "yyyy-MM-dd"),
      vendorId,
      item: item.trim(),
      quantity: qty,
      pricePerTon: price,
      totalAmount: qty * price,
      status: "pending",
    };
    savePurchaseOrder(po);
    setOrders(getPurchaseOrders());
    setDate(undefined);
    setVendorId("");
    setItem("");
    setQuantity("");
    setPricePerTon("");
    toast.success(`Purchase Order ${po.poNumber} created`);
  };

  const handleDelete = (id: string) => {
    const po = orders.find((o) => o.id === id);
    if (po?.status === "fulfilled") {
      toast.error("Cannot delete a fulfilled PO");
      return;
    }
    deletePurchaseOrder(id);
    setOrders(getPurchaseOrders());
    toast.success("Purchase Order deleted");
  };

  const getVendorName = (vid: string) => vendors.find((v) => v.id === vid)?.name || "Unknown";

  const filteredOrders = useMemo(() => {
    if (!exportFrom && !exportTo) return orders;
    return orders.filter((o) => {
      const d = parse(o.date, "yyyy-MM-dd", new Date());
      if (exportFrom && exportTo) return isWithinInterval(d, { start: startOfDay(exportFrom), end: endOfDay(exportTo) });
      if (exportFrom) return d >= startOfDay(exportFrom);
      if (exportTo) return d <= endOfDay(exportTo);
      return true;
    });
  }, [orders, exportFrom, exportTo]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }
    const headers = ["PO #", "Date", "Vendor", "Item", "Qty (tons)", "Price/Ton (Rs)", "Total (Rs)", "Status"];
    const rows = filteredOrders.map((o) => [
      o.poNumber, o.date, getVendorName(o.vendorId), o.item || "", o.quantity, o.pricePerTon, o.totalAmount, o.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">Purchase Orders</h1>

      <div className="bg-card rounded-xl border p-5 mb-6">
        <h2 className="font-heading font-semibold mb-4">Create New Purchase Order</h2>
        {vendors.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No vendors found. Please <a href="/vendors" className="text-primary underline">add vendors</a> first.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Date</Label>
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
                <Label>Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Item</Label>
                <Input value={item} onChange={(e) => setItem(e.target.value)} className="mt-1" placeholder="e.g. Bituminous Coal" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                <Label>Quantity (tons)</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1" placeholder="0" />
              </div>
              <div>
                <Label>Price/Ton (Rs)</Label>
                <Input type="number" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} className="mt-1" placeholder="0" />
              </div>
              <Button onClick={handleAdd} className="mt-1">
                <Plus className="w-4 h-4 mr-1" /> Create PO
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-card rounded-xl border p-5 mb-6">
        <h2 className="font-heading font-semibold mb-4">Export Orders</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label>From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 min-w-[180px]", !exportFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exportFrom ? format(exportFrom, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={exportFrom} onSelect={setExportFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 min-w-[180px]", !exportTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exportTo ? format(exportTo, "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={exportTo} onSelect={setExportTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          {(exportFrom || exportTo) && (
            <Button variant="ghost" onClick={() => { setExportFrom(undefined); setExportTo(undefined); }}>
              Clear
            </Button>
          )}
          <Button onClick={handleExportCSV} variant="secondary">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <span className="text-sm text-muted-foreground">{filteredOrders.length} order(s)</span>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold mb-4">Purchase Orders</h2>
        {filteredOrders.length === 0 ? (
          <p className="text-muted-foreground text-sm">No purchase orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">PO #</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Vendor</th>
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Qty (tons)</th>
                  <th className="pb-2 font-medium">Price/Ton (Rs)</th>
                  <th className="pb-2 font-medium">Total (Rs)</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {[...filteredOrders].reverse().map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2.5 font-mono text-xs">{o.poNumber}</td>
                    <td className="py-2.5">{o.date}</td>
                    <td className="py-2.5">{getVendorName(o.vendorId)}</td>
                    <td className="py-2.5">{o.item || "—"}</td>
                    <td className="py-2.5">{o.quantity}</td>
                    <td className="py-2.5">Rs {o.pricePerTon}</td>
                    <td className="py-2.5">Rs {o.totalAmount.toLocaleString()}</td>
                    <td className="py-2.5">
                      <Badge variant={o.status === "fulfilled" ? "default" : "secondary"}>
                        {o.status === "fulfilled" ? (
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fulfilled</span>
                        ) : "Pending"}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      {o.status === "pending" && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
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
