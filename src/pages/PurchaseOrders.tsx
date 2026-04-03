import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, CheckCircle2 } from "lucide-react";
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
  const [quantity, setQuantity] = useState("");
  const [pricePerTon, setPricePerTon] = useState("");

  const generatePONumber = () => {
    const count = getPurchaseOrders().length + 1;
    return `PO-${String(count).padStart(4, "0")}`;
  };

  const handleAdd = () => {
    if (!date || !vendorId || !quantity || !pricePerTon) {
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
      quantity: qty,
      pricePerTon: price,
      totalAmount: qty * price,
      status: "pending",
    };
    savePurchaseOrder(po);
    setOrders(getPurchaseOrders());
    setDate(undefined);
    setVendorId("");
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
              <Label>Quantity (tons)</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label>Price/Ton (PKR)</Label>
              <Input type="number" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <Button onClick={handleAdd} className="mt-1">
              <Plus className="w-4 h-4 mr-1" /> Create PO
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold mb-4">Purchase Orders</h2>
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-sm">No purchase orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">PO #</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Vendor</th>
                  <th className="pb-2 font-medium">Qty (tons)</th>
                  <th className="pb-2 font-medium">Price/Ton (PKR)</th>
                  <th className="pb-2 font-medium">Total (PKR)</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {[...orders].reverse().map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2.5 font-mono text-xs">{o.poNumber}</td>
                    <td className="py-2.5">{o.date}</td>
                    <td className="py-2.5">{getVendorName(o.vendorId)}</td>
                    <td className="py-2.5">{o.quantity}</td>
                    <td className="py-2.5">PKR {o.pricePerTon}</td>
                    <td className="py-2.5">PKR {o.totalAmount.toLocaleString()}</td>
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
