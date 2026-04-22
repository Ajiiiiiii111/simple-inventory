import { NextResponse } from "next/server";

import { deriveProductStatus } from "@/lib/products";
import { getSupabaseUserClient } from "@/lib/supabase/server";

type ProductUpdatePayload = {
  name?: string;
  quantity?: number;
};

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { error: "You must be signed in to access products.", status: 401 as const };
  }

  const token = authorization.slice("Bearer ".length);
  const supabase = getSupabaseUserClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { error: "Your session has expired. Please sign in again.", status: 401 as const };
  }

  return { user: data.user };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const auth = await getAuthenticatedUser(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = (await request.json()) as ProductUpdatePayload;
    const name = payload.name?.trim();
    const quantity = Number(payload.quantity);

    if (!id || !name || Number.isNaN(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: "Enter a valid product name and quantity." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseUserClient(request.headers.get("authorization")!.slice("Bearer ".length));
    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        quantity,
        status: deriveProductStatus(quantity),
      })
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select("id,name,quantity,status")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A product with that name already exists." },
          { status: 409 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const auth = await getAuthenticatedUser(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing product id." }, { status: 400 });
    }

    const supabase = getSupabaseUserClient(request.headers.get("authorization")!.slice("Bearer ".length));
    const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", auth.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
