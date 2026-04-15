import { PurchaseOrder } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, Download } from "lucide-react";
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
    if (!printWindow) return;
    printWindow.document.write(buildPrintHTML(po, vendorName));
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = 210; // page width
    const ph = 297; // page height
    const ml = 18; // margin left
    const mr = 18; // margin right
    const cw = pw - ml - mr; // content width
    let y = 18;

    const gray = (v: number): [number, number, number] => [v, v, v];
    const dark: [number, number, number] = [26, 26, 46];
    const accent: [number, number, number] = [230, 81, 0];
    const mid: [number, number, number] = [90, 90, 110];

    // ── Header ──────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text(COMPANY_NAME, ml, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...mid);
    doc.text("Coal Procurement Department", ml, y);

    // PO title — right side
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...accent);
    doc.text("PURCHASE ORDER", pw - mr, y - 5, { align: "right" });
    doc.setFontSize(10);
    doc.setTextColor(...gray(70));
    doc.text(po.poNumber, pw - mr, y, { align: "right" });
    y += 4;
    doc.setFontSize(8.5);
    doc.text(`Date: ${po.date}`, pw - mr, y, { align: "right" });
    y += 5;

    // Separator
    doc.setDrawColor(...dark);
    doc.setLineWidth(0.6);
    doc.line(ml, y, pw - mr, y);
    y += 8;

    // ── Detail Boxes (2×2 grid) ──────────────────────────────────────
    const boxH = 14;
    const boxGap = 4;
    const boxW = (cw - boxGap) / 2;
    const boxes: [string, string][] = [
      ["Vendor", vendorName],
      ["Item", po.item || "Coal"],
      ["Status", po.status === "fulfilled" ? "Fulfilled" : po.status === "partial" ? "Partial" : "Pending"],
      ["PO Date", po.date],
    ];

    boxes.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = ml + col * (boxW + boxGap);
      const by = y + row * (boxH + boxGap);
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(bx, by, boxW, boxH, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...mid);
      doc.text(label.toUpperCase(), bx + 5, by + 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(value, bx + 5, by + 10.5);
    });
    y += 2 * (boxH + boxGap) + 4;

    // ── Section label ──────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...mid);
    doc.text("ORDER ITEMS", ml, y);
    y += 4;

    // ── Table header ───────────────────────────────────────────────
    const cols = { no: 8, desc: cw * 0.45, qty: cw * 0.13, rate: cw * 0.19, amt: cw * 0.19 };
    const thH = 8;
    doc.setFillColor(...dark);
    doc.rect(ml, y, cw, thH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    let cx = ml + 4;
    doc.text("#", cx, y + 5.5);
    cx += cols.no;
    doc.text("Item Description", cx, y + 5.5);
    cx += cols.desc;
    doc.text("Qty (Tons)", cx, y + 5.5, { align: "center" });
    cx += cols.qty;
    doc.text("Rate/Ton (Rs)", cx + cols.rate - 4, y + 5.5, { align: "right" });
    cx += cols.rate;
    doc.text("Amount (Rs)", cx + cols.amt - 4, y + 5.5, { align: "right" });
    y += thH;

    // ── Item row ──────────────────────────────────────────────────
    const rowH = 10;
    doc.setFillColor(255, 255, 255);
    doc.rect(ml, y, cw, rowH, "F");
    doc.setDrawColor(230, 230, 235);
    doc.setLineWidth(0.2);
    doc.line(ml, y + rowH, ml + cw, y + rowH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    cx = ml + 4;
    doc.text("1", cx, y + 6.5);
    cx += cols.no;
    doc.text(po.item || "Coal", cx, y + 6.5);
    cx += cols.desc;
    doc.text(String(po.quantity), cx + cols.qty / 2, y + 6.5, { align: "center" });
    cx += cols.qty;
    doc.text(`Rs ${po.pricePerTon.toLocaleString()}`, cx + cols.rate - 4, y + 6.5, { align: "right" });
    cx += cols.rate;
    doc.setFont("helvetica", "bold");
    doc.text(`Rs ${po.totalAmount.toLocaleString()}`, cx + cols.amt - 4, y + 6.5, { align: "right" });
    y += rowH;

    // ── Total row ──────────────────────────────────────────────────
    const totalRowH = 10;
    doc.setFillColor(245, 245, 248);
    doc.rect(ml, y, cw, totalRowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text("Grand Total", pw - mr - cols.amt, y + 7, { align: "right" });
    doc.setTextColor(...accent);
    doc.text(`Rs ${po.totalAmount.toLocaleString()}`, pw - mr - 4, y + 7, { align: "right" });
    y += totalRowH + 6;

    // ── Amount in words ────────────────────────────────────────────
    doc.setFillColor(245, 245, 248);
    doc.roundedRect(ml, y, cw, 14, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...mid);
    doc.text("AMOUNT IN WORDS", ml + 5, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(`Rupees ${numberToWords(po.totalAmount)} Only`, ml + 5, y + 10.5);
    y += 20;

    // ── Terms row ────────────────────────────────────────────────
    const termW = (cw - boxGap) / 2;
    const termH = 14;
    const terms: [string, string][] = [
      ["Payment Terms", "As per agreement"],
      ["Delivery", "At mill premises"],
    ];
    terms.forEach(([label, value], i) => {
      const bx = ml + i * (termW + boxGap);
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(bx, y, termW, termH, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...mid);
      doc.text(label.toUpperCase(), bx + 5, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.text(value, bx + 5, y + 10.5);
    });
    y += termH + 14;

    // ── Signature lines ────────────────────────────────────────────
    if (y > ph - 40) { doc.addPage(); y = 20; }
    const sigW = 52;
    const sigGap = (cw - sigW * 3) / 2;
    const sigs = ["Prepared By", "Approved By", "Vendor Signature"];
    sigs.forEach((label, i) => {
      const sx = ml + i * (sigW + sigGap);
      doc.setDrawColor(...gray(150));
      doc.setLineWidth(0.4);
      doc.line(sx, y + 18, sx + sigW, y + 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...mid);
      doc.text(label, sx + sigW / 2, y + 23, { align: "center" });
    });

    // ── Footer ────────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setTextColor(...gray(160));
    doc.text(
      `${COMPANY_NAME} · Coal Tracker Pro`,
      pw / 2,
      ph - 8,
      { align: "center" }
    );

    doc.save(`${po.poNumber}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Purchase Order Details</span>
            <Badge
              variant={po.status === "fulfilled" ? "default" : "secondary"}
              className={po.status === "partial" ? "border-amber-500 text-amber-500" : ""}
            >
              {po.status === "fulfilled" ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fulfilled</span>
              ) : po.status === "partial" ? "Partial" : "Pending"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Company Header */}
          <div className="text-center pb-4 border-b border-border">
            <h3 className="font-heading font-bold text-lg text-foreground">{COMPANY_NAME}</h3>
            <p className="text-xs text-muted-foreground">Coal Procurement Department</p>
          </div>

          {/* PO Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">PO Number</p>
              <p className="font-mono font-bold text-base mt-1">{po.poNumber}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Date</p>
              <p className="font-semibold text-base mt-1">{po.date}</p>
            </div>
          </div>

          {/* Vendor & Item */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Vendor</p>
              <p className="font-semibold mt-1">{vendorName}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Item</p>
              <p className="font-semibold mt-1">{po.item || "—"}</p>
            </div>
          </div>

          <Separator />

          {/* Order Summary Table */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Order Summary</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-foreground text-background">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ width: 40 }}>#</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ width: 90 }}>Qty (Tons)</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ width: 110 }}>Rate/Ton</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ width: 120 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3 text-center text-muted-foreground">1</td>
                    <td className="px-4 py-3 font-medium">{po.item || "Coal"}</td>
                    <td className="px-4 py-3 text-center">{po.quantity}</td>
                    <td className="px-4 py-3 text-right">Rs {po.pricePerTon.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold">Rs {po.totalAmount.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td colSpan={4} className="px-4 py-3 font-bold text-right">Grand Total</td>
                    <td className="px-4 py-3 text-right font-bold text-primary text-base">Rs {po.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Amount in Words</p>
            <p className="font-medium text-sm mt-1">Rupees {numberToWords(po.totalAmount)} Only</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function buildPrintHTML(po: PurchaseOrder, vendorName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Purchase Order - ${po.poNumber}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; line-height: 1.6; max-width: 210mm; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1a1a2e; margin-bottom: 24px; }
    .company-name { font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .company-sub { font-size: 11px; color: #666; margin-top: 2px; }
    .po-title { text-align: right; }
    .po-title h2 { font-size: 22px; font-weight: 700; color: #e65100; margin: 0; }
    .po-title .po-num { font-size: 13px; color: #555; margin-top: 2px; font-family: 'Courier New', monospace; }
    .po-title .po-date { font-size: 12px; color: #888; margin-top: 4px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .detail-box { background: #f5f5f8; border-radius: 6px; padding: 12px 16px; }
    .detail-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #888; }
    .detail-value { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-pending { background: #fff3e0; color: #e65100; }
    .status-partial { background: #fff8e1; color: #f57f17; }
    .status-fulfilled { background: #e8f5e9; color: #2e7d32; }
    .section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #1a1a2e; color: #fff; padding: 10px 14px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
    thead th:first-child { border-radius: 6px 0 0 0; } thead th:last-child { border-radius: 0 6px 0 0; }
    thead th.text-right { text-align: right; } thead th.text-center { text-align: center; }
    tbody td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #eee; vertical-align: middle; }
    tbody td.text-right { text-align: right; } tbody td.text-center { text-align: center; }
    .total-row { background: #f5f5f8; }
    .total-row td { font-weight: 700; font-size: 15px; border: none; padding: 14px; }
    .total-row td:first-child { border-radius: 0 0 0 6px; } .total-row td:last-child { border-radius: 0 0 6px 0; color: #e65100; }
    .amount-words { background: #f5f5f8; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; }
    .sign-block { width: 180px; text-align: center; }
    .sign-line { border-top: 1px solid #333; margin-top: 70px; padding-top: 6px; font-size: 10px; color: #666; font-weight: 600; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 72px; font-weight: 900; color: rgba(0,0,0,0.025); pointer-events: none; letter-spacing: 6px; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="watermark">PURCHASE ORDER</div>
  <div class="header">
    <div>
      <div class="company-name">${COMPANY_NAME}</div>
      <div class="company-sub">Coal Procurement Department</div>
    </div>
    <div class="po-title">
      <h2>Purchase Order</h2>
      <div class="po-num">${po.poNumber}</div>
      <div class="po-date">Date: ${po.date}</div>
    </div>
  </div>
  <div class="details-grid">
    <div class="detail-box"><div class="detail-label">Vendor</div><div class="detail-value">${vendorName}</div></div>
    <div class="detail-box"><div class="detail-label">Item</div><div class="detail-value">${po.item || "Coal"}</div></div>
    <div class="detail-box">
      <div class="detail-label">Status</div>
      <div class="detail-value">
        <span class="status-badge ${po.status === "fulfilled" ? "status-fulfilled" : po.status === "partial" ? "status-partial" : "status-pending"}">
          ${po.status === "fulfilled" ? "✓ Fulfilled" : po.status === "partial" ? "⬤ Partial" : "⏳ Pending"}
        </span>
      </div>
    </div>
    <div class="detail-box"><div class="detail-label">PO Date</div><div class="detail-value">${po.date}</div></div>
  </div>
  <div class="section-label">Order Items</div>
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Item Description</th>
        <th class="text-center" style="width:100px">Qty (Tons)</th>
        <th class="text-right" style="width:120px">Rate/Ton (Rs)</th>
        <th class="text-right" style="width:130px">Amount (Rs)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-center">1</td>
        <td style="font-weight:500">${po.item || "Coal"}</td>
        <td class="text-center">${po.quantity}</td>
        <td class="text-right">Rs ${po.pricePerTon.toLocaleString()}</td>
        <td class="text-right" style="font-weight:600">Rs ${po.totalAmount.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td colspan="4" style="text-align:right">Grand Total</td>
        <td class="text-right">Rs ${po.totalAmount.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>
  <div class="amount-words">
    <div class="detail-label">Amount in Words</div>
    <div class="detail-value" style="font-size:13px;font-weight:500">Rupees ${numberToWords(po.totalAmount)} Only</div>
  </div>
  <div class="details-grid">
    <div class="detail-box"><div class="detail-label">Payment Terms</div><div class="detail-value" style="font-size:13px">As per agreement</div></div>
    <div class="detail-box"><div class="detail-label">Delivery</div><div class="detail-value" style="font-size:13px">At mill premises</div></div>
  </div>
  <div class="footer">
    <div class="sign-block"><div class="sign-line">Prepared By</div></div>
    <div class="sign-block"><div class="sign-line">Approved By</div></div>
    <div class="sign-block"><div class="sign-line">Vendor Signature</div></div>
  </div>
</body>
</html>`;
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

  return convert(Math.floor(num));
}
