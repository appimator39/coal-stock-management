// Synchronous facade over the server-backed API.
// The pages are written against a synchronous store API. To avoid a huge
// refactor while switching the source of truth to a remote Turso database,
// we keep a hydrated in-memory cache that mirrors the server state and is
// rewritten whenever a mutation happens. All mutations call the API, then
// refresh the affected slice of the cache.

import {
  DailyRecord,
  DailyRecordItem,
  Item,
  PurchaseOrder,
  PurchaseRecord,
  Vendor,
} from './types';
import { api } from './api';

interface Cache {
  vendors: Vendor[];
  items: Item[];
  purchaseOrders: PurchaseOrder[];
  purchaseRecords: PurchaseRecord[];
  dailyRecords: DailyRecord[];
  openingBalance: number;
  hydrated: boolean;
}

const cache: Cache = {
  vendors: [],
  items: [],
  purchaseOrders: [],
  purchaseRecords: [],
  dailyRecords: [],
  openingBalance: 0,
  hydrated: false,
};

type CacheListener = () => void;
const listeners = new Set<CacheListener>();

export function subscribe(fn: CacheListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('store listener error', e);
    }
  });
}

export function isHydrated(): boolean {
  return cache.hydrated;
}

export async function hydrateCache(): Promise<void> {
  const [vendors, items, purchaseOrders, purchaseRecords, dailyRecords, settings] =
    await Promise.all([
      api.get<Vendor[]>('/api/vendors'),
      api.get<Item[]>('/api/items'),
      api.get<PurchaseOrder[]>('/api/purchase-orders'),
      api.get<PurchaseRecord[]>('/api/purchase-records'),
      api.get<DailyRecord[]>('/api/daily-records'),
      api.get<{ settings: Record<string, string> }>('/api/settings'),
    ]);
  cache.vendors = vendors;
  cache.items = items;
  cache.purchaseOrders = purchaseOrders;
  cache.purchaseRecords = purchaseRecords;
  cache.dailyRecords = dailyRecords;
  cache.openingBalance = Number(settings.settings?.opening_balance ?? 0) || 0;
  cache.hydrated = true;
  notify();
}

export function clearCache(): void {
  cache.vendors = [];
  cache.items = [];
  cache.purchaseOrders = [];
  cache.purchaseRecords = [];
  cache.dailyRecords = [];
  cache.openingBalance = 0;
  cache.hydrated = false;
  notify();
}

// ---------- Reset ----------
export async function resetAllData(): Promise<void> {
  await api.del('/api/settings');
  cache.vendors = [];
  cache.items = [];
  cache.purchaseOrders = [];
  cache.purchaseRecords = [];
  cache.dailyRecords = [];
  cache.openingBalance = 0;
  notify();
}

// ---------- Daily Records ----------
export function getDailyRecords(): DailyRecord[] {
  return cache.dailyRecords.slice();
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  await api.post('/api/daily-records', {
    id: record.id,
    date: record.date,
    steamProduced: record.steamProduced,
    items: record.items,
    notes: record.notes,
  });
  cache.dailyRecords = await api.get<DailyRecord[]>('/api/daily-records');
  notify();
}

export async function updateDailyRecord(record: DailyRecord): Promise<void> {
  await api.patch(`/api/daily-records/${record.id}`, {
    date: record.date,
    steamProduced: record.steamProduced,
    items: record.items,
    notes: record.notes,
  });
  cache.dailyRecords = await api.get<DailyRecord[]>('/api/daily-records');
  notify();
}

export async function deleteDailyRecord(id: string): Promise<void> {
  await api.del(`/api/daily-records/${id}`);
  cache.dailyRecords = cache.dailyRecords.filter((r) => r.id !== id);
  notify();
}

export function flattenDailyItems(records: DailyRecord[]): Array<{
  date: string;
  itemName: string;
  quantity: number;
  costPerTon: number;
}> {
  const result: Array<{ date: string; itemName: string; quantity: number; costPerTon: number }> = [];
  records.forEach((r) => {
    r.items.forEach((item) => {
      result.push({ date: r.date, itemName: item.itemName, quantity: item.quantity, costPerTon: item.costPerTon });
    });
  });
  return result;
}

// ---------- Purchase Records ----------
export function getPurchaseRecords(): PurchaseRecord[] {
  return cache.purchaseRecords.slice();
}

export async function savePurchaseRecord(record: PurchaseRecord): Promise<void> {
  await api.post('/api/purchase-records', {
    id: record.id,
    date: record.date,
    poId: record.poId,
    quantity: record.quantity,
    builtyNumber: record.builtyNumber,
    truckNumber: record.truckNumber,
    notes: record.notes,
  });
  const [prs, pos] = await Promise.all([
    api.get<PurchaseRecord[]>('/api/purchase-records'),
    api.get<PurchaseOrder[]>('/api/purchase-orders'),
  ]);
  cache.purchaseRecords = prs;
  cache.purchaseOrders = pos;
  notify();
}

export async function updatePurchaseRecord(record: PurchaseRecord): Promise<void> {
  await api.patch(`/api/purchase-records/${record.id}`, {
    date: record.date,
    quantity: record.quantity,
    builtyNumber: record.builtyNumber,
    truckNumber: record.truckNumber,
    notes: record.notes,
  });
  const [prs, pos] = await Promise.all([
    api.get<PurchaseRecord[]>('/api/purchase-records'),
    api.get<PurchaseOrder[]>('/api/purchase-orders'),
  ]);
  cache.purchaseRecords = prs;
  cache.purchaseOrders = pos;
  notify();
}

export async function deletePurchaseRecord(id: string): Promise<void> {
  await api.del(`/api/purchase-records/${id}`);
  const [prs, pos] = await Promise.all([
    api.get<PurchaseRecord[]>('/api/purchase-records'),
    api.get<PurchaseOrder[]>('/api/purchase-orders'),
  ]);
  cache.purchaseRecords = prs;
  cache.purchaseOrders = pos;
  notify();
}

// ---------- Opening Balance ----------
export function getOpeningBalance(): number {
  return cache.openingBalance;
}

export async function setOpeningBalance(val: number): Promise<void> {
  await api.put('/api/settings', { key: 'opening_balance', value: String(val) });
  cache.openingBalance = val;
  notify();
}

// ---------- Vendors ----------
export function getVendors(): Vendor[] {
  return cache.vendors.slice();
}

export async function saveVendor(vendor: Vendor): Promise<void> {
  await api.post('/api/vendors', vendor);
  cache.vendors = [...cache.vendors, vendor].sort((a, b) => a.name.localeCompare(b.name));
  notify();
}

export async function updateVendor(vendor: Vendor): Promise<void> {
  await api.patch(`/api/vendors/${vendor.id}`, vendor);
  cache.vendors = cache.vendors
    .map((v) => (v.id === vendor.id ? vendor : v))
    .sort((a, b) => a.name.localeCompare(b.name));
  notify();
}

export async function deleteVendor(id: string): Promise<void> {
  await api.del(`/api/vendors/${id}`);
  cache.vendors = cache.vendors.filter((v) => v.id !== id);
  notify();
}

// ---------- Purchase Orders ----------
export function getPurchaseOrders(): PurchaseOrder[] {
  return cache.purchaseOrders.slice();
}

export async function savePurchaseOrder(po: PurchaseOrder): Promise<void> {
  const res = await api.post<{ id: string; poNumber: string }>('/api/purchase-orders', {
    id: po.id,
    poNumber: po.poNumber,
    date: po.date,
    vendorId: po.vendorId,
    item: po.item,
    quantity: po.quantity,
    pricePerTon: po.pricePerTon,
    notes: po.notes,
  });
  const saved: PurchaseOrder = { ...po, id: res.id ?? po.id, poNumber: res.poNumber ?? po.poNumber };
  cache.purchaseOrders = [saved, ...cache.purchaseOrders];
  notify();
}

export async function updatePurchaseOrder(po: PurchaseOrder): Promise<void> {
  await api.patch(`/api/purchase-orders/${po.id}`, {
    date: po.date,
    vendorId: po.vendorId,
    item: po.item,
    quantity: po.quantity,
    pricePerTon: po.pricePerTon,
    notes: po.notes,
  });
  cache.purchaseOrders = await api.get<PurchaseOrder[]>('/api/purchase-orders');
  notify();
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await api.del(`/api/purchase-orders/${id}`);
  cache.purchaseOrders = cache.purchaseOrders.filter((o) => o.id !== id);
  notify();
}

export async function nextPoNumber(): Promise<string> {
  const orders = cache.purchaseOrders;
  if (orders.length === 0) return 'PO-0001';
  // Find highest number
  let max = 0;
  for (const o of orders) {
    const m = /PO-(\d+)/.exec(o.poNumber);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `PO-${String(max + 1).padStart(4, '0')}`;
}

// ---------- Items ----------
export function getItems(): Item[] {
  return cache.items.slice();
}

export async function saveItem(item: Item): Promise<void> {
  await api.post('/api/items', item);
  cache.items = [...cache.items, item].sort((a, b) => a.name.localeCompare(b.name));
  notify();
}

export async function updateItem(item: Item): Promise<void> {
  await api.patch(`/api/items/${item.id}`, item);
  cache.items = cache.items.map((i) => (i.id === item.id ? item : i)).sort((a, b) => a.name.localeCompare(b.name));
  notify();
}

export async function deleteItem(id: string): Promise<void> {
  await api.del(`/api/items/${id}`);
  cache.items = cache.items.filter((i) => i.id !== id);
  notify();
}

// ---------- Stock availability ----------
// Client-side computation matching server. Pages call this synchronously.
export function getStockByItem(excludeDailyId?: string): Record<string, number> {
  const stock: Record<string, number> = {};
  for (const p of cache.purchaseRecords) {
    const name = p.item || 'Unspecified';
    stock[name] = (stock[name] ?? 0) + p.quantity;
  }
  for (const d of cache.dailyRecords) {
    if (excludeDailyId && d.id === excludeDailyId) continue;
    for (const i of d.items) {
      const name = i.itemName || 'Unspecified';
      stock[name] = (stock[name] ?? 0) - i.quantity;
    }
  }
  return stock;
}

// Re-export common DailyRecordItem for pages.
export type { DailyRecordItem };
