import { NextResponse } from "next/server";

import { getSupabaseUserClient } from "@/lib/supabase/server";

type TransactionRow = {
  id: string;
  name: string;
  type: "IN" | "OUT";
  quantity: number;
  date: string;
};

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { error: "You must be signed in to access transactions.", status: 401 as const };
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
    const requestedLimit = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20;

    const supabase = getSupabaseUserClient(auth.token);

    const [{ data: transactions, error: transactionsError }, { data: products, error: productsError }] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("id,product_id,type,quantity,created_at")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase.from("products").select("id,name").eq("user_id", auth.user.id),
      ]);

    if (transactionsError || productsError || !transactions || !products) {
      return NextResponse.json({ error: transactionsError?.message ?? productsError?.message ?? "Unable to load transactions." }, { status: 500 });
    }

    const productMap = new Map(products.map((product) => [product.id, product.name]));
    const rows: TransactionRow[] = transactions.map((row) => ({
      id: row.id,
      name: productMap.get(row.product_id) ?? "Unknown product",
      type: row.type,
      quantity: row.quantity,
      date: new Date(row.created_at).toISOString().slice(0, 10),
    }));

    return NextResponse.json({ transactions: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
