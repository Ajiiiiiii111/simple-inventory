"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ProductRow } from "@/lib/inventory";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ProductFormState = {
  name: string;
  quantity: string;
};

type StockAdjustmentState = {
  productId: string;
  quantity: string;
  type: "IN" | "OUT";
};

type ProductRecord = ProductRow & {
  id: string;
};

type PendingAction =
  | { type: "save-product" }
  | { type: "apply-stock-movement" }
  | { type: "edit-product"; product: ProductRecord }
  | { type: "delete-product"; product: ProductRecord };

function getModeFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("mode");
}

export default function ProductsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const hasSupabaseConfig = Boolean(supabase);
  const mode = useMemo(() => getModeFromUrl(), []);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<ProductFormState>({ name: "", quantity: "" });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [message, setMessage] = useState(
    hasSupabaseConfig
      ? mode === "add"
        ? "Ready to add a new product."
        : ""
      : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const accessTokenRef = useRef<string | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustmentState>(() => ({
    productId: "",
    quantity: "1",
    type: mode === "out" ? "OUT" : "IN",
  }));

  async function fetchProducts(token: string | null) {
    try {
      if (!token) {
        setProducts([]);
        setMessage("Sign in to view and manage your products.");
        return;
      }

      const response = await fetch("/api/products", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = (await response.json()) as { error?: string; products?: ProductRecord[] };

      if (!response.ok) {
        setMessage(body.error ?? "Unable to load products.");
        return;
      }

      setProducts(Array.isArray(body.products) ? body.products : []);
    } catch {
      setMessage("Unable to load products.");
    }
  }

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    const supabaseClient = client;

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabaseClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      const token = data.session?.access_token ?? null;
      accessTokenRef.current = token;
      await fetchProducts(token);
    }

    void loadSession();

    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      const token = session?.access_token ?? null;
      accessTokenRef.current = token;
      void fetchProducts(token);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  function resetForm() {
    setForm({ name: "", quantity: "" });
    setEditingProductId(null);
  }

  async function saveProduct() {
    const trimmedName = form.name.trim();
    const quantity = Number(form.quantity);

    if (!trimmedName || Number.isNaN(quantity) || quantity < 0) {
      setMessage("Enter a valid product name and quantity.");
      return;
    }

    const duplicateName = products.some(
      (product) =>
        product.name.toLowerCase() === trimmedName.toLowerCase() && product.id !== editingProductId,
    );

    if (duplicateName) {
      setMessage("A product with that name already exists.");
      return;
    }

    const isEditing = Boolean(editingProductId);

    try {
      setIsSubmitting(true);
      const response = await fetch(isEditing ? `/api/products/${editingProductId}` : "/api/products", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {}),
        },
        body: JSON.stringify({ name: trimmedName, quantity }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(body.error ?? "Unable to save product.");
        return;
      }

      await fetchProducts(accessTokenRef.current);
      setMessage(isEditing ? "Product updated." : "Product added.");
      resetForm();
    } catch {
      setMessage("Unable to save product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function editProduct(product: ProductRecord) {
    setEditingProductId(product.id);
    setForm({ name: product.name, quantity: String(product.quantity) });
    setMessage(`Editing ${product.name}.`);
  }

  async function deleteProduct(product: ProductRecord) {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
        headers: accessTokenRef.current
          ? {
              Authorization: `Bearer ${accessTokenRef.current}`,
            }
          : undefined,
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(body.error ?? "Unable to delete product.");
        return;
      }

      await fetchProducts(accessTokenRef.current);

      if (editingProductId === product.id) {
        resetForm();
      }

      if (stockAdjustment.productId === product.id) {
        setStockAdjustment((current) => ({ ...current, productId: "" }));
      }

      setMessage("Product deleted.");
    } catch {
      setMessage("Unable to delete product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function applyStockAdjustment() {
    const quantity = Number(stockAdjustment.quantity);
    const productId = stockAdjustment.productId.trim();

    if (!productId || Number.isNaN(quantity) || quantity <= 0) {
      setMessage("Select a product and enter a quantity greater than zero.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/stock-movement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {}),
        },
        body: JSON.stringify({
          productId,
          quantity,
          type: stockAdjustment.type,
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(body.error ?? "Unable to apply stock movement.");
        return;
      }

      await fetchProducts(accessTokenRef.current);
      setMessage(`Stock ${stockAdjustment.type.toLowerCase()} recorded.`);
      setStockAdjustment((current) => ({ ...current, quantity: "1" }));
    } catch {
      setMessage("Unable to apply stock movement.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestSaveProduct() {
    const trimmedName = form.name.trim();
    const quantity = Number(form.quantity);

    if (!trimmedName || Number.isNaN(quantity) || quantity < 0) {
      setMessage("Enter a valid product name and quantity.");
      return;
    }

    const duplicateName = products.some(
      (product) =>
        product.name.toLowerCase() === trimmedName.toLowerCase() && product.id !== editingProductId,
    );

    if (duplicateName) {
      setMessage("A product with that name already exists.");
      return;
    }

    setPendingAction({ type: "save-product" });
  }

  function requestApplyStockAdjustment() {
    const quantity = Number(stockAdjustment.quantity);
    const productId = stockAdjustment.productId.trim();
    const selectedProduct = products.find((product) => product.id === productId);

    if (!productId || Number.isNaN(quantity) || quantity <= 0) {
      setMessage("Select a product and enter a quantity greater than zero.");
      return;
    }

    if (stockAdjustment.type === "OUT" && selectedProduct && quantity > selectedProduct.quantity) {
      setMessage(
        `Cannot move out ${quantity}. Only ${selectedProduct.quantity} unit(s) available for ${selectedProduct.name}.`,
      );
      return;
    }

    setPendingAction({ type: "apply-stock-movement" });
  }

  function requestEditProduct(product: ProductRecord) {
    setPendingAction({ type: "edit-product", product });
  }

  function requestDeleteProduct(product: ProductRecord) {
    setPendingAction({ type: "delete-product", product });
  }

  async function handleConfirmAction() {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === "save-product") {
      await saveProduct();
    }

    if (pendingAction.type === "apply-stock-movement") {
      await applyStockAdjustment();
    }

    if (pendingAction.type === "edit-product") {
      editProduct(pendingAction.product);
    }

    if (pendingAction.type === "delete-product") {
      await deleteProduct(pendingAction.product);
    }

    setPendingAction(null);
  }

  const alertCount = products.filter((product) => product.status !== "Good").length;
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, searchQuery]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2ff_45%,_#e2e8f0_100%)] px-6 py-10 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Dashboard / Products
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Product management and stock alerts.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Track product quantity, identify low stock items, and manage inventory actions.
          </p>
        </header>

        {message ? (
          <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
            {message}
          </div>
        ) : null}

        {!hasSupabaseConfig ? (
          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
            Supabase is not configured yet. Add your project URL and anon key to .env.local, then
            restart the dev server.
          </article>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-5">
          <article className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:col-span-2">
            <div className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Product Name</label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Enter product name"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Current Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  placeholder="0"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={requestSaveProduct}
                  disabled={!hasSupabaseConfig}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                >
                  {editingProductId ? "Update Product" : "Save Product"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4 rounded-3xl bg-emerald-50 p-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Stock Movement</label>
                <select
                  value={stockAdjustment.productId}
                  onChange={(event) =>
                    setStockAdjustment((current) => ({ ...current, productId: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <select
                    value={stockAdjustment.type}
                    onChange={(event) =>
                      setStockAdjustment((current) => ({
                        ...current,
                        type: event.target.value as "IN" | "OUT",
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={stockAdjustment.quantity}
                    onChange={(event) =>
                      setStockAdjustment((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={requestApplyStockAdjustment}
                disabled={!hasSupabaseConfig}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Apply Stock Movement
              </button>
            </div>
          </article>

          <article className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:col-span-3">
            <div className="border-b border-slate-200/80 px-6 py-5 sm:px-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">Products</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Add, edit, delete, and monitor stock alerts.
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-500">{alertCount} alerts active</span>
              </div>
              <div className="mt-4">
                <label htmlFor="product-search" className="text-sm font-medium text-slate-700">
                  Search product
                </label>
                <input
                  id="product-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by product name"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 sm:px-7">
                      Product Name
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Current Quantity
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProducts.map((product) => (
                    <tr key={product.name} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 sm:px-7">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{product.quantity}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                              product.status === "Critical"
                                ? "bg-rose-100 text-rose-700"
                                : product.status === "Low"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {product.status}
                          </span>
                          {product.status !== "Good" ? (
                            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                              Alert
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => requestEditProduct(product)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 font-medium text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteProduct(product)}
                            className="rounded-full border border-rose-200 px-3 py-1.5 font-medium text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-sm text-slate-500 sm:px-7"
                      >
                        {searchQuery.trim()
                          ? "No products match your search."
                          : "No products found for this account yet. Add your first product."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>

      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
            <h3 className="text-lg font-semibold text-slate-950">Confirm action</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {pendingAction.type === "save-product"
                ? `Are you sure you want to ${editingProductId ? "update" : "save"} this product?`
                : pendingAction.type === "apply-stock-movement"
                  ? `Apply ${stockAdjustment.type} movement for ${stockAdjustment.quantity} unit(s)?`
                  : pendingAction.type === "edit-product"
                    ? `Load ${pendingAction.product.name} into the form for editing?`
                    : `Delete ${pendingAction.product.name}? This cannot be undone.`}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                {isSubmitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
