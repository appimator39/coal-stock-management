import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVendors, saveVendor, deleteVendor } from "@/lib/store";
import { Vendor } from "@/lib/types";
import { toast } from "sonner";

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>(getVendors());
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Please enter a vendor name");
      return;
    }
    if (vendors.some((v) => v.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error("Vendor already exists");
      return;
    }
    const vendor: Vendor = { id: crypto.randomUUID(), name: name.trim() };
    saveVendor(vendor);
    setVendors(getVendors());
    setName("");
    toast.success("Vendor added");
  };

  const handleDelete = (id: string) => {
    deleteVendor(id);
    setVendors(getVendors());
    toast.success("Vendor deleted");
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">Vendors</h1>

      <div className="bg-card rounded-xl border p-5 mb-6">
        <h2 className="font-heading font-semibold mb-4">Add New Vendor</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>Vendor Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="Enter vendor name"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Vendor
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold mb-4">Vendor List</h2>
        {vendors.length === 0 ? (
          <p className="text-muted-foreground text-sm">No vendors yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {vendors.map((v) => (
              <div key={v.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <span className="font-medium">{v.name}</span>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
