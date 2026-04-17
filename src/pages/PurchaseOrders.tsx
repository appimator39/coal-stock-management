import { useState, useMemo } from "react";
import { format, parse, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, Plus, Trash2, CheckCircle2, Download, ClipboardList, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getPurchaseOrders, savePurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, getPurchaseRecords, getVendors, getItems, nextPoNumber } from "@/lib/store";
import { PurchaseOrder } from "@/lib/types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import PODetailModal from "@/components/PODetailModal";
import { useStoreTick } from "@/hooks/useStore";
import { Search } from "lucide-react";

export default function PurchaseOrders() {
  useStoreTick();
  const orders = getPurchaseOrders();
  const vendors = getVendors();
  const availableItems = getItems();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [date, setDate] = useState<Date>();
  const [vendorId, setVendorId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerTon, setPricePerTon] = useState("");

  const [exportFrom, setExportFrom] = useState<Date>();
  const [exportTo, setExportTo] = useState<Date>();
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Edit dialog state
  const [editPO, setEditPO] = useState<PurchaseOrder | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editVendorId, setEditVendorId] = useState("");
  const [editItemId, setEditItemId] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPricePerTon, setEditPricePerTon] = useState("");

  const handleAdd = async () => {
    if (!date || !vendorId || !itemId || !quantity || !pricePerTon) {
      toast.error("Please fill all fields");
      return;
    }
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerTon);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) {
      toast.error("Please enter valid positive numbers");
      return;
    }
    const selectedItem = availableItems.find((i) => i.id === itemId);
    try {
      const po: PurchaseOrder = {
        id: crypto.randomUUID(),
        poNumber: await nextPoNumber(),
        date: format(date, "yyyy-MM-dd"),
        vendorId,
        item: selectedItem?.name || "",
        quantity: qty,
        pricePerTon: price,
        totalAmount: qty * price,
        status: "pending",
      };
      await savePurchaseOrder(po);
      setDate(undefined);
      setVendorId("");
      setItemId("");
      setQuantity("");
      setPricePerTon("");
      toast.success(`Purchase Order ${po.poNumber} created`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create PO");
    }
  };

  const getReceivedQty = (poId: string) =>
    getPurchaseRecords()
      .filter((r) => r.poId === poId)
      .reduce((sum, r) => sum + r.quantity, 0);

  const handleStartEdit = (po: PurchaseOrder) => {
    setEditPO(po);
    setEditDate(parse(po.date, "yyyy-MM-dd", new Date()));
    setEditVendorId(po.vendorId);
    const matchedItem = availableItems.find((i) => i.name === po.item);
    setEditItemId(matchedItem?.id || "");
    setEditQuantity(String(po.quantity));
    setEditPricePerTon(String(po.pricePerTon));
  };

  const handleSaveEdit = async () => {
    if (!editDate || !editVendorId || !editItemId || !editQuantity || !editPricePerTon) {
      toast.error("Please fill all fields"); return;
    }
    const qty = parseFloat(editQuantity);
    const price = parseFloat(editPricePerTon);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) {
      toast.error("Please enter valid numbers"); return;
    }
    const received = getReceivedQty(editPO!.id);
    if (qty < received) {
      toast.error(`Quantity cannot be less than received (${received}t)`);
      return;
    }
    const selectedItem = availableItems.find((i) => i.id === editItemId);
    try {
      await updatePurchaseOrder({
        ...editPO!,
        date: format(editDate, "yyyy-MM-dd"),
        vendorId: editVendorId,
        item: selectedItem?.name || "",
        quantity: qty,
        pricePerTon: price,
        totalAmount: qty * price,
      });
      setEditPO(null);
      toast.success("Purchase Order updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update PO");
    }
  };

  const handleDelete = async (id: string) => {
    const po = orders.find((o) => o.id === id);
    if (po?.status === "fulfilled" || po?.status === "partial") {
      toast.error("Cannot delete a PO that has purchases recorded against it");
      return;
    }
    try {
      await deletePurchaseOrder(id);
      toast.success("Purchase Order deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete PO");
    }
  };

  const getVendorName = (vid: string) => vendors.find((v) => v.id === vid)?.name || "Unknown";

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (exportFrom || exportTo) {
      list = list.filter((o) => {
        const d = parse(o.date, "yyyy-MM-dd", new Date());
        if (exportFrom && exportTo) return isWithinInterval(d, { start: startOfDay(exportFrom), end: endOfDay(exportTo) });
        if (exportFrom) return d >= startOfDay(exportFrom);
        if (exportTo) return d <= endOfDay(exportTo);
        return true;
      });
    }
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.poNumber.toLowerCase().includes(q) ||
        (o.item || "").toLowerCase().includes(q) ||
        getVendorName(o.vendorId).toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, exportFrom, exportTo, statusFilter, search, vendors]);

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
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PO, vendor, item…"
                className="h-8 pl-7 pr-3 w-56 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filteredOrders.length} / {orders.length}</span>
          </div>
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
                    <th>Ordered</th>
                    <th>Received</th>
                    <th>Remaining</th>
                    <th>Price/Ton (Rs)</th>
                    <th>Total (Rs)</th>
                    <th>Status</th>
                    <th className="w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredOrders].reverse().map((o) => {
                    const received = getReceivedQty(o.id);
                    const remaining = o.quantity - received;
                    return (
                      <tr key={o.id}>
                        <td className="font-mono text-xs font-medium">{o.poNumber}</td>
                        <td>{o.date}</td>
                        <td className="font-medium">{getVendorName(o.vendorId)}</td>
                        <td>{o.item || "—"}</td>
                        <td>{o.quantity}</td>
                        <td>{received > 0 ? received : <span className="text-muted-foreground">—</span>}</td>
                        <td>
                          {o.status === "fulfilled" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={remaining < o.quantity ? "text-amber-500 font-medium" : ""}>{remaining}</span>
                          )}
                        </td>
                        <td>Rs {o.pricePerTon}</td>
                        <td className="font-medium">Rs {o.totalAmount.toLocaleString()}</td>
                        <td>
                          {o.status === "fulfilled" && (
                            <Badge variant="default" className="text-[10px]">
                              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fulfilled</span>
                            </Badge>
                          )}
                          {o.status === "partial" && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500">
                              Partial
                            </Badge>
                          )}
                          {o.status === "pending" && (
                            <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8" title="View Details"
                              onClick={() => { setSelectedPO(o); setModalOpen(true); }}
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            {o.status === "pending" && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => handleStartEdit(o)}>
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(o.id)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <PODetailModal
        po={selectedPO}
        open={modalOpen}
        onOpenChange={setModalOpen}
        vendorName={selectedPO ? getVendorName(selectedPO.vendorId) : ""}
      />

      {/* Edit PO Dialog */}
      <Dialog open={!!editPO} onOpenChange={(open) => !open && setEditPO(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Purchase Order — {editPO?.poNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor</Label>
                <Select value={editVendorId} onValueChange={setEditVendorId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</Label>
              <Select value={editItemId} onValueChange={setEditItemId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {availableItems.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity (tons)</Label>
                <Input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} className="mt-1.5" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price/Ton (Rs)</Label>
                <Input type="number" value={editPricePerTon} onChange={(e) => setEditPricePerTon(e.target.value)} className="mt-1.5" placeholder="0.00" />
              </div>
            </div>
            {editQuantity && editPricePerTon && !isNaN(parseFloat(editQuantity)) && !isNaN(parseFloat(editPricePerTon)) && (
              <div className="rounded-lg bg-muted/50 border border-border/50 p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</span>
                <span className="font-heading font-bold">Rs {(parseFloat(editQuantity) * parseFloat(editPricePerTon)).toLocaleString()}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPO(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
