import { Purchases } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";

const RC_APPLE_KEY = import.meta.env.VITE_RC_APPLE_KEY ?? "";
const RC_GOOGLE_KEY = import.meta.env.VITE_RC_GOOGLE_KEY ?? "";

export type TipTier = {
  productId: string;
  label: string;
  amountUsd: number;
};

// Product IDs must match exactly what's configured in App Store Connect and Google Play Console.
export const TIP_TIERS: TipTier[] = [
  { productId: "pocketsets_tip_small", label: "$1.99", amountUsd: 1.99 },
  { productId: "pocketsets_tip_medium", label: "$4.99", amountUsd: 4.99 },
  { productId: "pocketsets_tip_large", label: "$9.99", amountUsd: 9.99 },
];

let rcConfigured = false;

export async function configureRevenueCat(): Promise<void> {
  if (rcConfigured || !Capacitor.isNativePlatform()) return;
  const platform = Capacitor.getPlatform();
  const apiKey = platform === "ios" ? RC_APPLE_KEY : RC_GOOGLE_KEY;
  if (!apiKey) {
    console.warn("[RC] No API key found — check VITE_RC_APPLE_KEY in .env and rebuild");
    return;
  }
  console.log("[RC] Configuring RevenueCat for", platform);
  await Purchases.configure({ apiKey });
  rcConfigured = true;
  console.log("[RC] Configured successfully");
}

export async function fetchTipProducts(): Promise<TipTier[]> {
  if (!Capacitor.isNativePlatform()) return TIP_TIERS;
  try {
    const { products } = await Purchases.getProducts({
      productIdentifiers: TIP_TIERS.map((t) => t.productId),
    });
    return TIP_TIERS.map((tier) => {
      const storeProduct = products.find(
        (p: any) => p.productIdentifier === tier.productId,
      );
      return storeProduct
        ? { ...tier, label: storeProduct.priceString as string }
        : tier;
    });
  } catch {
    return TIP_TIERS;
  }
}

export async function purchaseTip(
  productId: string,
): Promise<{ success: boolean; cancelled: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    // Simulate purchase in browser/dev
    return { success: true, cancelled: false };
  }
  try {
    const { products } = await Purchases.getProducts({
      productIdentifiers: [productId],
    });
    const product = products[0];
    if (!product) throw new Error("Product not found");
    await Purchases.purchaseStoreProduct({ product });
    return { success: true, cancelled: false };
  } catch (err: any) {
    const cancelled =
      err?.userCancelled === true ||
      err?.code === "PURCHASE_CANCELLED" ||
      String(err?.message ?? "").toLowerCase().includes("cancel");
    if (cancelled) return { success: false, cancelled: true };
    throw err;
  }
}
