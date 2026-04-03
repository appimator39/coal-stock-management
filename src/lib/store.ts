import { DailyRecord, PurchaseRecord, PurchaseOrder, Vendor, Item } from "./types";

const DAILY_KEY = "coal_daily_records";
const PURCHASE_KEY = "coal_purchase_records";
const OPENING_KEY = "coal_opening_balance";
const VENDOR_KEY = "coal_vendors";
const PO_KEY = "coal_purchase_orders";

// --- Daily Records ---
export function getDailyRecords(): DailyRecord[] {
  try {
    const data = localStorage.getItem(DAILY_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveDailyRecord(record: DailyRecord) {
  const records = getDailyRecords();
  records.push(record);
  localStorage.setItem(DAILY_KEY, JSON.stringify(records));
}

export function deleteDailyRecord(id: string) {
  const records = getDailyRecords().filter((r) => r.id !== id);
  localStorage.setItem(DAILY_KEY, JSON.stringify(records));
}

// --- Purchase Records ---
export function getPurchaseRecords(): PurchaseRecord[] {
  try {
    const data = localStorage.getItem(PURCHASE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function savePurchaseRecord(record: PurchaseRecord) {
  const records = getPurchaseRecords();
  records.push(record);
  localStorage.setItem(PURCHASE_KEY, JSON.stringify(records));
}

export function deletePurchaseRecord(id: string) {
  const records = getPurchaseRecords().filter((r) => r.id !== id);
  localStorage.setItem(PURCHASE_KEY, JSON.stringify(records));
}

// --- Opening Balance ---
export function getOpeningBalance(): number {
  return Number(localStorage.getItem(OPENING_KEY) || "0");
}

export function setOpeningBalance(val: number) {
  localStorage.setItem(OPENING_KEY, String(val));
}

// --- Vendors ---
export function getVendors(): Vendor[] {
  try {
    const data = localStorage.getItem(VENDOR_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveVendor(vendor: Vendor) {
  const vendors = getVendors();
  vendors.push(vendor);
  localStorage.setItem(VENDOR_KEY, JSON.stringify(vendors));
}

export function deleteVendor(id: string) {
  const vendors = getVendors().filter((v) => v.id !== id);
  localStorage.setItem(VENDOR_KEY, JSON.stringify(vendors));
}

// --- Purchase Orders ---
export function getPurchaseOrders(): PurchaseOrder[] {
  try {
    const data = localStorage.getItem(PO_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function savePurchaseOrder(po: PurchaseOrder) {
  const orders = getPurchaseOrders();
  orders.push(po);
  localStorage.setItem(PO_KEY, JSON.stringify(orders));
}

export function updatePurchaseOrder(po: PurchaseOrder) {
  const orders = getPurchaseOrders().map((o) => (o.id === po.id ? po : o));
  localStorage.setItem(PO_KEY, JSON.stringify(orders));
}

export function deletePurchaseOrder(id: string) {
  const orders = getPurchaseOrders().filter((o) => o.id !== id);
  localStorage.setItem(PO_KEY, JSON.stringify(orders));
}
