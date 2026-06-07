import { eq, inArray } from "drizzle-orm";
import { emptyData, initialData } from "../../lib/storage";
import { normalizeFixedCostSettings } from "../../lib/storage";
import type { CommissionLog, ConsumableItem, FixedCostSettings, HppCategory, HppPackageTemplate, Product, SimulationRecord, StockAdjustment, StockOpname, StorageSchema, Treatment } from "../../lib/types";
import { getDb } from "./index";
import { commissionLogs, consumableItems, fixedCostSettings, hppCategories, hppPackageTemplates, products, simulationRecords, stockAdjustments, stockOpnames, treatments } from "./schema";

const SETTINGS_ID = "hera-clinic-default";

function settingsToDb(settings: FixedCostSettings) {
  const normalized = normalizeFixedCostSettings(settings);
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
    costModes: normalized.costModes ?? {},
    costNotes: normalized.costNotes ?? {},
    staffCosts: normalized.staffCosts ?? [],
    electricitySettings: normalized.electricitySettings ?? {},
    updatedAt: new Date(),
  };
}

function settingsFromDb(row: typeof fixedCostSettings.$inferSelect): FixedCostSettings {
  return normalizeFixedCostSettings({
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
    costModes: row.costModes as FixedCostSettings["costModes"],
    costNotes: row.costNotes as FixedCostSettings["costNotes"],
    staffCosts: row.staffCosts as FixedCostSettings["staffCosts"],
    electricitySettings: row.electricitySettings as FixedCostSettings["electricitySettings"],
  });
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
    consumableUsages: treatment.consumableUsages ?? [],
    materialItems: treatment.materialItems ?? [],
    machineItems: treatment.machineItems ?? [],
    deviceElectricityCosts: treatment.deviceElectricityCosts ?? [],
    shotCartridgeCosts: treatment.shotCartridgeCosts ?? [],
    staffFeeCosts: treatment.staffFeeCosts ?? [],
    includeOverhead: treatment.includeOverhead ?? true,
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
    consumableUsages: (row.consumableUsages as Treatment["consumableUsages"]) ?? [],
    materialItems: (row.materialItems as Treatment["materialItems"]) ?? [],
    machineItems: (row.machineItems as Treatment["machineItems"]) ?? [],
    deviceElectricityCosts: (row.deviceElectricityCosts as Treatment["deviceElectricityCosts"]) ?? [],
    shotCartridgeCosts: (row.shotCartridgeCosts as Treatment["shotCartridgeCosts"]) ?? [],
    staffFeeCosts: (row.staffFeeCosts as Treatment["staffFeeCosts"]) ?? [],
    includeOverhead: row.includeOverhead,
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

function consumableToDb(item: ConsumableItem) {
  const costPerSmallestUnit = item.totalSmallestUnit > 0 ? Math.round(item.purchasePrice / item.totalSmallestUnit) : 0;
  const currentStock = Math.round(item.currentStock ?? item.availableQuantity ?? item.purchaseQuantity * item.totalSmallestUnit);
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    supplier: item.supplier ?? null,
    purchasePrice: Math.round(item.purchasePrice),
    purchaseQuantity: Math.round(item.purchaseQuantity || 1),
    purchaseUnit: item.purchaseUnit,
    totalSmallestUnit: Math.round(item.totalSmallestUnit),
    smallestUnit: item.smallestUnit,
    costPerSmallestUnit,
    availableQuantity: currentStock,
    minimumStock: Math.round(item.minimumStock || 0),
    currentStock,
    stockUnit: item.stockUnit ?? item.smallestUnit,
    lastStockCheckDate: item.lastStockCheckDate ?? null,
    lastStockCheckBy: item.lastStockCheckBy ?? null,
    lastPhysicalStock: item.lastPhysicalStock == null ? null : Math.round(item.lastPhysicalStock),
    lastStockDifference: item.lastStockDifference == null ? null : Math.round(item.lastStockDifference),
    notes: item.notes ?? null,
    active: item.active ?? true,
    updatedAt: new Date(),
  };
}

function consumableFromDb(row: typeof consumableItems.$inferSelect): ConsumableItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ConsumableItem["category"],
    supplier: row.supplier ?? undefined,
    purchasePrice: row.purchasePrice,
    purchaseQuantity: row.purchaseQuantity,
    purchaseUnit: row.purchaseUnit as ConsumableItem["purchaseUnit"],
    totalSmallestUnit: row.totalSmallestUnit,
    smallestUnit: row.smallestUnit as ConsumableItem["smallestUnit"],
    costPerSmallestUnit: row.costPerSmallestUnit,
    availableQuantity: row.availableQuantity,
    minimumStock: row.minimumStock,
    currentStock: row.currentStock ?? row.availableQuantity,
    stockUnit: row.stockUnit as ConsumableItem["stockUnit"],
    lastStockCheckDate: row.lastStockCheckDate ?? undefined,
    lastStockCheckBy: row.lastStockCheckBy ?? undefined,
    lastPhysicalStock: row.lastPhysicalStock ?? undefined,
    lastStockDifference: row.lastStockDifference ?? undefined,
    notes: row.notes ?? undefined,
    active: row.active,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

function stockAdjustmentToDb(item: StockAdjustment) {
  return { ...item, notes: item.notes ?? null, createdAt: new Date(item.createdAt) };
}

function stockAdjustmentFromDb(row: typeof stockAdjustments.$inferSelect): StockAdjustment {
  return {
    id: row.id,
    materialId: row.materialId,
    materialNameSnapshot: row.materialNameSnapshot,
    type: row.type as StockAdjustment["type"],
    quantity: row.quantity,
    previousStock: row.previousStock,
    newStock: row.newStock,
    reason: row.reason as StockAdjustment["reason"],
    notes: row.notes ?? undefined,
    date: row.date,
    pic: row.pic,
    createdAt: row.createdAt.toISOString(),
  };
}

function stockOpnameToDb(item: StockOpname) {
  return { ...item, location: item.location ?? null, notes: item.notes ?? null, items: item.items, createdAt: new Date(item.createdAt), updatedAt: new Date() };
}

function stockOpnameFromDb(row: typeof stockOpnames.$inferSelect): StockOpname {
  return {
    id: row.id,
    date: row.date,
    checkedBy: row.checkedBy,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status as StockOpname["status"],
    items: row.items as StockOpname["items"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function hppPackageToDb(item: HppPackageTemplate) {
  const totalCost = item.items.reduce((sum, row) => sum + row.totalCost, 0);
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description ?? null,
    items: item.items,
    totalCost: Math.round(totalCost),
    updatedAt: new Date(),
  };
}

function hppPackageFromDb(row: typeof hppPackageTemplates.$inferSelect): HppPackageTemplate {
  return {
    id: row.id,
    name: row.name,
    category: row.category as HppPackageTemplate["category"],
    description: row.description ?? undefined,
    items: (row.items as HppPackageTemplate["items"]) ?? [],
    totalCost: row.totalCost,
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

function categoryToDb(item: HppCategory) {
  return {
    id: item.id,
    group: item.group,
    name: item.name,
    active: item.active,
    notes: item.notes ?? null,
    updatedAt: new Date(),
  };
}

function categoryFromDb(row: typeof hppCategories.$inferSelect): HppCategory {
  return {
    id: row.id,
    group: row.group as HppCategory["group"],
    name: row.name,
    active: row.active,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
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
  const [settingsRows, treatmentRows, productRows, simulationRows, logRows, consumableRows, hppPackageRows, categoryRows, adjustmentRows, opnameRows] = await Promise.all([
    db.select().from(fixedCostSettings),
    db.select().from(treatments),
    db.select().from(products),
    db.select().from(simulationRecords),
    db.select().from(commissionLogs),
    db.select().from(consumableItems),
    db.select().from(hppPackageTemplates),
    db.select().from(hppCategories),
    db.select().from(stockAdjustments),
    db.select().from(stockOpnames),
  ]);

  return {
    fixedCosts: settingsRows[0] ? settingsFromDb(settingsRows[0]) : initialData.fixedCosts,
    treatments: treatmentRows.map(treatmentFromDb),
    products: productRows.map(productFromDb),
    simulations: simulationRows.map(simulationFromDb),
    commissionLogs: logRows.map(logFromDb),
    consumables: consumableRows.map(consumableFromDb),
    stockAdjustments: adjustmentRows.map(stockAdjustmentFromDb),
    stockOpnames: opnameRows.map(stockOpnameFromDb),
    hppPackages: hppPackageRows.map(hppPackageFromDb),
    categories: categoryRows.map(categoryFromDb),
  };
}

export async function replaceAppData(data: StorageSchema) {
  const db = getDb();
  await db.delete(fixedCostSettings);
  await db.delete(treatments);
  await db.delete(products);
  await db.delete(simulationRecords);
  await db.delete(commissionLogs);
  await db.delete(stockAdjustments);
  await db.delete(stockOpnames);
  await db.delete(consumableItems);
  await db.delete(hppPackageTemplates);
  await db.delete(hppCategories);

  await db.insert(fixedCostSettings).values(settingsToDb(data.fixedCosts));
  if (data.treatments.length) await db.insert(treatments).values(data.treatments.map(treatmentToDb));
  if (data.products.length) await db.insert(products).values(data.products.map(productToDb));
  if (data.simulations.length) await db.insert(simulationRecords).values(data.simulations.map(simulationToDb));
  if (data.commissionLogs.length) await db.insert(commissionLogs).values(data.commissionLogs.map(logToDb));
  if (data.consumables.length) await db.insert(consumableItems).values(data.consumables.map(consumableToDb));
  if (data.stockAdjustments.length) await db.insert(stockAdjustments).values(data.stockAdjustments.map(stockAdjustmentToDb));
  if (data.stockOpnames.length) await db.insert(stockOpnames).values(data.stockOpnames.map(stockOpnameToDb));
  if (data.hppPackages.length) await db.insert(hppPackageTemplates).values(data.hppPackages.map(hppPackageToDb));
  if (data.categories.length) await db.insert(hppCategories).values(data.categories.map(categoryToDb));
}

export async function clearDatabase() {
  await replaceAppData(emptyData);
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

export async function upsertConsumable(item: ConsumableItem) {
  const db = getDb();
  await db
    .insert(consumableItems)
    .values(consumableToDb(item))
    .onConflictDoUpdate({ target: consumableItems.id, set: consumableToDb(item) });
}

export async function deleteConsumable(id: string) {
  await getDb().delete(consumableItems).where(eq(consumableItems.id, id));
}

export async function upsertHppPackage(item: HppPackageTemplate) {
  const db = getDb();
  await db
    .insert(hppPackageTemplates)
    .values(hppPackageToDb(item))
    .onConflictDoUpdate({ target: hppPackageTemplates.id, set: hppPackageToDb(item) });
}

export async function deleteHppPackage(id: string) {
  await getDb().delete(hppPackageTemplates).where(eq(hppPackageTemplates.id, id));
}

export async function deductConsumables(usages: { consumableId: string; quantity: number }[]) {
  const data = await getAppData();
  const nextConsumables = data.consumables.map((item) => {
    const used = usages.filter((usage) => usage.consumableId === item.id).reduce((sum, usage) => sum + usage.quantity, 0);
    return used > 0 ? { ...item, availableQuantity: Math.max(0, item.availableQuantity - used) } : item;
  });
  await Promise.all(nextConsumables.map(upsertConsumable));
}

export async function markCommissionLogsPaid(ids: string[]) {
  if (!ids.length) return;
  await getDb().update(commissionLogs).set({ paymentStatus: "paid", updatedAt: new Date() }).where(inArray(commissionLogs.id, ids));
}

export async function seedDatabase() {
  await replaceAppData(initialData);
}
