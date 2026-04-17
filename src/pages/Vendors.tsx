import { useState } from "react";
import { Plus, Trash2, Pencil, Users, Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getVendors, saveVendor, updateVendor, deleteVendor } from "@/lib/store";
import { Vendor } from "@/lib/types";
import { toast } from "sonner";
import { useStoreTick } from "@/hooks/useStore";

export default function Vendors() {
  useStoreTick();
  const vendors = getVendors();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [editing, setEditing] = useState<Vendor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = vendors.filter((v) =>
    (v.name + " " + (v.phone ?? "") + " " + (v.email ?? "")).toLowerCase().includes(search.toLowerCase()),
  );

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Please enter a vendor name");
      return;
    }
    if (vendors.some((v) => v.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error("Vendor already exists");
      return;
    }
    try {
      await saveVendor({
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      resetForm();
      toast.success("Vendor added");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add vendor");
    }
  };

  const handleStartEdit = (v: Vendor) => {
    setEditing({ ...v });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Vendor name cannot be empty");
      return;
    }
    if (
      vendors.some(
        (v) => v.id !== editing.id && v.name.toLowerCase() === editing.name.trim().toLowerCase(),
      )
    ) {
      toast.error("Vendor name already exists");
      return;
    }
    try {
      await updateVendor({
        ...editing,
        name: editing.name.trim(),
        phone: editing.phone?.trim() || undefined,
        email: editing.email?.trim() || undefined,
        address: editing.address?.trim() || undefined,
        notes: editing.notes?.trim() || undefined,
      });
      setEditing(null);
      toast.success("Vendor updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update vendor");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteVendor(deletingId);
      setDeletingId(null);
      toast.success("Vendor deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete vendor");
      setDeletingId(null);
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vendor Name *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
                placeholder="Enter vendor name"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phone
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5"
                placeholder="+92-300-XXXXXXX"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                placeholder="vendor@example.com"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Address
              </Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5"
                placeholder="City / office address"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notes
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5"
                placeholder="Optional internal notes"
                rows={2}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Vendor
            </Button>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Vendor List</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendors…"
                className="h-8 pl-7 pr-3 w-56 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground">{filtered.length} / {vendors.length}</span>
          </div>
        </div>
        <div className="content-card-body p-0">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">{vendors.length === 0 ? "No vendors yet" : "No matches"}</p>
              <p className="empty-state-text">
                {vendors.length === 0
                  ? "Add your first vendor using the form above to start creating purchase orders."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {v.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{v.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[v.phone, v.email, v.address].filter(Boolean).join(" • ") || "No contact info"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(v)}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeletingId(v.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor contact details.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={editing.phone ?? ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={editing.email ?? ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input
                  value={editing.address ?? ""}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  rows={3}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the vendor. If the vendor is referenced by any purchase
              order, deletion will be blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
