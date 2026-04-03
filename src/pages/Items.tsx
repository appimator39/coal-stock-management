import { useState } from "react";
import { Plus, Trash2, Pencil, Package, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getItems, saveItem, updateItem, deleteItem } from "@/lib/store";
import { Item } from "@/lib/types";
import { toast } from "sonner";

export default function Items() {
  const [items, setItems] = useState<Item[]>(getItems());
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    if (items.some((i) => i.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error("Item already exists");
      return;
    }
    const item: Item = { id: crypto.randomUUID(), name: name.trim() };
    saveItem(item);
    setItems(getItems());
    setName("");
    toast.success("Item added");
  };

  const handleStartEdit = (item: Item) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      toast.error("Item name cannot be empty");
      return;
    }
    if (items.some((i) => i.id !== editingId && i.name.toLowerCase() === editName.trim().toLowerCase())) {
      toast.error("Item name already exists");
      return;
    }
    updateItem({ id: editingId!, name: editName.trim() });
    setItems(getItems());
    setEditingId(null);
    setEditName("");
    toast.success("Item updated");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = (id: string) => {
    deleteItem(id);
    setItems(getItems());
    toast.success("Item deleted");
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 max-w-md">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
                placeholder="e.g. Bituminous Coal, Anthracite"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
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
                <div key={item.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
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
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(item)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
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
