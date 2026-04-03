export interface DailyRecord {
  id: string;
  date: string;
  coalConsumed: number; // tons
  steamProduced: number; // tons
  costPerTon: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  vendorId: string;
  quantity: number; // tons
  pricePerTon: number;
  totalAmount: number;
  status: "pending" | "fulfilled";
}

export interface PurchaseRecord {
  id: string;
  date: string;
  poId: string;
  poNumber: string;
  vendor: string;
  quantity: number; // tons
  pricePerTon: number;
  totalAmount: number;
}

export interface Vendor {
  id: string;
  name: string;
}

export interface BalanceSummary {
  openingBalance: number;
  totalPurchased: number;
  totalConsumed: number;
  closingBalance: number;
}
