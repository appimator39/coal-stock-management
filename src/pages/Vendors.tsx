import { useState } from "react";
import { Plus, Trash2, Pencil, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVendors, saveVendor, updateVendor, deleteVendor } from "@/lib/store";
import { Vendor } from "@/lib/types";
import { toast } from "sonner";

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>(getVendors());
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) { toast.error("Please enter a vendor name"); return; }
    if (vendors.some((v) => v.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error("Vendor already exists"); return;
    }
    const vendor: Vendor = { id: crypto.randomUUID(), name: name.trim() };
    saveVendor(vendor);
    setVendors(getVendors());
    setName("");
    toast.success("Vendor added");
  };

  const handleStartEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setEditName(vendor.name);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) { toast.error("Vendor name cannot be empty"); return; }
    if (vendors.some((v) => v.id !== editingId && v.name.toLowerCase() === editName.trim().toLowerCase())) {
      toast.error("Vendor name already exists"); return;
    }
    updateVendor({ id: editingId!, name: editName.trim() });
    setVendors(getVendors());
    setEditingId(null);
    setEditName("");
    toast.success("Vendor updated");
  };

  const handleCancelEdit = () => { setEditingId(null); setEditName(""); };

  const handleDelete = (id: string) => {
    deleteVendor(id);
    setVendors(getVendors());
    toast.success("Vendor deleted");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Vendors</h1>
        <p className="page-subtitle">Manage your coal suppliers and vendors</p>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm">Add New Vendor</h2>
        </div>
        <div className="form-section-body">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 max-w-md">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
                placeholder="Enter vendor name"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Vendor
            </Button>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Vendor List</h2>
          <span className="text-xs text-muted-foreground">{vendors.length} vendors</span>
        </div>
        <div className="content-card-body p-0">
          {vendors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users className="w-5 h-5 text-muted-foreground" /></div>
              <p className="empty-state-title">No vendors yet</p>
              <p className="empty-state-text">Add your first vendor using the form above to start creating purchase orders.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {vendors.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                  {editingId === v.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="max-w-sm h-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={handleSaveEdit}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{v.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-sm">{v.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(v)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
