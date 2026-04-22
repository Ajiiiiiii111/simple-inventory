import { NextResponse } from "next/server";

import { getSupabaseUserClient } from "@/lib/supabase/server";

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { error: "You must be signed in to view dashboard metrics.", status: 401 as const };
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
    const { data, error } = await supabase
      .from("products")
      .select("quantity,status")
      .eq("user_id", auth.user.id);

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to load dashboard metrics." }, { status: 500 });
    }

    return NextResponse.json({
      totalProducts: data.length,
      totalQuantity: data.reduce((sum, product) => sum + product.quantity, 0),
      lowStockItems: data.filter((product) => product.status === "Low").length,
      outOfStockItems: data.filter((product) => product.status === "Critical").length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
