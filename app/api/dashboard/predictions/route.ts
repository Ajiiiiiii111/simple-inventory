import { NextResponse } from "next/server";

import { getSupabaseUserClient } from "@/lib/supabase/server";

type PredictionRow = {
  name: string;
  currentQuantity: number;
  estimatedDaysLeft: number;
  risk: "Low" | "Medium" | "High";
  recommendation: string;
};

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { error: "You must be signed in to access predictions.", status: 401 as const };
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

    const supabase = getSupabaseUserClient(auth.token);

    const [productsResult, transactionsResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,quantity,status")
        .eq("user_id", auth.user.id)
        .order("quantity", { ascending: true }),
      supabase
        .from("transactions")
        .select("product_id,type,quantity,created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (productsResult.error || transactionsResult.error) {
      return NextResponse.json(
        { error: productsResult.error?.message ?? transactionsResult.error?.message ?? "Unable to load predictions." },
        { status: 500 },
      );
    }

    const products = productsResult.data ?? [];
    const transactions = transactionsResult.data ?? [];

    if (products.length === 0) {
      return NextResponse.json({ predictions: [] });
    }

    const predictions: PredictionRow[] = products.slice(0, 5).map((product) => {
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

    return NextResponse.json({ predictions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
