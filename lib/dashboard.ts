import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { MovementRow, PredictionRow, TransactionRow } from "@/lib/inventory";
import { deriveProductStatus } from "@/lib/products";

export type StockMovementRange = "daily" | "weekly" | "monthly" | "yearly";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatLabel(date: Date, range: StockMovementRange) {
  if (range === "daily") {
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  }

  if (range === "weekly") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  }

  if (range === "monthly") {
    return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(date);
}

function getBucketStart(date: Date, range: StockMovementRange) {
  const next = startOfDay(date);

  if (range === "daily") {
    return next;
  }

  if (range === "weekly") {
    next.setDate(next.getDate() - next.getDay());
    return next;
  }

  if (range === "monthly") {
    next.setDate(1);
    return next;
  }

  next.setMonth(0, 1);
  return next;
}

function getRangeConfig(range: StockMovementRange) {
  if (range === "daily") {
    return { buckets: 7, unit: "day" as const };
  }

  if (range === "weekly") {
    return { buckets: 8, unit: "week" as const };
  }

  if (range === "monthly") {
    return { buckets: 12, unit: "month" as const };
  }

  return { buckets: 5, unit: "year" as const };
}

function addToDate(date: Date, unit: "day" | "week" | "month" | "year", amount: number) {
  const next = new Date(date);

  if (unit === "day") {
    next.setDate(next.getDate() + amount);
  } else if (unit === "week") {
    next.setDate(next.getDate() + amount * 7);
  } else if (unit === "month") {
    next.setMonth(next.getMonth() + amount);
  } else {
    next.setFullYear(next.getFullYear() + amount);
  }

  return next;
}

export async function getRecentTransactions(limit = 20): Promise<TransactionRow[]> {
  let supabase;

  try {
    supabase = getSupabaseAdmin();
  } catch {
    return [];
  }

  const [{ data: transactions, error: transactionsError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("product_id,type,quantity,created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase.from("products").select("id,name"),
    ]);

  if (transactionsError || productsError || !transactions || !products) {
    return [];
  }

  const productMap = new Map(products.map((product) => [product.id, product.name]));

  return transactions.map((row) => ({
    name: productMap.get(row.product_id) ?? "Unknown product",
    type: row.type,
    quantity: row.quantity,
    date: new Date(row.created_at).toISOString().slice(0, 10),
  }));
}

export async function getStockMovementSeries(range: StockMovementRange = "daily"): Promise<MovementRow[]> {
  const config = getRangeConfig(range);
  const now = startOfDay(new Date());
  const windowStart = getBucketStart(addToDate(now, config.unit, -(config.buckets - 1)), range);

  let supabase;

  try {
    supabase = getSupabaseAdmin();
  } catch {
    return Array.from({ length: config.buckets }, (_, index) => {
      const day = getBucketStart(addToDate(windowStart, config.unit, index), range);

      return {
        label: formatLabel(day, range),
        in: 0,
        out: 0,
      };
    });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("type,quantity,created_at")
    .gte("created_at", windowStart.toISOString())
    .order("created_at", { ascending: true });

  const labels = Array.from({ length: config.buckets }, (_, index) => {
    const day = getBucketStart(addToDate(windowStart, config.unit, index), range);
    return {
      key: day.toISOString().slice(0, 10),
      label: formatLabel(day, range),
    };
  });

  const series = labels.map((item) => ({ label: item.label, in: 0, out: 0, key: item.key }));

  if (error || !data) {
    return series.map((item) => ({ label: item.label, in: item.in, out: item.out }));
  }

  for (const row of data) {
    const bucketStart = getBucketStart(new Date(row.created_at), range).toISOString().slice(0, 10);
    const bucket = series.find((item) => item.key === bucketStart);

    if (!bucket) {
      continue;
    }

    if (row.type === "IN") {
      bucket.in += row.quantity;
    } else {
      bucket.out += row.quantity;
    }
  }

  return series.map((item) => ({ label: item.label, in: item.in, out: item.out }));
}

export async function getPredictions(): Promise<PredictionRow[]> {
  let supabase;

  try {
    supabase = getSupabaseAdmin();
  } catch {
    return [];
  }

  const [productsResult, transactionsResult] = await Promise.all([
    supabase.from("products").select("id,name,quantity,status").order("quantity", { ascending: true }),
    supabase.from("transactions").select("product_id,type,quantity,created_at").order("created_at", { ascending: false }).limit(100),
  ]);

  const products = productsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];

  if (products.length === 0) {
    return [];
  }

  return products.slice(0, 5).map((product) => {
    const recentOut = transactions
      .filter((transaction) => transaction.product_id === product.id && transaction.type === "OUT")
      .slice(0, 5)
      .reduce((total, transaction) => total + transaction.quantity, 0);

    const recentIn = transactions
      .filter((transaction) => transaction.product_id === product.id && transaction.type === "IN")
      .slice(0, 5)
      .reduce((total, transaction) => total + transaction.quantity, 0);

    const netOut = Math.max(recentOut - recentIn, 1);
    const estimatedDaysLeft = Math.max(Math.floor(product.quantity / netOut), 0);

    const risk: PredictionRow["risk"] =
      product.quantity === 0 || estimatedDaysLeft <= 3
        ? "High"
        : estimatedDaysLeft <= 7 || product.status === "Low"
          ? "Medium"
          : "Low";

    const recommendation =
      product.quantity === 0
        ? "Mark unavailable and restock immediately."
        : risk === "High"
          ? "Trigger a purchase order today."
          : risk === "Medium"
            ? "Monitor weekly and prepare a replenishment plan."
            : "Stock is healthy, continue monitoring sales pace.";

    return {
      name: product.name,
      currentQuantity: product.quantity,
      estimatedDaysLeft,
      risk,
      recommendation,
    };
  });
}

export async function getDashboardMetrics() {
  let supabase;

  try {
    supabase = getSupabaseAdmin();
  } catch {
    return {
      totalProducts: 0,
      totalQuantity: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
    };
  }

  const { data, error } = await supabase.from("products").select("quantity,status");

  if (error || !data) {
    return {
      totalProducts: 0,
      totalQuantity: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
    };
  }

  return {
    totalProducts: data.length,
    totalQuantity: data.reduce((sum, product) => sum + product.quantity, 0),
    lowStockItems: data.filter((product) => deriveProductStatus(product.quantity) === "Low").length,
    outOfStockItems: data.filter((product) => deriveProductStatus(product.quantity) === "Critical").length,
  };
}
