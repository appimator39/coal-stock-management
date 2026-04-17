export interface DailyRecordItem {
  id?: string;
  itemName: string;
  quantity: number; // tons
  costPerTon: number;
}

export interface DailyRecord {
  id: string;
  date: string;
  items: DailyRecordItem[];
  steamProduced: number; // tons
  totalCoal: number; // sum of all item quantities
  totalCost: number;
  notes?: string;
  // Legacy fields for backward compat with old localStorage data
  item?: string;
  coalConsumed?: number;
  costPerTon?: number;
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
  status: "pending" | "partial" | "fulfilled";
  notes?: string;
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
  builtyNumber?: string;
  truckNumber?: string;
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
}

export interface BalanceSummary {
  openingBalance: number;
  totalPurchased: number;
  totalConsumed: number;
  closingBalance: number;
}
