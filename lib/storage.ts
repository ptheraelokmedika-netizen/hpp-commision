import { sampleCommissionLogs, sampleFixedCosts, sampleProducts, sampleSimulations, sampleTreatments } from "./sample-data";
import type { StorageSchema } from "./types";

const STORAGE_KEY = "hera-clinic-hpp-commission";

export const initialData: StorageSchema = {
  fixedCosts: sampleFixedCosts,
  treatments: sampleTreatments,
  products: sampleProducts,
  simulations: sampleSimulations,
  commissionLogs: sampleCommissionLogs,
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
