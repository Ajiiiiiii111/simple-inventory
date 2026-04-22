import { NextResponse } from "next/server";

import { deriveProductStatus } from "@/lib/products";
import { getSupabaseUserClient } from "@/lib/supabase/server";

type ProductInsertPayload = {
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

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.user ? getSupabaseUserClient(request.headers.get("authorization")!.slice("Bearer ".length)) : null;
    if (!supabase) {
      return NextResponse.json({ error: "Unable to create authenticated client." }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("products")
      .select("id,name,quantity,status")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = (await request.json()) as ProductInsertPayload;
    const name = payload.name?.trim();
    const quantity = Number(payload.quantity);

    if (!name || Number.isNaN(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: "Enter a valid product name and quantity." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseUserClient(request.headers.get("authorization")!.slice("Bearer ".length));
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id: auth.user.id,
        name,
        quantity,
        status: deriveProductStatus(quantity),
      })
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

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
