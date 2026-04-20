"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { inventoryMetrics, productStatuses, type ProductRow } from "@/lib/inventory";

type ProductFormState = {
  name: string;
  quantity: string;
};

type StockAdjustmentState = {
  name: string;
  quantity: string;
  type: "IN" | "OUT";
};

const storageKey = "simple-inventory-products";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [products, setProducts] = useState<ProductRow[]>(productStatuses);
  const [form, setForm] = useState<ProductFormState>({ name: "", quantity: "" });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustmentState>({
    name: "",
    quantity: "1",
    type: "IN",
  });

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as ProductRow[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setProducts(parsed);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (mode === "add") {
      setEditingProduct(null);
      setForm({ name: "", quantity: "" });
      setMessage("Ready to add a new product.");
    }

    if (mode === "in" || mode === "out") {
      setStockAdjustment((current) => ({ ...current, type: mode === "in" ? "IN" : "OUT" }));
    }
  }, [mode]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.name === editingProduct) ?? null,
    [editingProduct, products],
  );

  useEffect(() => {
    if (selectedProduct) {
      setForm({
        name: selectedProduct.name,
        quantity: String(selectedProduct.quantity),
      });
    }
  }, [selectedProduct]);

  function deriveStatus(quantity: number): ProductRow["status"] {
    if (quantity === 0) {
      return "Critical";
    }

    if (quantity < 10) {
      return "Low";
    }

    return "Good";
  }

  function resetForm() {
    setForm({ name: "", quantity: "" });
    setEditingProduct(null);
  }

  function handleSaveProduct() {
    const trimmedName = form.name.trim();
    const quantity = Number(form.quantity);

    if (!trimmedName || Number.isNaN(quantity) || quantity < 0) {
      setMessage("Enter a valid product name and quantity.");
      return;
    }

    const duplicateName = products.some(
      (product) =>
        product.name.toLowerCase() === trimmedName.toLowerCase() && product.name !== editingProduct,
    );

    if (duplicateName) {
      setMessage("A product with that name already exists.");
      return;
    }

    const nextProduct: ProductRow = {
      name: trimmedName,
      quantity,
      status: deriveStatus(quantity),
    };

    setProducts((current) => {
      const existingIndex = current.findIndex((product) => product.name === editingProduct);

      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = nextProduct;
        return next;
      }

      return [nextProduct, ...current];
    });

    setMessage(editingProduct ? "Product updated." : "Product added.");
    resetForm();
  }

  function handleEditProduct(product: ProductRow) {
    setEditingProduct(product.name);
    setForm({ name: product.name, quantity: String(product.quantity) });
    setMessage(`Editing ${product.name}.`);
  }

  function handleDeleteProduct(name: string) {
    setProducts((current) => current.filter((product) => product.name !== name));

    if (editingProduct === name) {
      resetForm();
    }

    setMessage("Product deleted.");
  }

  function handleStockAdjustment() {
    const quantity = Number(stockAdjustment.quantity);
    const targetName = stockAdjustment.name.trim();

    if (!targetName || Number.isNaN(quantity) || quantity <= 0) {
      setMessage("Select a product and enter a quantity greater than zero.");
      return;
    }

    let matched = false;

    setProducts((current) =>
      current.map((product) => {
        if (product.name !== targetName) {
          return product;
        }

        matched = true;
        const delta = stockAdjustment.type === "IN" ? quantity : -quantity;
        const nextQuantity = Math.max(0, product.quantity + delta);

        return {
          ...product,
          quantity: nextQuantity,
          status: deriveStatus(nextQuantity),
        };
      }),
    );

    setMessage(matched ? `Stock ${stockAdjustment.type.toLowerCase()} recorded.` : "Product not found.");
  }

  const alertCount = products.filter((product) => product.status !== "Good").length;

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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {inventoryMetrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${metric.accent}`} />
              <p className="mt-6 text-sm font-medium text-slate-500">{metric.label}</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {metric.value}
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-5">
          <article className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Quick Actions
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              Manage products
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setForm({ name: "", quantity: "" });
                  setMessage("Ready to add a new product.");
                }}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
              >
                Add Product
              </button>
              <button
                type="button"
                onClick={() => setStockAdjustment((current) => ({ ...current, type: "IN" }))}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Stock In
              </button>
              <button
                type="button"
                onClick={() => setStockAdjustment((current) => ({ ...current, type: "OUT" }))}
                className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Stock Out
              </button>
            </div>

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
                  onClick={handleSaveProduct}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                >
                  {editingProduct ? "Update Product" : "Save Product"}
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
                  value={stockAdjustment.name}
                  onChange={(event) =>
                    setStockAdjustment((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.name} value={product.name}>
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
                onClick={handleStockAdjustment}
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
                  {products.map((product) => (
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
                            onClick={() => handleEditProduct(product)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 font-medium text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.name)}
                            className="rounded-full border border-rose-200 px-3 py-1.5 font-medium text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
