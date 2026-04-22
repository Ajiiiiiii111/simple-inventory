export type ProductStatus = "Good" | "Low" | "Critical";

export function deriveProductStatus(quantity: number): ProductStatus {
  if (quantity <= 0) {
    return "Critical";
  }

  if (quantity < 10) {
    return "Low";
  }

  return "Good";
}
