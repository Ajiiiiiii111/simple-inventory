import { NextResponse } from "next/server";

import { deriveProductStatus } from "@/lib/products";
import { getSupabaseUserClient } from "@/lib/supabase/server";

type StockMovementPayload = {
  productId?: string;
  quantity?: number;
  type?: "IN" | "OUT";
};

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { error: "You must be signed in to update stock.", status: 401 as const };
  }

  const token = authorization.slice("Bearer ".length);
  const supabase = getSupabaseUserClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: "Your session has expired. Please sign in again.", status: 401 as const };
  }

  return { user: data.user };
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = (await request.json()) as StockMovementPayload;
    const productId = payload.productId?.trim();
    const quantity = Number(payload.quantity);
    const type = payload.type;

    if (!productId || Number.isNaN(quantity) || quantity <= 0 || (type !== "IN" && type !== "OUT")) {
      return NextResponse.json(
        { error: "Select a product and enter a quantity greater than zero." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseUserClient(request.headers.get("authorization")!.slice("Bearer ".length));

    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("id,name,quantity")
      .eq("id", productId)
      .eq("user_id", auth.user.id)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (type === "OUT" && quantity > product.quantity) {
      return NextResponse.json(
        {
          error: `Cannot move out ${quantity}. Only ${product.quantity} unit(s) available for ${product.name}.`,
        },
        { status: 400 },
      );
    }

    const delta = type === "IN" ? quantity : -quantity;
    const nextQuantity = product.quantity + delta;

    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update({
        quantity: nextQuantity,
        status: deriveProductStatus(nextQuantity),
      })
      .eq("id", productId)
      .select("id,name,quantity,status")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: transactionError } = await supabase.from("transactions").insert({
      user_id: auth.user.id,
      product_id: productId,
      type,
      quantity,
    });

    if (transactionError) {
      return NextResponse.json({ error: transactionError.message }, { status: 500 });
    }

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
