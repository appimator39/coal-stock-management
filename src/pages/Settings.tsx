import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Trash2,
  AlertTriangle,
  Database,
  RefreshCw,
  FileJson,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { authApi } from "@/lib/auth";
import {
  resetAllData,
  getOpeningBalance,
  setOpeningBalance,
  getDailyRecords,
  getItems,
  getPurchaseOrders,
  getPurchaseRecords,
  getVendors,
} from "@/lib/store";
import { useStoreTick } from "@/hooks/useStore";
import { downloadCSV } from "@/lib/csv";

type Counts = {
  vendors: number;
  items: number;
  purchaseOrders: number;
  purchaseRecords: number;
  dailyRecords: number;
};

export default function Settings() {
  useStoreTick();
  const [counts, setCounts] = useState<Counts>({
    vendors: 0,
    items: 0,
    purchaseOrders: 0,
    purchaseRecords: 0,
    dailyRecords: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [openingInput, setOpeningInput] = useState<string>("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { counts } = await api.get<{ counts: Counts }>("/api/settings");
      setCounts(counts);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load DB stats");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    setOpeningInput(String(getOpeningBalance()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async () => {
    try {
      await resetAllData();
      await refresh();
      toast.success("All data reset");
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    }
  };

  const handleExportAllJson = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      openingBalance: getOpeningBalance(),
      vendors: getVendors(),
      items: getItems(),
      purchaseOrders: getPurchaseOrders(),
      purchaseRecords: getPurchaseRecords(),
      dailyRecords: getDailyRecords(),
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coal-tracker-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON snapshot downloaded");
  };

  const handleExportAllCsv = () => {
    const vendors = getVendors();
    const items = getItems();
    const pos = getPurchaseOrders();
    const prs = getPurchaseRecords();
    if (vendors.length) downloadCSV("vendors.csv", vendors as any);
    if (items.length) downloadCSV("items.csv", items as any);
    if (pos.length) downloadCSV("purchase-orders.csv", pos as any);
    if (prs.length) downloadCSV("purchase-records.csv", prs as any);
    toast.success("CSV files downloaded");
  };

  const handleSaveOpening = async () => {
    const val = parseFloat(openingInput);
    if (isNaN(val)) {
      toast.error("Enter a valid number");
      return;
    }
    try {
      await setOpeningBalance(val);
      toast.success("Opening balance saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Fill both password fields");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChanging(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to change password");
    } finally {
      setChanging(false);
    }
  };

  const totalRecords = counts.vendors + counts.items + counts.purchaseOrders + counts.purchaseRecords + counts.dailyRecords;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Database, account, and preferences</p>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Database
          </h2>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={refreshing} className="h-7 text-xs">
            <RefreshCw className={"w-3.5 h-3.5 mr-1.5 " + (refreshing ? "animate-spin" : "")} />
            Refresh
          </Button>
        </div>
        <div className="form-section-body">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Vendors", key: "vendors" as const },
              { label: "Items", key: "items" as const },
              { label: "Purchase Orders", key: "purchaseOrders" as const },
              { label: "Purchases", key: "purchaseRecords" as const },
              { label: "Daily Records", key: "dailyRecords" as const },
            ].map((x) => (
              <div key={x.key} className="rounded-lg border border-border/50 p-3 bg-muted/20">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {x.label}
                </p>
                <p className="text-xl font-heading font-bold mt-0.5">{counts[x.key]}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalRecords} total records · stored in Turso (server-side SQLite).
          </p>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm">Opening Balance</h2>
        </div>
        <div className="form-section-body">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="max-w-xs">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Coal in stock (tons)
              </Label>
              <Input
                type="number"
                value={openingInput}
                onChange={(e) => setOpeningInput(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleSaveOpening}>Save</Button>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" /> Change Password
          </h2>
        </div>
        <div className="form-section-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Current password
              </Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5"
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                New password
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Confirm new password
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={handleChangePassword} disabled={changing}>
              {changing ? "Updating…" : "Update password"}
            </Button>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-header">
          <h2 className="font-heading font-semibold text-sm">Exports</h2>
        </div>
        <div className="form-section-body">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={handleExportAllJson}>
              <FileJson className="w-3.5 h-3.5 mr-1.5" /> Full JSON snapshot
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAllCsv}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> All CSV files
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Downloads a current snapshot of all data in your browser. For full database backups,
            use Turso's built-in dashboard backup tools.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h2 className="font-heading font-semibold text-sm text-destructive">Danger Zone</h2>
        </div>
        <div className="content-card-body">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Reset All Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete all records — vendors, items, purchase orders, purchases, daily logs, and
                opening balance. Users and passwords are preserved. This cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" /> Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" /> Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all business data across every user. There is no way to
                    recover it. User accounts are kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleReset}
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
