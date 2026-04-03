export interface DailyRecord {
  id: string;
  date: string;
  item: string; // coal item name
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
  item: string;
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
  item: string; // coal item name
  quantity: number; // tons
  pricePerTon: number;
  totalAmount: number;
}

export interface Vendor {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
}

export interface BalanceSummary {
  openingBalance: number;
  totalPurchased: number;
  totalConsumed: number;
  closingBalance: number;
}
