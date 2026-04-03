import { DailyRecord, PurchaseRecord } from "./types";

const DAILY_KEY = "coal_daily_records";
const PURCHASE_KEY = "coal_purchase_records";
const OPENING_KEY = "coal_opening_balance";

export function getDailyRecords(): DailyRecord[] {
  const data = localStorage.getItem(DAILY_KEY);
  return data ? JSON.parse(data) : [];
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

export function getPurchaseRecords(): PurchaseRecord[] {
  const data = localStorage.getItem(PURCHASE_KEY);
  return data ? JSON.parse(data) : [];
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

export function getOpeningBalance(): number {
  return Number(localStorage.getItem(OPENING_KEY) || "0");
}

export function setOpeningBalance(val: number) {
  localStorage.setItem(OPENING_KEY, String(val));
}
