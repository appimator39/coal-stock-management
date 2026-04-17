import { useState } from "react";
import { Plus, Trash2, Pencil, Package, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getItems, saveItem, updateItem, deleteItem } from "@/lib/store";
import { Item } from "@/lib/types";
import { toast } from "sonner";
import { useStoreTick } from "@/hooks/useStore";
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

export default function Items() {
  useStoreTick();
  const items = getItems();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    if (items.some((i) => i.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error("Item already exists");
      return;
    }
    try {
      await saveItem({
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      toast.success("Item added");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add item");
    }
  };

  const handleStartEdit = (item: Item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error("Item name cannot be empty");
      return;
    }
    if (items.some((i) => i.id !== editingId && i.name.toLowerCase() === editName.trim().toLowerCase())) {
      toast.error("Item name already exists");
      return;
    }
    try {
      await updateItem({
        id: editingId!,
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setEditingId(null);
      setEditName("");
      setEditDesc("");
      toast.success("Item updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update item");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteItem(deletingId);
      setDeletingId(null);
      toast.success("Item deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete item");
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Items</h1>
        <p className="page-subtitle">Manage coal types and items for purchase orders</p>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm">Add New Item</h2>
        </div>
        <div className="form-section-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Item Name *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
                placeholder="e.g. Bituminous Coal, Anthracite"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Item List</h2>
          <span className="text-xs text-muted-foreground">{items.length} items</span>
        </div>
        <div className="content-card-body p-0">
          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No items yet</p>
              <p className="empty-state-text">Add coal types or items above to use them in purchase orders.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  {editingId === item.id ? (
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
                        placeholder="Name"
                      />
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="max-w-sm h-9"
                        placeholder="Description (optional)"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success"
                        onClick={handleSaveEdit}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(item)}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeletingId(item.id)}
                        >
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

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the item. If the item is referenced by any purchase order,
              receipt, or daily log entry, deletion will be blocked.
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
