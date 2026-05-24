import { sampleCommissionLogs, sampleConsumables, sampleFixedCosts, sampleHppPackages, sampleProducts, sampleSimulations, sampleTreatments } from "./sample-data";
import type { StorageSchema } from "./types";

const STORAGE_KEY = "hera-clinic-hpp-commission";

export const initialData: StorageSchema = {
  fixedCosts: sampleFixedCosts,
  treatments: sampleTreatments,
  products: sampleProducts,
  simulations: sampleSimulations,
  commissionLogs: sampleCommissionLogs,
  consumables: sampleConsumables,
  hppPackages: sampleHppPackages,
};

export const emptyData: StorageSchema = {
  fixedCosts: {
    listrik: 0,
    air: 0,
    internetTelepon: 0,
    sewaTempat: 0,
    gajiDokter: 0,
    gajiTherapist: 0,
    gajiBeautician: 0,
    gajiAdmin: 0,
    bpjsTunjangan: 0,
    cleaningLaundry: 0,
    maintenanceAlat: 0,
    marketing: 0,
    softwareSubscription: 0,
    cicilanAlat: 0,
    cicilanRenovasi: 0,
    cicilanLain: 0,
    biayaTetapLain: 0,
    workingDays: 0,
    operatingHours: 0,
    averageCustomers: 0,
  },
  treatments: [],
  products: [],
  simulations: [],
  commissionLogs: [],
  consumables: [],
  hppPackages: [],
};

export function generateId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getData(): StorageSchema {
  if (typeof window === "undefined") return initialData;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveData(initialData);
    return initialData;
  }

  try {
    return normalizeData({ ...initialData, ...JSON.parse(raw) });
  } catch {
    saveData(initialData);
    return initialData;
  }
}

function normalizeData(data: StorageSchema): StorageSchema {
  return {
    ...data,
    treatments: data.treatments.map((treatment) => ({
      ...treatment,
      disposableItems: treatment.disposableItems ?? treatment.disposableCosts ?? [],
      consumableUsages: treatment.consumableUsages ?? [],
      materialItems: treatment.materialItems ?? [],
      machineItems: treatment.machineItems ?? [],
      staffInvolved: treatment.staffInvolved ?? [],
      commissionRules: (treatment.commissionRules ?? []).map((rule) => ({
        ...rule,
        role: rule.role ?? rule.recipient ?? "therapist",
        quantity: rule.quantity ?? 1,
        appliesTo: rule.appliesTo === "Non VIP" ? "Normal" : rule.appliesTo,
      })),
    })),
    products: data.products.map((product) => ({
      ...product,
      commissionRule: {
        ...product.commissionRule,
        role: product.commissionRule.role ?? product.commissionRule.recipient ?? "admin",
        quantity: product.commissionRule.quantity ?? 1,
      },
      commissionRules: (product.commissionRules ?? [{ ...product.commissionRule, appliesTo: "All" }]).map((rule) => {
        const normalizedRule = rule as typeof rule & { appliesTo?: "All" };
        return {
          ...normalizedRule,
          role: normalizedRule.role ?? normalizedRule.recipient ?? "admin",
          quantity: normalizedRule.quantity ?? 1,
          appliesTo: normalizedRule.appliesTo ?? "All",
        };
      }),
    })),
    consumables: (data.consumables ?? []).map((item) => ({
      ...item,
      purchaseQuantity: item.purchaseQuantity ?? 1,
      costPerSmallestUnit:
        item.costPerSmallestUnit ?? (item.totalSmallestUnit > 0 ? item.purchasePrice / item.totalSmallestUnit : 0),
      availableQuantity:
        item.availableQuantity ?? (item.purchaseQuantity ?? 1) * (item.totalSmallestUnit ?? 0),
      minimumStock: item.minimumStock ?? 0,
    })),
    hppPackages: (data.hppPackages ?? []).map((item) => ({
      ...item,
      items: item.items ?? [],
      totalCost: item.totalCost ?? (item.items ?? []).reduce((sum, row) => sum + row.totalCost, 0),
    })),
  };
}

export function saveData(data: StorageSchema) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function updateData<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K],
): StorageSchema {
  const next = { ...getData(), [key]: value };
  saveData(next);
  return next;
}

export function deleteData<K extends "treatments" | "products" | "simulations" | "commissionLogs">(
  key: K,
  id: string,
): StorageSchema {
  const data = getData();
  const next = { ...data, [key]: data[key].filter((item) => item.id !== id) };
  saveData(next);
  return next;
}

export function resetData(): StorageSchema {
  saveData(initialData);
  return initialData;
}

export function clearData(): StorageSchema {
  saveData(emptyData);
  return emptyData;
}
