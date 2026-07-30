"use client";

import { isIosAppStoreShell } from "@/lib/app-shell";
import type { CreditPackSummary } from "@/lib/api-client";

let configuredForUserId = "";

export type AppStoreProductSummary = {
  productId: string;
  title: string;
  priceLabel: string;
};

export function appStorePurchasesAvailable() {
  return isIosAppStoreShell() && Boolean(process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY);
}

export async function configureAppStorePurchases(userId: string) {
  if (!appStorePurchasesAvailable()) return false;
  if (configuredForUserId === userId) return true;

  const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
  await Purchases.configure({
    apiKey: process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY || "",
    appUserID: userId
  });
  configuredForUserId = userId;
  return true;
}

export async function loadAppStoreProducts(packs: CreditPackSummary[], userId: string) {
  const configured = await configureAppStorePurchases(userId);
  if (!configured) return new Map<string, AppStoreProductSummary>();

  const productIdentifiers = packs
    .map((pack) => pack.appStoreProductId)
    .filter((id): id is string => Boolean(id));

  if (!productIdentifiers.length) return new Map<string, AppStoreProductSummary>();

  const { Purchases, PRODUCT_CATEGORY } = await import("@revenuecat/purchases-capacitor");
  const result = await Purchases.getProducts({
    productIdentifiers,
    type: PRODUCT_CATEGORY.NON_SUBSCRIPTION
  });

  return new Map(
    result.products.map((product) => [
      product.identifier,
      {
        productId: product.identifier,
        title: product.title || product.identifier,
        priceLabel: product.priceString || ""
      }
    ])
  );
}

export async function purchaseAppStoreCreditPack(input: {
  pack: CreditPackSummary;
  userId: string;
}) {
  if (!input.pack.appStoreProductId) throw new Error("missing_app_store_product");
  await configureAppStorePurchases(input.userId);

  const { Purchases, PRODUCT_CATEGORY } = await import("@revenuecat/purchases-capacitor");
  const result = await Purchases.getProducts({
    productIdentifiers: [input.pack.appStoreProductId],
    type: PRODUCT_CATEGORY.NON_SUBSCRIPTION
  });
  const product = result.products.find((candidate) => candidate.identifier === input.pack.appStoreProductId);
  if (!product) throw new Error("app_store_product_unavailable");

  await Purchases.purchaseStoreProduct({ product });
  return true;
}
