import { sampleCategories, sampleCommissionLogs, sampleConsumables, sampleFixedCosts, sampleHppPackages, sampleProducts, sampleSimulations, sampleTreatments } from "./sample-data";
import type { CategoryGroup, ElectricitySettings, FixedCostMode, FixedCostSettings, HppCategory, StaffCostItem, StorageSchema } from "./types";

const STORAGE_KEY = "hera-clinic-hpp-commission";

export const initialData: StorageSchema = {
  fixedCosts: sampleFixedCosts,
  treatments: sampleTreatments,
  products: sampleProducts,
  simulations: sampleSimulations,
  commissionLogs: sampleCommissionLogs,
  consumables: sampleConsumables,
  stockAdjustments: [],
  stockOpnames: [],
  hppPackages: sampleHppPackages,
  categories: sampleCategories,
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
  stockAdjustments: [],
  stockOpnames: [],
  hppPackages: [],
  categories: [],
};

const defaultCostModes: Record<string, FixedCostMode> = {
  listrik: "hpp",
  air: "hpp",
  internetTelepon: "hpp",
  sewaTempat: "hpp",
  bpjsTunjangan: "hpp",
  cleaningLaundry: "hpp",
  maintenanceAlat: "hpp",
  marketing: "hpp",
  softwareSubscription: "hpp",
  biayaTetapLain: "hpp",
  cicilanAlat: "cashflow",
  cicilanRenovasi: "cashflow",
  cicilanLain: "cashflow",
};

function defaultStaffCosts(settings: FixedCostSettings): StaffCostItem[] {
  return [
    { id: "staff-dokter", role: "Dokter", count: settings.gajiDokter > 0 ? 1 : 0, salaryPerPerson: settings.gajiDokter, allowancePerPerson: 0, mode: "hpp", overrideManual: true, manualTotal: settings.gajiDokter },
    { id: "staff-therapist", role: "Therapist", count: settings.gajiTherapist > 0 ? 1 : 0, salaryPerPerson: settings.gajiTherapist, allowancePerPerson: 0, mode: "hpp", overrideManual: true, manualTotal: settings.gajiTherapist },
    { id: "staff-beautician", role: "Beautician", count: settings.gajiBeautician > 0 ? 1 : 0, salaryPerPerson: settings.gajiBeautician, allowancePerPerson: 0, mode: "hpp", overrideManual: true, manualTotal: settings.gajiBeautician },
    { id: "staff-admin", role: "Admin", count: settings.gajiAdmin > 0 ? 1 : 0, salaryPerPerson: settings.gajiAdmin, allowancePerPerson: 0, mode: "hpp", overrideManual: true, manualTotal: settings.gajiAdmin },
    { id: "staff-apoteker", role: "Apoteker", count: 0, salaryPerPerson: 0, allowancePerPerson: 0, mode: "hpp", overrideManual: false, manualTotal: 0 },
    { id: "staff-other", role: "Other staff", count: 0, salaryPerPerson: 0, allowancePerPerson: 0, mode: "hpp", overrideManual: false, manualTotal: 0 },
  ];
}

function defaultElectricitySettings(settings: FixedCostSettings): ElectricitySettings {
  return {
    powerVa: 7700,
    group: "Bisnis",
    tariffPerKwh: 1444,
    manualAdjustment: settings.listrik,
    ppjAdminFee: 0,
    otherCharges: 0,
    useCalculatorTotal: true,
    manualOverride: settings.listrik > 0,
    manualMonthlyTotal: settings.listrik,
    mode: "hpp",
    notes: "Tarif per kWh dapat disesuaikan berdasarkan tagihan PLN terbaru.",
    devices: [
      { id: "dev-laser", name: "Laser / IPL machine", watt: 1200, quantity: 1, durationMinutes: 20, usagePerTreatment: 1, estimatedUsesPerMonth: 40, tariffPerKwh: 1444, includeInTreatmentHpp: true, notes: "" },
      { id: "dev-rf", name: "RF machine", watt: 800, quantity: 1, durationMinutes: 30, usagePerTreatment: 1, estimatedUsesPerMonth: 30, tariffPerKwh: 1444, includeInTreatmentHpp: true, notes: "" },
    ],
    acItems: [
      { id: "ac-treatment", name: "Ruang tindakan", pkOption: "1 PK", watt: 900, quantity: 1, hoursPerDay: settings.operatingHours || 8, daysPerMonth: settings.workingDays || 26, efficiencyFactor: 1, tariffPerKwh: 1444, mode: "hpp" },
      { id: "ac-lobby", name: "Lobby", pkOption: "1.5 PK", watt: 1200, quantity: 1, hoursPerDay: settings.operatingHours || 8, daysPerMonth: settings.workingDays || 26, efficiencyFactor: 1, tariffPerKwh: 1444, mode: "hpp" },
    ],
  };
}

export function normalizeFixedCostSettings(settings: FixedCostSettings): FixedCostSettings {
  return {
    ...settings,
    costModes: { ...defaultCostModes, ...(settings.costModes ?? {}) },
    costNotes: settings.costNotes ?? {},
    staffCosts: settings.staffCosts?.length ? settings.staffCosts : defaultStaffCosts(settings),
    electricitySettings: settings.electricitySettings ?? defaultElectricitySettings(settings),
  };
}

function slugCategory(group: CategoryGroup, name: string) {
  return `cat-${group}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function ensureCategory(categories: HppCategory[], group: CategoryGroup, name: string) {
  const existing = categories.find((item) => item.group === group && item.name.toLowerCase() === name.toLowerCase());
  if (existing) return categories;
  const date = new Date().toISOString().slice(0, 10);
  return [...categories, { id: slugCategory(group, name), group, name, active: true, notes: "custom lama", createdAt: date, updatedAt: date }];
}

function normalizeCategories(data: StorageSchema) {
  let categories = data.categories?.length ? data.categories : sampleCategories;
  for (const treatment of data.treatments ?? []) {
    if (treatment.category) categories = ensureCategory(categories, "product", treatment.category);
  }
  for (const product of data.products ?? []) {
    if (product.category) categories = ensureCategory(categories, "product", product.category);
  }
  for (const consumable of data.consumables ?? []) {
    if (consumable.category) categories = ensureCategory(categories, "material", consumable.category);
  }
  return categories;
}

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
  const categories = normalizeCategories(data);
  return {
    ...data,
    fixedCosts: normalizeFixedCostSettings(data.fixedCosts),
    treatments: data.treatments.map((treatment) => ({
      ...treatment,
      disposableItems: treatment.disposableItems ?? treatment.disposableCosts ?? [],
      consumableUsages: treatment.consumableUsages ?? [],
      materialItems: treatment.materialItems ?? [],
      machineItems: treatment.machineItems ?? [],
      deviceElectricityCosts: treatment.deviceElectricityCosts ?? [],
      shotCartridgeCosts: treatment.shotCartridgeCosts ?? [],
      staffFeeCosts: treatment.staffFeeCosts ?? [],
      includeOverhead: treatment.includeOverhead ?? true,
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
    consumables: (data.consumables ?? []).map((item) => {
      const purchaseQuantity = item.purchaseQuantity ?? 1;
      const totalSmallestUnit = item.totalSmallestUnit ?? 0;
      const legacyAvailable = item.availableQuantity ?? purchaseQuantity * totalSmallestUnit;
      const currentStock = item.currentStock ?? legacyAvailable ?? totalSmallestUnit ?? 0;
      const now = new Date().toISOString().slice(0, 10);
      return {
        ...item,
        purchaseQuantity,
        costPerSmallestUnit:
          item.costPerSmallestUnit ?? (totalSmallestUnit > 0 ? item.purchasePrice / totalSmallestUnit : 0),
        availableQuantity: currentStock,
        currentStock,
        stockUnit: item.stockUnit ?? item.smallestUnit,
        minimumStock: item.minimumStock ?? 0,
        active: item.active ?? true,
        createdAt: item.createdAt ?? now,
        updatedAt: item.updatedAt ?? now,
      };
    }),
    stockAdjustments: data.stockAdjustments ?? [],
    stockOpnames: data.stockOpnames ?? [],
    hppPackages: (data.hppPackages ?? []).map((item) => ({
      ...item,
      items: item.items ?? [],
      totalCost: item.totalCost ?? (item.items ?? []).reduce((sum, row) => sum + row.totalCost, 0),
    })),
    categories,
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
