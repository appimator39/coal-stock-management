import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
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
      <h1 className="text-2xl font-heading font-bold mb-6">Daily Coal & Steam Log</h1>

      <div className="bg-card rounded-xl border p-5 mb-6">
        <h2 className="font-heading font-semibold mb-4">Add New Entry</h2>
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
            <Label>Coal Consumed (tons)</Label>
            <Input type="number" value={coalConsumed} onChange={(e) => setCoalConsumed(e.target.value)} className="mt-1" placeholder="0" />
          </div>
          <div>
            <Label>Steam Produced (tons)</Label>
            <Input type="number" value={steamProduced} onChange={(e) => setSteamProduced(e.target.value)} className="mt-1" placeholder="0" />
          </div>
          <div>
            <Label>Cost per Ton (PKR)</Label>
            <Input type="number" value={costPerTon} onChange={(e) => setCostPerTon(e.target.value)} className="mt-1" placeholder="0" />
          </div>
          <Button onClick={handleAdd} className="mt-1">
            <Plus className="w-4 h-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold mb-4">Records</h2>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm">No records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Coal (tons)</th>
                  <th className="pb-2 font-medium">Steam (tons)</th>
                   <th className="pb-2 font-medium">Cost/Ton (PKR)</th>
                   <th className="pb-2 font-medium">Total Cost (PKR)</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5">{r.date}</td>
                    <td className="py-2.5">{r.coalConsumed}</td>
                    <td className="py-2.5">{r.steamProduced}</td>
                    <td className="py-2.5">PKR {r.costPerTon}</td>
                    <td className="py-2.5">PKR {r.totalCost.toLocaleString()}</td>
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
