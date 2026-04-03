export interface DailyRecord {
  id: string;
  date: string;
  coalConsumed: number; // tons
  steamProduced: number; // tons
  costPerTon: number;
  totalCost: number;
}

export interface PurchaseRecord {
  id: string;
  date: string;
  vendor: string;
  quantity: number; // tons
  pricePerTon: number;
  totalAmount: number;
}

export interface BalanceSummary {
  openingBalance: number;
  totalPurchased: number;
  totalConsumed: number;
  closingBalance: number;
}
