import { useState, useMemo } from "react";
import { format, parse, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, Plus, Trash2, CheckCircle2, Download, ClipboardList, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getPurchaseOrders, savePurchaseOrder, deletePurchaseOrder, getVendors, getItems } from "@/lib/store";
import { PurchaseOrder } from "@/lib/types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import PODetailModal from "@/components/PODetailModal";

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(getPurchaseOrders());
  const vendors = getVendors();
  const availableItems = getItems();
  const [date, setDate] = useState<Date>();
  const [vendorId, setVendorId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerTon, setPricePerTon] = useState("");

  const [exportFrom, setExportFrom] = useState<Date>();
  const [exportTo, setExportTo] = useState<Date>();
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const generatePONumber = () => {
    const count = getPurchaseOrders().length + 1;
    return `PO-${String(count).padStart(4, "0")}`;
  };

  const handleAdd = () => {
    if (!date || !vendorId || !itemId || !quantity || !pricePerTon) {
      toast.error("Please fill all fields");
      return;
    }
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerTon);
    if (isNaN(qty) || isNaN(price)) {
      toast.error("Please enter valid numbers");
      return;
    }
    const selectedItem = availableItems.find((i) => i.id === itemId);
    const po: PurchaseOrder = {
      id: crypto.randomUUID(),
      poNumber: generatePONumber(),
      date: format(date, "yyyy-MM-dd"),
      vendorId,
      item: selectedItem?.name || "",
      quantity: qty,
      pricePerTon: price,
      totalAmount: qty * price,
      status: "pending",
    };
    savePurchaseOrder(po);
    setOrders(getPurchaseOrders());
    setDate(undefined);
    setVendorId("");
    setItemId("");
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
      <div className="page-header">
        <h1 className="page-title">Purchase Orders</h1>
        <p className="page-subtitle">Create and manage purchase orders for coal procurement</p>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm">Create New Purchase Order</h2>
        </div>
        <div className="form-section-body">
          {vendors.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">
                <ClipboardList className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No vendors available</p>
              <p className="empty-state-text">
                Please <a href="/vendors" className="text-primary underline font-medium">add vendors</a> first to create purchase orders.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</Label>
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
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor</Label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger className="mt-1.5">
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
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</Label>
                  {availableItems.length === 0 ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      No items. <a href="/items" className="text-primary underline">Add items</a> first.
                    </p>
                  ) : (
                    <Select value={itemId} onValueChange={setItemId}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity (tons)</Label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1.5" placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price/Ton (Rs)</Label>
                  <Input type="number" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} className="mt-1.5" placeholder="0.00" />
                </div>
                <Button onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" /> Create PO
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="content-card mb-6">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Export Orders</h2>
        </div>
        <div className="content-card-body">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1.5 min-w-[180px]", !exportFrom && "text-muted-foreground")}>
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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1.5 min-w-[180px]", !exportTo && "text-muted-foreground")}>
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
              <Button variant="ghost" size="sm" onClick={() => { setExportFrom(undefined); setExportTo(undefined); }}>
                Clear
              </Button>
            )}
            <Button onClick={handleExportCSV} variant="secondary">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <span className="text-xs text-muted-foreground self-center">{filteredOrders.length} order(s)</span>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">All Purchase Orders</h2>
          <span className="text-xs text-muted-foreground">{filteredOrders.length} orders</span>
        </div>
        <div className="content-card-body p-0">
          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <ClipboardList className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No purchase orders found</p>
              <p className="empty-state-text">Create your first purchase order using the form above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Date</th>
                    <th>Vendor</th>
                    <th>Item</th>
                    <th>Qty (tons)</th>
                    <th>Price/Ton (Rs)</th>
                    <th>Total (Rs)</th>
                    <th>Status</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredOrders].reverse().map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs font-medium">{o.poNumber}</td>
                      <td>{o.date}</td>
                      <td className="font-medium">{getVendorName(o.vendorId)}</td>
                      <td>{o.item || "—"}</td>
                      <td>{o.quantity}</td>
                      <td>Rs {o.pricePerTon}</td>
                      <td className="font-medium">Rs {o.totalAmount.toLocaleString()}</td>
                      <td>
                        <Badge variant={o.status === "fulfilled" ? "default" : "secondary"} className="text-[10px]">
                          {o.status === "fulfilled" ? (
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fulfilled</span>
                          ) : "Pending"}
                        </Badge>
                      </td>
                      <td>
                        {o.status === "pending" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(o.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
    </div>
  );
}
