import { NextResponse } from "next/server";

import { getSupabaseUserClient } from "@/lib/supabase/server";

type StockMovementRange = "daily" | "weekly" | "monthly" | "yearly";

type MovementRow = {
  label: string;
  in: number;
  out: number;
};

function normalizeRange(value: string | null): StockMovementRange {
  if (value === "weekly" || value === "monthly" || value === "yearly") {
    return value;
  }

  return "daily";
}

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

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { error: "You must be signed in to access stock movement.", status: 401 as const };
  }

  const token = authorization.slice("Bearer ".length);
  const supabase = getSupabaseUserClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: "Your session has expired. Please sign in again.", status: 401 as const };
  }

  return { user: data.user, token };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const range = normalizeRange(url.searchParams.get("range"));
    const config = getRangeConfig(range);
    const now = startOfDay(new Date());
    const windowStart = getBucketStart(addToDate(now, config.unit, -(config.buckets - 1)), range);

    const labels = Array.from({ length: config.buckets }, (_, index) => {
      const day = getBucketStart(addToDate(windowStart, config.unit, index), range);
      return {
        key: day.toISOString().slice(0, 10),
        label: formatLabel(day, range),
      };
    });

    const series = labels.map((item) => ({ label: item.label, in: 0, out: 0, key: item.key }));

    const supabase = getSupabaseUserClient(auth.token);
    const { data, error } = await supabase
      .from("transactions")
      .select("type,quantity,created_at")
      .eq("user_id", auth.user.id)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: true });

    if (error || !data) {
      return NextResponse.json({ series: series.map((item) => ({ label: item.label, in: item.in, out: item.out })) });
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

    const rows: MovementRow[] = series.map((item) => ({ label: item.label, in: item.in, out: item.out }));
    return NextResponse.json({ series: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
