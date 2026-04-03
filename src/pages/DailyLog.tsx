import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getDailyRecords, saveDailyRecord, deleteDailyRecord } from "@/lib/store";
import { DailyRecord } from "@/lib/types";
import { toast } from "sonner";

export default function DailyLog() {
  const [records, setRecords] = useState<DailyRecord[]>(getDailyRecords());
  const [date, setDate] = useState<Date>();
  const [coalConsumed, setCoalConsumed] = useState("");
  const [steamProduced, setSteamProduced] = useState("");
  const [costPerTon, setCostPerTon] = useState("");

  const handleAdd = () => {
    if (!date || !coalConsumed || !steamProduced || !costPerTon) {
      toast.error("Please fill all fields");
      return;
    }
    const coal = parseFloat(coalConsumed);
    const steam = parseFloat(steamProduced);
    const cost = parseFloat(costPerTon);
    if (isNaN(coal) || isNaN(steam) || isNaN(cost)) {
      toast.error("Please enter valid numbers");
      return;
    }
    const record: DailyRecord = {
      id: crypto.randomUUID(),
      date: format(date, "yyyy-MM-dd"),
      coalConsumed: coal,
      steamProduced: steam,
      costPerTon: cost,
      totalCost: coal * cost,
    };
    saveDailyRecord(record);
    setRecords(getDailyRecords());
    setDate(undefined);
    setCoalConsumed("");
    setSteamProduced("");
    setCostPerTon("");
    toast.success("Record added");
  };

  const handleDelete = (id: string) => {
    deleteDailyRecord(id);
    setRecords(getDailyRecords());
    toast.success("Record deleted");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Daily Coal & Steam Log</h1>
        <p className="page-subtitle">Record daily coal consumption and steam production</p>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm">Add New Entry</h2>
        </div>
        <div className="form-section-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coal Consumed (tons)</Label>
              <Input type="number" value={coalConsumed} onChange={(e) => setCoalConsumed(e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Steam Produced (tons)</Label>
              <Input type="number" value={steamProduced} onChange={(e) => setSteamProduced(e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost per Ton (Rs)</Label>
              <Input type="number" value={costPerTon} onChange={(e) => setCostPerTon(e.target.value)} className="mt-1.5" placeholder="0.00" />
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Entry
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
              <div className="empty-state-icon">
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="empty-state-title">No records yet</p>
              <p className="empty-state-text">Add your first daily entry using the form above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Coal (tons)</th>
                    <th>Steam (tons)</th>
                    <th>Cost/Ton (Rs)</th>
                    <th>Total Cost (Rs)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.date}</td>
                      <td>{r.coalConsumed}</td>
                      <td>{r.steamProduced}</td>
                      <td>Rs {r.costPerTon}</td>
                      <td className="font-medium">Rs {r.totalCost.toLocaleString()}</td>
                      <td>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
    </div>
  );
}
