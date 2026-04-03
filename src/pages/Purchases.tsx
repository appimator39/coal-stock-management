import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getPurchaseRecords, savePurchaseRecord, deletePurchaseRecord } from "@/lib/store";
import { PurchaseRecord } from "@/lib/types";
import { toast } from "sonner";

export default function Purchases() {
  const [records, setRecords] = useState<PurchaseRecord[]>(getPurchaseRecords());
  const [date, setDate] = useState<Date>();
  const [vendor, setVendor] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerTon, setPricePerTon] = useState("");

  const handleAdd = () => {
    if (!date || !vendor.trim() || !quantity || !pricePerTon) {
      toast.error("Please fill all fields");
      return;
    }
    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerTon);
    if (isNaN(qty) || isNaN(price)) {
      toast.error("Please enter valid numbers");
      return;
    }
    const record: PurchaseRecord = {
      id: crypto.randomUUID(),
      date: format(date, "yyyy-MM-dd"),
      vendor: vendor.trim(),
      quantity: qty,
      pricePerTon: price,
      totalAmount: qty * price,
    };
    savePurchaseRecord(record);
    setRecords(getPurchaseRecords());
    setDate(undefined);
    setVendor("");
    setQuantity("");
    setPricePerTon("");
    toast.success("Purchase recorded");
  };

  const handleDelete = (id: string) => {
    deletePurchaseRecord(id);
    setRecords(getPurchaseRecords());
    toast.success("Record deleted");
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">Coal Purchases</h1>

      <div className="bg-card rounded-xl border p-5 mb-6">
        <h2 className="font-heading font-semibold mb-4">Record New Purchase</h2>
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
            <Label>Vendor Name</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} className="mt-1" placeholder="Vendor" />
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
            <Plus className="w-4 h-4 mr-1" /> Add Purchase
          </Button>
        </div>
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
                  <th className="pb-2 font-medium">Vendor</th>
                  <th className="pb-2 font-medium">Qty (tons)</th>
                  <th className="pb-2 font-medium">Price/Ton (₹)</th>
                  <th className="pb-2 font-medium">Total (₹)</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5">{r.date}</td>
                    <td className="py-2.5">{r.vendor}</td>
                    <td className="py-2.5">{r.quantity}</td>
                    <td className="py-2.5">₹{r.pricePerTon}</td>
                    <td className="py-2.5">₹{r.totalAmount.toLocaleString()}</td>
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
