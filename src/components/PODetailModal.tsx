import { PurchaseOrder } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const COMPANY_NAME = "Ayesha Spinning Mills Limited";

interface PODetailModalProps {
  po: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName: string;
}

export default function PODetailModal({ po, open, onOpenChange, vendorName }: PODetailModalProps) {
  if (!po) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Purchase Order - ${po.poNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; line-height: 1.5; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #1a1a2e; }
    .company-name { font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.5px; }
    .company-sub { font-size: 11px; color: #666; margin-top: 2px; }
    .po-badge { text-align: right; }
    .po-badge h2 { font-size: 28px; font-weight: 700; color: #e65100; letter-spacing: -0.5px; }
    .po-badge .po-num { font-size: 14px; color: #555; margin-top: 2px; font-family: monospace; }
    .po-badge .po-date { font-size: 12px; color: #888; margin-top: 4px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-box { background: #f8f8fa; border-radius: 8px; padding: 16px; }
    .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600; }
    .info-value { font-size: 15px; font-weight: 600; color: #1a1a2e; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th { background: #1a1a2e; color: #fff; padding: 12px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
    thead th:first-child { border-radius: 8px 0 0 0; }
    thead th:last-child { border-radius: 0 8px 0 0; text-align: right; }
    tbody td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #eee; }
    tbody td:last-child { text-align: right; font-weight: 600; }
    .total-row { background: #f8f8fa; }
    .total-row td { font-weight: 700; font-size: 16px; border: none; padding: 16px; }
    .total-row td:first-child { border-radius: 0 0 0 8px; }
    .total-row td:last-child { border-radius: 0 0 8px 0; color: #e65100; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-pending { background: #fff3e0; color: #e65100; }
    .status-fulfilled { background: #e8f5e9; color: #2e7d32; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #eee; display: flex; justify-content: space-between; }
    .sign-block { width: 200px; text-align: center; }
    .sign-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 8px; font-size: 11px; color: #666; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(0,0,0,0.03); pointer-events: none; letter-spacing: 8px; }
    @media print { body { padding: 0; } .watermark { color: rgba(0,0,0,0.02); } }
  </style>
</head>
<body>
  <div class="watermark">PURCHASE ORDER</div>

  <div class="header">
    <div>
      <div class="company-name">${COMPANY_NAME}</div>
      <div class="company-sub">Coal Procurement Department</div>
    </div>
    <div class="po-badge">
      <h2>Purchase Order</h2>
      <div class="po-num">${po.poNumber}</div>
      <div class="po-date">Date: ${po.date}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order Details</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Vendor</div>
        <div class="info-value">${vendorName}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Status</div>
        <div class="info-value">
          <span class="status-badge ${po.status === "fulfilled" ? "status-fulfilled" : "status-pending"}">
            ${po.status === "fulfilled" ? "✓ Fulfilled" : "Pending"}
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Items</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item Description</th>
          <th>Quantity (Tons)</th>
          <th>Rate / Ton (Rs)</th>
          <th>Amount (Rs)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>${po.item || "Coal"}</td>
          <td>${po.quantity}</td>
          <td>Rs ${po.pricePerTon.toLocaleString()}</td>
          <td>Rs ${po.totalAmount.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td colspan="4">Grand Total</td>
          <td>Rs ${po.totalAmount.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section" style="margin-top: 32px;">
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Amount in Words</div>
        <div class="info-value" style="font-size: 13px; font-weight: 500;">Rupees ${numberToWords(po.totalAmount)} Only</div>
      </div>
      <div class="info-box">
        <div class="info-label">Payment Terms</div>
        <div class="info-value" style="font-size: 13px; font-weight: 500;">As per agreement</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="sign-block">
      <div class="sign-line">Prepared By</div>
    </div>
    <div class="sign-block">
      <div class="sign-line">Approved By</div>
    </div>
    <div class="sign-block">
      <div class="sign-line">Vendor Signature</div>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Purchase Order Details</span>
            <Badge variant={po.status === "fulfilled" ? "default" : "secondary"}>
              {po.status === "fulfilled" ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fulfilled</span>
              ) : "Pending"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Company Header */}
          <div className="text-center pb-4 border-b">
            <h3 className="font-heading font-bold text-lg text-foreground">{COMPANY_NAME}</h3>
            <p className="text-xs text-muted-foreground">Coal Procurement Department</p>
          </div>

          {/* PO Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">PO Number</p>
              <p className="font-mono font-bold text-lg mt-1">{po.poNumber}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Date</p>
              <p className="font-semibold text-lg mt-1">{po.date}</p>
            </div>
          </div>

          {/* Vendor & Item */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Vendor</p>
              <p className="font-semibold">{vendorName}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Item</p>
              <p className="font-semibold">{po.item || "—"}</p>
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Order Summary</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coal text-coal-foreground">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Qty (Tons)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Rate/Ton</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-medium">{po.item || "Coal"}</td>
                    <td className="px-4 py-3 text-right">{po.quantity}</td>
                    <td className="px-4 py-3 text-right">Rs {po.pricePerTon.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold">Rs {po.totalAmount.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-muted/50 border-t">
                    <td colSpan={3} className="px-4 py-3 font-bold text-right">Grand Total</td>
                    <td className="px-4 py-3 text-right font-bold text-primary text-base">Rs {po.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print Bill
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };

  const intPart = Math.floor(num);
  return convert(intPart);
}
