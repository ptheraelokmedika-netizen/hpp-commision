import { eq, inArray } from "drizzle-orm";
import { initialData } from "../../lib/storage";
import type { CommissionLog, FixedCostSettings, Product, SimulationRecord, StorageSchema, Treatment } from "../../lib/types";
import { getDb } from "./index";
import { commissionLogs, fixedCostSettings, products, simulationRecords, treatments } from "./schema";

const SETTINGS_ID = "hera-clinic-default";

function settingsToDb(settings: FixedCostSettings) {
  return {
    id: SETTINGS_ID,
    electricityMonthly: settings.listrik,
    waterMonthly: settings.air,
    internetMonthly: settings.internetTelepon,
    rentMonthly: settings.sewaTempat,
    doctorSalary: settings.gajiDokter,
    therapistSalary: settings.gajiTherapist,
    beauticianSalary: settings.gajiBeautician,
    adminSalary: settings.gajiAdmin,
    bpjsAllowance: settings.bpjsTunjangan,
    cleaningLaundry: settings.cleaningLaundry,
    machineMaintenance: settings.maintenanceAlat,
    marketing: settings.marketing,
    softwareSubscription: settings.softwareSubscription,
    equipmentInstallment: settings.cicilanAlat,
    renovationInstallment: settings.cicilanRenovasi,
    otherInstallment: settings.cicilanLain,
    otherFixedCost: settings.biayaTetapLain,
    workingDaysPerMonth: settings.workingDays,
    operatingHoursPerDay: settings.operatingHours,
    averageCustomersPerMonth: settings.averageCustomers,
    updatedAt: new Date(),
  };
}

function settingsFromDb(row: typeof fixedCostSettings.$inferSelect): FixedCostSettings {
  return {
    listrik: row.electricityMonthly,
    air: row.waterMonthly,
    internetTelepon: row.internetMonthly,
    sewaTempat: row.rentMonthly,
    gajiDokter: row.doctorSalary,
    gajiTherapist: row.therapistSalary,
    gajiBeautician: row.beauticianSalary,
    gajiAdmin: row.adminSalary,
    bpjsTunjangan: row.bpjsAllowance,
    cleaningLaundry: row.cleaningLaundry,
    maintenanceAlat: row.machineMaintenance,
    marketing: row.marketing,
    softwareSubscription: row.softwareSubscription,
    cicilanAlat: row.equipmentInstallment,
    cicilanRenovasi: row.renovationInstallment,
    cicilanLain: row.otherInstallment,
    biayaTetapLain: row.otherFixedCost,
    workingDays: row.workingDaysPerMonth,
    operatingHours: row.operatingHoursPerDay,
    averageCustomers: row.averageCustomersPerMonth,
  };
}

function treatmentToDb(treatment: Treatment) {
  const disposableItems = treatment.disposableItems ?? treatment.disposableCosts ?? [];
  return {
    id: treatment.id,
    name: treatment.name,
    category: treatment.category,
    durationMinutes: treatment.durationMinutes,
    defaultNonVipPrice: treatment.nonVipPrice,
    defaultVipPrice: treatment.vipPrice,
    promoPrice: treatment.promoPrice,
    targetMarginPercent: treatment.targetMarginPercent,
    staffInvolved: treatment.staffInvolved,
    disposableItems,
    materialItems: treatment.materialItems ?? [],
    machineItems: treatment.machineItems ?? [],
    commissionRules: treatment.commissionRules ?? [],
    updatedAt: new Date(),
  };
}

function treatmentFromDb(row: typeof treatments.$inferSelect): Treatment {
  const disposableItems = row.disposableItems as Treatment["disposableItems"];
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    durationMinutes: row.durationMinutes,
    disposableCosts: disposableItems ?? [],
    disposableItems: disposableItems ?? [],
    materialItems: (row.materialItems as Treatment["materialItems"]) ?? [],
    machineItems: (row.machineItems as Treatment["machineItems"]) ?? [],
    productMaterialCost: 0,
    machineCostAllocation: 0,
    staffInvolved: (row.staffInvolved as Treatment["staffInvolved"]) ?? [],
    nonVipPrice: row.defaultNonVipPrice,
    vipPrice: row.defaultVipPrice,
    promoPrice: row.promoPrice,
    targetMarginPercent: row.targetMarginPercent,
    commissionRules: (row.commissionRules as Treatment["commissionRules"]) ?? [],
  };
}

function productToDb(product: Product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    supplier: product.supplier,
    buyingTiers: product.buyingTiers,
    normalPrice: product.normalPrice,
    vipPrice: product.vipPrice,
    promoPrice: product.promoPrice,
    stockQuantity: product.stockQuantity ?? null,
    commissionRules: product.commissionRules ?? [{ ...product.commissionRule, appliesTo: "All" }],
    updatedAt: new Date(),
  };
}

function productFromDb(row: typeof products.$inferSelect): Product {
  const rules = row.commissionRules as Product["commissionRules"];
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supplier: row.supplier,
    buyingTiers: (row.buyingTiers as Product["buyingTiers"]) ?? [],
    selectedTierId: ((row.buyingTiers as Product["buyingTiers"]) ?? [])[0]?.id ?? "",
    normalPrice: row.normalPrice,
    vipPrice: row.vipPrice,
    promoPrice: row.promoPrice,
    stockQuantity: row.stockQuantity ?? undefined,
    commissionRule: rules?.[0] ?? {
      id: "default",
      role: "sales",
      quantity: 1,
      type: "fixed",
      value: 0,
      staffName: "",
      notes: "",
    },
    commissionRules: rules ?? [],
  };
}

function simulationToDb(record: SimulationRecord) {
  return {
    id: record.id,
    itemType: record.itemType,
    itemId: record.itemId,
    itemName: record.itemName,
    customerType: record.customerType,
    sellingPrice: Math.round(record.sellingPrice),
    quantity: record.quantity,
    directHpp: Math.round(record.directHpp),
    overheadCost: Math.round(record.overheadAllocated),
    totalCost: Math.round(record.totalCost),
    grossProfit: Math.round(record.grossProfit),
    totalCommission: Math.round(record.totalCommission),
    netProfit: Math.round(record.netProfit),
    marginPercent: Math.round(record.marginPercent * 100),
    commissionBreakdown: [],
    notes: record.notes ?? null,
  };
}

function simulationFromDb(row: typeof simulationRecords.$inferSelect): SimulationRecord {
  return {
    id: row.id,
    date: row.createdAt.toISOString().slice(0, 10),
    itemType: row.itemType as SimulationRecord["itemType"],
    itemId: row.itemId,
    itemName: row.itemName,
    customerType: row.customerType as SimulationRecord["customerType"],
    sellingPrice: row.sellingPrice,
    quantity: row.quantity,
    staffName: "",
    staffRole: "admin",
    commissionMode: "default",
    directHpp: row.directHpp,
    overheadAllocated: row.overheadCost,
    totalCost: row.totalCost,
    grossProfit: row.grossProfit,
    totalCommission: row.totalCommission,
    netProfit: row.netProfit,
    marginPercent: row.marginPercent / 100,
    notes: row.notes ?? undefined,
  };
}

function logToDb(log: CommissionLog) {
  return {
    id: log.id,
    date: log.date,
    customerName: log.customerName,
    itemType: log.itemType === "Treatment" ? "treatment" : "product",
    itemId: "",
    itemName: log.itemName,
    customerType: log.customerType,
    sellingPrice: Math.round(log.sellingPrice),
    quantity: log.quantity,
    staffName: log.staffName,
    staffRole: log.staffRole,
    commissionAmount: Math.round(log.commissionAmount),
    totalSales: Math.round(log.sellingPrice * log.quantity),
    totalHpp: 0,
    netProfit: Math.round(log.netProfit),
    paymentStatus: log.paymentStatus === "Sudah dibayar" ? "paid" : "unpaid",
    notes: log.notes ?? null,
    updatedAt: new Date(),
  };
}

function logFromDb(row: typeof commissionLogs.$inferSelect): CommissionLog {
  return {
    id: row.id,
    date: row.date,
    customerName: row.customerName,
    itemName: row.itemName,
    itemType: row.itemType === "treatment" ? "Treatment" : "Produk",
    customerType: row.customerType as CommissionLog["customerType"],
    sellingPrice: row.sellingPrice,
    quantity: row.quantity,
    staffName: row.staffName,
    staffRole: row.staffRole as CommissionLog["staffRole"],
    commissionAmount: row.commissionAmount,
    netProfit: row.netProfit,
    paymentStatus: row.paymentStatus === "paid" ? "Sudah dibayar" : "Belum dibayar",
    notes: row.notes ?? undefined,
  };
}

export async function getAppData(): Promise<StorageSchema> {
  const db = getDb();
  const [settingsRows, treatmentRows, productRows, simulationRows, logRows] = await Promise.all([
    db.select().from(fixedCostSettings),
    db.select().from(treatments),
    db.select().from(products),
    db.select().from(simulationRecords),
    db.select().from(commissionLogs),
  ]);

  return {
    fixedCosts: settingsRows[0] ? settingsFromDb(settingsRows[0]) : initialData.fixedCosts,
    treatments: treatmentRows.map(treatmentFromDb),
    products: productRows.map(productFromDb),
    simulations: simulationRows.map(simulationFromDb),
    commissionLogs: logRows.map(logFromDb),
  };
}

export async function replaceAppData(data: StorageSchema) {
  const db = getDb();
  await db.delete(fixedCostSettings);
  await db.delete(treatments);
  await db.delete(products);
  await db.delete(simulationRecords);
  await db.delete(commissionLogs);

  await db.insert(fixedCostSettings).values(settingsToDb(data.fixedCosts));
  if (data.treatments.length) await db.insert(treatments).values(data.treatments.map(treatmentToDb));
  if (data.products.length) await db.insert(products).values(data.products.map(productToDb));
  if (data.simulations.length) await db.insert(simulationRecords).values(data.simulations.map(simulationToDb));
  if (data.commissionLogs.length) await db.insert(commissionLogs).values(data.commissionLogs.map(logToDb));
}

export async function updateSettings(settings: FixedCostSettings) {
  const db = getDb();
  await db
    .insert(fixedCostSettings)
    .values(settingsToDb(settings))
    .onConflictDoUpdate({ target: fixedCostSettings.id, set: settingsToDb(settings) });
}

export async function upsertTreatment(treatment: Treatment) {
  const db = getDb();
  await db.insert(treatments).values(treatmentToDb(treatment)).onConflictDoUpdate({ target: treatments.id, set: treatmentToDb(treatment) });
}

export async function deleteTreatment(id: string) {
  await getDb().delete(treatments).where(eq(treatments.id, id));
}

export async function upsertProduct(product: Product) {
  const db = getDb();
  await db.insert(products).values(productToDb(product)).onConflictDoUpdate({ target: products.id, set: productToDb(product) });
}

export async function deleteProduct(id: string) {
  await getDb().delete(products).where(eq(products.id, id));
}

export async function createSimulation(record: SimulationRecord) {
  await getDb().insert(simulationRecords).values(simulationToDb(record));
}

export async function deleteSimulation(id: string) {
  await getDb().delete(simulationRecords).where(eq(simulationRecords.id, id));
}

export async function upsertCommissionLog(log: CommissionLog) {
  const db = getDb();
  await db.insert(commissionLogs).values(logToDb(log)).onConflictDoUpdate({ target: commissionLogs.id, set: logToDb(log) });
}

export async function deleteCommissionLog(id: string) {
  await getDb().delete(commissionLogs).where(eq(commissionLogs.id, id));
}

export async function markCommissionLogsPaid(ids: string[]) {
  if (!ids.length) return;
  await getDb().update(commissionLogs).set({ paymentStatus: "paid", updatedAt: new Date() }).where(inArray(commissionLogs.id, ids));
}

export async function seedDatabase() {
  await replaceAppData(initialData);
}
