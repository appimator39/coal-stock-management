import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, CalendarDays, Info, X, Layers, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getDailyRecords, saveDailyRecord, deleteDailyRecord, updateDailyRecord, getPurchaseRecords, getItems } from "@/lib/store";
import { DailyRecord } from "@/lib/types";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ItemLine {
  id: string;
  itemId: string;
  itemName: string;
  quantity: string;
  rate: number;
}

export default function DailyLog() {
  const [records, setRecords] = useState<DailyRecord[]>(getDailyRecords());
  const [date, setDate] = useState<Date>();
  const [steamProduced, setSteamProduced] = useState("");
  const [itemLines, setItemLines] = useState<ItemLine[]>([]);
  const [costOverride, setCostOverride] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ coalConsumed: string; steamProduced: string; costPerTon: string }>({ coalConsumed: "", steamProduced: "", costPerTon: "" });

  const availableItems = getItems();

  const purchaseRateByItem = useMemo(() => {
    const purchases = getPurchaseRecords();
    const map = new Map<string, { totalQty: number; totalAmount: number }>();
    purchases.forEach((p) => {
      const item = p.item || "Unspecified";
      const e = map.get(item) || { totalQty: 0, totalAmount: 0 };
      e.totalQty += p.quantity;
      e.totalAmount += p.totalAmount;
      map.set(item, e);
    });
    const result: Record<string, number> = {};
    map.forEach((v, k) => {
      if (v.totalQty > 0) result[k] = v.totalAmount / v.totalQty;
    });
    return result;
  }, [records]);

  const combinedStats = useMemo(() => {
    let totalQty = 0;
    let totalWeightedCost = 0;
    itemLines.forEach((line) => {
      const qty = parseFloat(line.quantity) || 0;
      totalQty += qty;
      totalWeightedCost += qty * line.rate;
    });
    const avgRate = totalQty > 0 ? totalWeightedCost / totalQty : 0;
    return { totalQty, avgRate };
  }, [itemLines]);

  const effectiveCostPerTon = costOverride !== "" ? parseFloat(costOverride) || 0 : combinedStats.avgRate;

  const addItemLine = () => {
    setItemLines([...itemLines, { id: crypto.randomUUID(), itemId: "", itemName: "", quantity: "", rate: 0 }]);
  };

  const updateItemLine = (id: string, field: "itemId" | "quantity", value: string) => {
    setItemLines(itemLines.map((line) => {
      if (line.id !== id) return line;
      if (field === "itemId") {
        const item = availableItems.find((i) => i.id === value);
        const name = item?.name || "";
        return { ...line, itemId: value, itemName: name, rate: purchaseRateByItem[name] || 0 };
      }
      return { ...line, [field]: value };
    }));
  };

  const removeItemLine = (id: string) => {
    setItemLines(itemLines.filter((l) => l.id !== id));
  };

  const handleAdd = () => {
    if (!date || itemLines.length === 0 || !steamProduced) {
      toast.error("Please fill date, add at least one item, and enter steam produced");
      return;
    }
    const steam = parseFloat(steamProduced);
    if (isNaN(steam)) { toast.error("Invalid steam value"); return; }
    const validLines = itemLines.filter((l) => l.itemId && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) { toast.error("Please select items and enter quantities"); return; }
    const costPerTon = effectiveCostPerTon;
    if (costPerTon <= 0) { toast.error("Cost per ton must be greater than 0"); return; }

    const steamPerItem = steam / validLines.length;
    validLines.forEach((line) => {
      const qty = parseFloat(line.quantity);
      const record: DailyRecord = {
        id: crypto.randomUUID(),
        date: format(date, "yyyy-MM-dd"),
        item: line.itemName,
        coalConsumed: qty,
        steamProduced: parseFloat(steamPerItem.toFixed(2)),
        costPerTon: parseFloat(costPerTon.toFixed(2)),
        totalCost: parseFloat((qty * costPerTon).toFixed(2)),
      };
      saveDailyRecord(record);
    });

    setRecords(getDailyRecords());
    setDate(undefined);
    setSteamProduced("");
    setItemLines([]);
    setCostOverride("");
    toast.success(`${validLines.length} record(s) added`);
  };

  const handleDelete = (id: string) => {
    deleteDailyRecord(id);
    setRecords(getDailyRecords());
    toast.success("Record deleted");
  };

  const startEdit = (r: DailyRecord) => {
    setEditingId(r.id);
    setEditForm({ coalConsumed: String(r.coalConsumed), steamProduced: String(r.steamProduced), costPerTon: String(r.costPerTon) });
  };

  const saveEdit = (r: DailyRecord) => {
    const coal = parseFloat(editForm.coalConsumed);
    const steam = parseFloat(editForm.steamProduced);
    const cost = parseFloat(editForm.costPerTon);
    if (isNaN(coal) || isNaN(steam) || isNaN(cost)) { toast.error("Invalid values"); return; }
    const updated: DailyRecord = {
      ...r,
      coalConsumed: coal,
      steamProduced: parseFloat(steam.toFixed(2)),
      costPerTon: parseFloat(cost.toFixed(2)),
      totalCost: parseFloat((coal * cost).toFixed(2)),
    };
    updateDailyRecord(updated);
    setRecords(getDailyRecords());
    setEditingId(null);
    toast.success("Record updated");
  };

  const usedItemIds = itemLines.map((l) => l.itemId).filter(Boolean);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Daily Coal & Steam Log</h1>
        <p className="page-subtitle">Record daily coal consumption and steam production</p>
      </div>

      <div className="content-card mb-6">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Add New Entry</h2>
        </div>
        <div className="content-card-body space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Steam Produced (tons)</Label>
              <Input type="number" value={steamProduced} onChange={(e) => setSteamProduced(e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coal Items Consumed</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItemLine} disabled={availableItems.length === 0} className="h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Item
              </Button>
            </div>

            {availableItems.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">No items available. <a href="/items" className="text-primary underline font-medium">Add items</a> first.</p>
              </div>
            )}

            {itemLines.length === 0 && availableItems.length > 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors" onClick={addItemLine}>
                <Layers className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to add coal items consumed today</p>
              </div>
            )}

            {itemLines.length > 0 && (
              <div className="space-y-2.5">
                {itemLines.map((line, idx) => (
                  <div key={line.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Select value={line.itemId} onValueChange={(val) => updateItemLine(line.id, "itemId", val)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {availableItems.filter((i) => !usedItemIds.includes(i.id) || i.id === line.itemId).map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28 shrink-0">
                      <Input type="number" value={line.quantity} onChange={(e) => updateItemLine(line.id, "quantity", e.target.value)} className="h-9 text-sm" placeholder="Tons" />
                    </div>
                    {line.rate > 0 && <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">Rs {line.rate.toFixed(2)}/t</span>}
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItemLine(line.id)}>
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {itemLines.length > 0 && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Coal</p>
                  <p className="text-lg font-bold mt-0.5">{combinedStats.totalQty.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">tons</span></p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg Cost/Ton</p>
                    {combinedStats.avgRate > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Weighted average from item purchase rates</p></TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Input
                    type="number"
                    value={costOverride !== "" ? costOverride : (combinedStats.avgRate > 0 ? combinedStats.avgRate.toFixed(2) : "")}
                    onChange={(e) => setCostOverride(e.target.value)}
                    className="h-9 mt-1 text-sm"
                    placeholder="0.00"
                  />
                  {combinedStats.avgRate > 0 && costOverride === "" && (
                    <p className="text-[10px] text-success mt-1 font-medium">Auto-calculated weighted avg.</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Cost</p>
                  <p className="text-lg font-bold mt-0.5">Rs {(combinedStats.totalQty * effectiveCostPerTon).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleAdd} className="w-full sm:w-auto" disabled={itemLines.length === 0}>
            <Plus className="w-4 h-4 mr-2" /> Save Entry
          </Button>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Records</h2>
          <span className="text-xs text-muted-foreground">{records.length} entries</span>
        </div>
        <div className="content-card-body p-0">
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><CalendarDays className="w-5 h-5 text-muted-foreground" /></div>
              <p className="empty-state-title">No records yet</p>
              <p className="empty-state-text">Add your first daily entry using the form above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Coal (tons)</th>
                    <th>Steam (tons)</th>
                    <th>Cost/Ton (Rs)</th>
                    <th>Total Cost (Rs)</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.date}</td>
                      <td>{r.item || "—"}</td>
                      {editingId === r.id ? (
                        <>
                          <td><Input type="number" value={editForm.coalConsumed} onChange={(e) => setEditForm({ ...editForm, coalConsumed: e.target.value })} className="h-8 w-20 text-sm" /></td>
                          <td><Input type="number" value={editForm.steamProduced} onChange={(e) => setEditForm({ ...editForm, steamProduced: e.target.value })} className="h-8 w-20 text-sm" /></td>
                          <td><Input type="number" value={editForm.costPerTon} onChange={(e) => setEditForm({ ...editForm, costPerTon: e.target.value })} className="h-8 w-24 text-sm" /></td>
                          <td className="font-medium">Rs {((parseFloat(editForm.coalConsumed) || 0) * (parseFloat(editForm.costPerTon) || 0)).toFixed(2)}</td>
                          <td>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveEdit(r)}><Check className="w-3.5 h-3.5 text-success" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{Number(r.coalConsumed)}</td>
                          <td>{Number(r.steamProduced)}</td>
                          <td>Rs {Number(r.costPerTon).toFixed(2)}</td>
                          <td className="font-medium">Rs {Number(r.totalCost).toFixed(2)}</td>
                          <td>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(r)}><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                            </div>
                          </td>
                        </>
                      )}
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
