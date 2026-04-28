import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, CalendarDays, Info, X, Layers, Pencil, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getDailyRecords, saveDailyRecord, deleteDailyRecord, updateDailyRecord, getPurchaseRecords, getItems, getStockByItem } from "@/lib/store";
import { DailyRecord, DailyRecordItem } from "@/lib/types";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStoreTick } from "@/hooks/useStore";
import { downloadCSV } from "@/lib/csv";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

interface ItemLine {
  id: string;
  itemId: string;
  itemName: string;
  quantity: string;
  rate: number;
}

export default function DailyLog() {
  useStoreTick();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const records = getDailyRecords();
  const [date, setDate] = useState<Date>();
  const [steamProduced, setSteamProduced] = useState("");
  const [itemLines, setItemLines] = useState<ItemLine[]>([]);
  const [costOverride, setCostOverride] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  // Available stock per item — excludes the record being edited so its current
  // consumption doesn't count against itself.
  const stockByItem = useMemo(
    () => getStockByItem(editingId ?? undefined),
    [editingId, records],
  );

  // Per-line stock check: an item used on several lines in this form shares a
  // single available pool. The first line consumes from its own qty up first,
  // subsequent lines only have what's left.
  const lineStockStatus = useMemo(() => {
    // Sum this form's entered quantities per item name
    const consumingByName: Record<string, number> = {};
    itemLines.forEach((l) => {
      if (!l.itemName) return;
      consumingByName[l.itemName] =
        (consumingByName[l.itemName] ?? 0) + (parseFloat(l.quantity) || 0);
    });
    const statuses: Record<string, { available: number; requested: number; exceeds: boolean }> = {};
    itemLines.forEach((l) => {
      if (!l.itemName) return;
      const available = stockByItem[l.itemName] ?? 0;
      const requested = consumingByName[l.itemName] ?? 0;
      statuses[l.id] = {
        available,
        requested,
        exceeds: requested > available + 1e-6,
      };
    });
    return statuses;
  }, [itemLines, stockByItem]);

  const hasStockError = Object.values(lineStockStatus).some((s) => s.exceeds);

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

  const resetForm = () => {
    setDate(undefined);
    setSteamProduced("");
    setItemLines([]);
    setCostOverride("");
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!date || itemLines.length === 0 || !steamProduced) {
      toast.error("Please fill date, add at least one item, and enter steam produced");
      return;
    }
    const steam = parseFloat(steamProduced);
    if (isNaN(steam)) { toast.error("Invalid steam value"); return; }
    const validLines = itemLines.filter((l) => l.itemId && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) { toast.error("Please select items and enter quantities"); return; }

    // Stock guard: total requested per item must not exceed available stock.
    const requestedPerItem: Record<string, number> = {};
    validLines.forEach((l) => {
      requestedPerItem[l.itemName] =
        (requestedPerItem[l.itemName] ?? 0) + parseFloat(l.quantity);
    });
    for (const [itemName, requested] of Object.entries(requestedPerItem)) {
      const available = stockByItem[itemName] ?? 0;
      if (requested > available + 1e-6) {
        toast.error(
          `Not enough "${itemName}" in stock — requested ${requested.toFixed(2)}t but only ${available.toFixed(2)}t available.`,
        );
        return;
      }
    }

    const items: DailyRecordItem[] = validLines.map((line) => {
      const qty = parseFloat(line.quantity);
      const costPerTon = costOverride !== "" ? (parseFloat(costOverride) || 0) : line.rate;
      return { itemName: line.itemName, quantity: qty, costPerTon: parseFloat(costPerTon.toFixed(2)) };
    });

    const totalCoal = items.reduce((s, i) => s + i.quantity, 0);
    const totalCost = items.reduce((s, i) => s + i.quantity * i.costPerTon, 0);

    const record: DailyRecord = {
      id: editingId || crypto.randomUUID(),
      date: format(date, "yyyy-MM-dd"),
      items,
      steamProduced: parseFloat(steam.toFixed(2)),
      totalCoal: parseFloat(totalCoal.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
    };

    try {
      if (editingId) {
        await updateDailyRecord(record);
        toast.success("Record updated");
      } else {
        await saveDailyRecord(record);
        toast.success("Record added");
      }
      resetForm();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save record");
    }
  };

  const handleEdit = (r: DailyRecord) => {
    setEditingId(r.id);
    setDate(new Date(r.date));
    setSteamProduced(String(r.steamProduced));
    setCostOverride("");
    // Rebuild item lines from the record's items
    const lines: ItemLine[] = r.items.map((item) => {
      const matchedItem = availableItems.find((ai) => ai.name === item.itemName);
      return {
        id: crypto.randomUUID(),
        itemId: matchedItem?.id || "",
        itemName: item.itemName,
        quantity: String(item.quantity),
        rate: item.costPerTon,
      };
    });
    setItemLines(lines);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDailyRecord(id);
      if (editingId === id) resetForm();
      toast.success("Record deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete record");
    }
  };

  const usedItemIds = itemLines.map((l) => l.itemId).filter(Boolean);

  const filteredRecords = useMemo(() => {
    let list = records;
    if (fromDate) list = list.filter((r) => r.date >= fromDate);
    if (toDate) list = list.filter((r) => r.date <= toDate);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.date.includes(q) ||
          r.items.some((i) => i.itemName.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [records, fromDate, toDate, search]);

  const handleExportCSV = () => {
    const rows: Array<Record<string, string | number>> = [];
    filteredRecords.forEach((r) => {
      if (r.items.length === 0) {
        rows.push({
          Date: r.date,
          Item: "",
          Quantity: "",
          "Rate/Ton": "",
          "Total Coal": r.totalCoal,
          "Steam Produced": r.steamProduced,
          "Total Cost": r.totalCost,
        });
      } else {
        r.items.forEach((it, idx) => {
          rows.push({
            Date: idx === 0 ? r.date : "",
            Item: it.itemName,
            Quantity: it.quantity,
            "Rate/Ton": it.costPerTon,
            "Total Coal": idx === 0 ? r.totalCoal : "",
            "Steam Produced": idx === 0 ? r.steamProduced : "",
            "Total Cost": idx === 0 ? r.totalCost : "",
          });
        });
      }
    });
    if (rows.length === 0) {
      toast.error("No records to export");
      return;
    }
    downloadCSV(`daily-log-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("Daily log exported");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Daily Coal & Steam Log</h1>
        <p className="page-subtitle">Record daily coal consumption and steam production</p>
      </div>

      {isAdmin && (
      <div className="content-card mb-6">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">
            {editingId ? "Edit Entry" : "Add New Entry"}
          </h2>
          {editingId && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={resetForm}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancel Edit
            </Button>
          )}
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
                {itemLines.map((line, idx) => {
                  const status = lineStockStatus[line.id];
                  const exceeds = status?.exceeds ?? false;
                  const available = status?.available ?? 0;
                  return (
                    <div
                      key={line.id}
                      className={cn(
                        "p-3 rounded-lg bg-muted/40 border",
                        exceeds ? "border-destructive/60 bg-destructive/5" : "border-border/50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Select
                            value={line.itemId}
                            onValueChange={(val) => updateItemLine(line.id, "itemId", val)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableItems
                                .filter((i) => !usedItemIds.includes(i.id) || i.id === line.itemId)
                                .map((i) => {
                                  const avail = stockByItem[i.name] ?? 0;
                                  return (
                                    <SelectItem key={i.id} value={i.id}>
                                      <span className="flex items-center gap-2">
                                        <span>{i.name}</span>
                                        <span
                                          className={cn(
                                            "text-[10px] font-normal",
                                            avail <= 0
                                              ? "text-destructive"
                                              : "text-muted-foreground",
                                          )}
                                        >
                                          ({avail.toFixed(1)}t avail)
                                        </span>
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-28 shrink-0">
                          <Input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateItemLine(line.id, "quantity", e.target.value)}
                            className={cn(
                              "h-9 text-sm",
                              exceeds && "border-destructive focus-visible:ring-destructive",
                            )}
                            placeholder="Tons"
                          />
                        </div>
                        {line.rate > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            Rs {line.rate.toFixed(2)}/t
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeItemLine(line.id)}
                        >
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                      {line.itemName && (
                        <div className="mt-2 ml-8 flex items-center gap-1.5 text-[11px]">
                          {exceeds ? (
                            <span className="flex items-center gap-1 text-destructive font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              Only {available.toFixed(2)}t of &quot;{line.itemName}&quot; in stock — cannot exceed it.
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {available.toFixed(2)}t available · {(available - (status?.requested ?? 0)).toFixed(2)}t remaining after this entry
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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

          {hasStockError && (
            <div className="rounded-md border border-destructive/60 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-xs text-destructive">
                <p className="font-medium">One or more items exceed available stock.</p>
                <p className="mt-0.5 text-destructive/80">
                  Reduce the quantity of flagged lines, or record additional purchases in the{" "}
                  <a href="/purchases" className="underline">Purchases</a> page first.
                </p>
              </div>
            </div>
          )}
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto"
            disabled={itemLines.length === 0 || hasStockError}
          >
            <Plus className="w-4 h-4 mr-2" /> {editingId ? "Update Entry" : "Save Entry"}
          </Button>
        </div>
      </div>
      )}

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm">Records</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-7 pr-3 w-40 text-xs"
              />
            </div>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 w-36 text-xs"
              title="From"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 w-36 text-xs"
              title="To"
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
            </Button>
            <span className="text-xs text-muted-foreground">
              {filteredRecords.length} / {records.length}
            </span>
          </div>
        </div>
        <div className="content-card-body p-0">
          {filteredRecords.length === 0 ? (
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
                    <th>Items</th>
                    <th>Total Coal (tons)</th>
                    <th>Steam (tons)</th>
                    <th>Total Cost (Rs)</th>
                    <th>Rs / Ton Steam</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className={cn(editingId === r.id && "bg-primary/5")}>
                      <td className="font-medium">{r.date}</td>
                      <td>
                        <div className="space-y-0.5">
                          {r.items.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-medium">{item.itemName}</span>
                              <span className="text-muted-foreground ml-1">
                                {item.quantity}t × Rs {item.costPerTon.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>{r.totalCoal}</td>
                      <td>{r.steamProduced}</td>
                      <td className="font-medium">Rs {r.totalCost.toFixed(2)}</td>
                      <td className="font-medium">
                        {r.steamProduced > 0
                          ? `Rs ${(r.totalCost / r.steamProduced).toFixed(2)}`
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
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
