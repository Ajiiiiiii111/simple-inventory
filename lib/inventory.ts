export type ProductStatus = "Good" | "Low" | "Critical";

export type TransactionType = "IN" | "OUT";

export type ProductRow = {
  name: string;
  quantity: number;
  status: ProductStatus;
};

export type TransactionRow = {
  id: string;
  name: string;
  type: TransactionType;
  quantity: number;
  date: string;
};

export type MovementRow = {
  label: string;
  in: number;
  out: number;
};

export type PredictionRow = {
  name: string;
  currentQuantity: number;
  estimatedDaysLeft: number;
  risk: "Low" | "Medium" | "High";
  recommendation: string;
};

export const inventoryMetrics = [
  {
    label: "Total Products",
    value: "248",
    detail: "Unique items tracked across all categories",
    accent: "from-slate-900 to-slate-700",
  },
  {
    label: "Total Stock Quantity",
    value: "8,420",
    detail: "Combined units available in inventory",
    accent: "from-emerald-600 to-teal-500",
  },
  {
    label: "Low Stock Items",
    value: "17",
    detail: "Items below the reorder threshold of 10",
    accent: "from-amber-500 to-orange-500",
  },
  {
    label: "Out of Stock Items",
    value: "6",
    detail: "Products currently unavailable for sale",
    accent: "from-rose-600 to-red-500",
  },
];

export const productStatuses: ProductRow[] = [
  { name: "Wireless Mouse", quantity: 42, status: "Good" },
  { name: "USB-C Cable", quantity: 9, status: "Low" },
  { name: "Laptop Stand", quantity: 3, status: "Critical" },
  { name: "Desk Lamp", quantity: 18, status: "Good" },
  { name: "Keyboard", quantity: 0, status: "Critical" },
  { name: "Monitor Arm", quantity: 12, status: "Good" },
];

export const recentTransactions: TransactionRow[] = [
  { id: "tx-1", name: "Wireless Mouse", type: "IN", quantity: 25, date: "2026-04-20" },
  { id: "tx-2", name: "USB-C Cable", type: "OUT", quantity: 4, date: "2026-04-20" },
  { id: "tx-3", name: "Laptop Stand", type: "OUT", quantity: 2, date: "2026-04-19" },
  { id: "tx-4", name: "Desk Lamp", type: "IN", quantity: 12, date: "2026-04-18" },
  { id: "tx-5", name: "Keyboard", type: "OUT", quantity: 1, date: "2026-04-18" },
];

export const stockMovements: MovementRow[] = [
  { label: "Mon", in: 45, out: 22 },
  { label: "Tue", in: 38, out: 28 },
  { label: "Wed", in: 51, out: 20 },
  { label: "Thu", in: 29, out: 34 },
  { label: "Fri", in: 62, out: 26 },
  { label: "Sat", in: 33, out: 18 },
  { label: "Sun", in: 41, out: 31 },
];

export const predictions: PredictionRow[] = [
  {
    name: "USB-C Cable",
    currentQuantity: 9,
    estimatedDaysLeft: 6,
    risk: "High",
    recommendation: "Restock immediately and raise the reorder point.",
  },
  {
    name: "Laptop Stand",
    currentQuantity: 3,
    estimatedDaysLeft: 3,
    risk: "High",
    recommendation: "Trigger a purchase order today.",
  },
  {
    name: "Keyboard",
    currentQuantity: 0,
    estimatedDaysLeft: 0,
    risk: "High",
    recommendation: "Mark unavailable and restock before next sales cycle.",
  },
  {
    name: "Desk Lamp",
    currentQuantity: 18,
    estimatedDaysLeft: 12,
    risk: "Medium",
    recommendation: "Monitor weekly and prepare a replenishment plan.",
  },
  {
    name: "Monitor Arm",
    currentQuantity: 12,
    estimatedDaysLeft: 9,
    risk: "Medium",
    recommendation: "Review sales pace and queue a restock.",
  },
];
