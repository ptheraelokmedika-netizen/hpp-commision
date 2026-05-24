import type {
  CommissionRule,
  CustomerType,
  FixedCostSettings,
  Product,
  SimulationRecord,
  StaffRole,
  Treatment,
} from "./types";

export function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function percent(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
}

export function totalFixedCost(settings: FixedCostSettings, includeInstallments = true) {
  const installments = settings.cicilanAlat + settings.cicilanRenovasi + settings.cicilanLain;
  const total =
    settings.listrik +
    settings.air +
    settings.internetTelepon +
    settings.sewaTempat +
    settings.gajiDokter +
    settings.gajiTherapist +
    settings.gajiBeautician +
    settings.gajiAdmin +
    settings.bpjsTunjangan +
    settings.cleaningLaundry +
    settings.maintenanceAlat +
    settings.marketing +
    settings.softwareSubscription +
    settings.biayaTetapLain;

  return includeInstallments ? total + installments : total;
}

export function fixedCostBreakdown(settings: FixedCostSettings) {
  const totalWithoutInstallments = totalFixedCost(settings, false);
  const totalWithInstallments = totalFixedCost(settings, true);
  const workingDays = Math.max(settings.workingDays, 1);
  const operatingHours = Math.max(settings.operatingHours, 1);
  const customers = Math.max(settings.averageCustomers, 1);

  return {
    totalWithoutInstallments,
    totalWithInstallments,
    installmentTotal: totalWithInstallments - totalWithoutInstallments,
    perDay: totalWithInstallments / workingDays,
    perHour: totalWithInstallments / workingDays / operatingHours,
    perMinute: totalWithInstallments / workingDays / operatingHours / 60,
    perCustomer: totalWithInstallments / customers,
  };
}

export function directTreatmentCost(treatment: Treatment) {
  const disposableItems = treatment.disposableItems ?? treatment.disposableCosts ?? [];
  const materialItems = treatment.materialItems ?? [];
  const machineItems = treatment.machineItems ?? [];
  const disposableTotal = disposableItems.reduce((sum, item) => sum + item.amount, 0);
  const materialTotal =
    materialItems.length > 0
      ? materialItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
      : treatment.productMaterialCost;
  const machineTotal =
    machineItems.length > 0 ? machineItems.reduce((sum, item) => sum + item.amount, 0) : treatment.machineCostAllocation;

  return disposableTotal + materialTotal + machineTotal;
}

export function commissionAmount(
  rule: Pick<CommissionRule, "type" | "value"> & Partial<Pick<CommissionRule, "quantity">>,
  sellingPrice: number,
  grossProfit: number,
  netBeforeCommission = grossProfit,
) {
  const quantity = Math.max(rule.quantity ?? 1, 1);
  if (rule.type === "fixed") return rule.value * quantity;
  if (rule.type === "sellingPercentage") return sellingPrice * (rule.value / 100) * quantity;
  if (rule.type === "netBeforeCommissionPercentage") return Math.max(netBeforeCommission, 0) * (rule.value / 100) * quantity;
  return Math.max(grossProfit, 0) * (rule.value / 100) * quantity;
}

export function treatmentPrice(treatment: Treatment, customerType: CustomerType) {
  if (customerType === "VIP") return treatment.vipPrice;
  if (customerType === "Promo") return treatment.promoPrice;
  return treatment.nonVipPrice;
}

export function treatmentResult(
  treatment: Treatment,
  settings: FixedCostSettings,
  customerType: CustomerType,
  overridePrice?: number,
) {
  const directHpp = directTreatmentCost(treatment);
  const overheadAllocated = fixedCostBreakdown(settings).perMinute * treatment.durationMinutes;
  const totalCost = directHpp + overheadAllocated;
  const sellingPrice = overridePrice ?? treatmentPrice(treatment, customerType);
  const grossProfit = sellingPrice - totalCost;
  const matchingRules = (treatment.commissionRules ?? []).filter(
    (rule) => rule.appliesTo === "All" || rule.appliesTo === customerType || (customerType === "Normal" && rule.appliesTo === "Non VIP"),
  );
  const totalCommission = matchingRules.reduce(
    (sum, rule) => sum + commissionAmount(rule, sellingPrice, grossProfit, grossProfit),
    0,
  );
  const netProfit = sellingPrice - totalCost - totalCommission;
  const marginPercent = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const recommendedPrice = totalCost / (1 - treatment.targetMarginPercent / 100);

  return {
    sellingPrice,
    directHpp,
    overheadAllocated,
    totalCost,
    grossProfit,
    totalCommission,
    netProfit,
    marginPercent,
    recommendedPrice,
    commissionBreakdown: matchingRules.map((rule) => ({
      rule,
      amount: commissionAmount(rule, sellingPrice, grossProfit, grossProfit),
    })),
  };
}

export function selectedTier(product: Product) {
  return product.buyingTiers.find((tier) => tier.id === product.selectedTierId) ?? product.buyingTiers[0];
}

export function productPrice(product: Product, customerType: CustomerType) {
  if (customerType === "VIP") return product.vipPrice;
  if (customerType === "Promo") return product.promoPrice;
  return product.normalPrice;
}

export function productResult(product: Product, customerType: CustomerType, overridePrice?: number) {
  const unitCost = selectedTier(product)?.unitCost ?? 0;
  const sellingPrice = overridePrice ?? productPrice(product, customerType);
  const grossProfit = sellingPrice - unitCost;
  const rules = product.commissionRules?.length ? product.commissionRules : [product.commissionRule];
  const totalCommission = rules
    .filter((rule) => !("appliesTo" in rule) || rule.appliesTo === "All" || rule.appliesTo === customerType || (customerType === "Normal" && rule.appliesTo === "Non VIP"))
    .reduce((sum, rule) => sum + commissionAmount(rule, sellingPrice, grossProfit, grossProfit), 0);
  const netProfit = sellingPrice - unitCost - totalCommission;
  const marginPercent = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;

  return {
    sellingPrice,
    unitCost,
    grossProfit,
    totalCommission,
    netProfit,
    marginPercent,
    recommendedPrice: unitCost / 0.6,
  };
}

export function buildSimulationFromTreatment(
  id: string,
  treatment: Treatment,
  settings: FixedCostSettings,
  customerType: CustomerType,
  quantity: number,
  staffName: string,
  staffRole: StaffRole,
  overridePrice?: number,
  manualCommission?: number,
): SimulationRecord {
  const result = treatmentResult(treatment, settings, customerType, overridePrice);
  const commission = manualCommission ?? result.totalCommission;
  return {
    id,
    date: new Date().toISOString().slice(0, 10),
    itemType: "treatment",
    itemId: treatment.id,
    itemName: treatment.name,
    customerType,
    sellingPrice: result.sellingPrice,
    quantity,
    staffName,
    staffRole,
    commissionMode: manualCommission == null ? "default" : "manual",
    manualCommission,
    directHpp: result.directHpp * quantity,
    overheadAllocated: result.overheadAllocated * quantity,
    totalCost: result.totalCost * quantity,
    grossProfit: result.grossProfit * quantity,
    totalCommission: commission * quantity,
    netProfit: (result.sellingPrice - result.totalCost - commission) * quantity,
    marginPercent:
      result.sellingPrice > 0 ? ((result.sellingPrice - result.totalCost - commission) / result.sellingPrice) * 100 : 0,
  };
}

export function buildSimulationFromProduct(
  id: string,
  product: Product,
  customerType: CustomerType,
  quantity: number,
  staffName: string,
  staffRole: StaffRole,
  overridePrice?: number,
  manualCommission?: number,
): SimulationRecord {
  const result = productResult(product, customerType, overridePrice);
  const commission = manualCommission ?? result.totalCommission;
  return {
    id,
    date: new Date().toISOString().slice(0, 10),
    itemType: "product",
    itemId: product.id,
    itemName: product.name,
    customerType,
    sellingPrice: result.sellingPrice,
    quantity,
    staffName,
    staffRole,
    commissionMode: manualCommission == null ? "default" : "manual",
    manualCommission,
    directHpp: result.unitCost * quantity,
    overheadAllocated: 0,
    totalCost: result.unitCost * quantity,
    grossProfit: result.grossProfit * quantity,
    totalCommission: commission * quantity,
    netProfit: (result.sellingPrice - result.unitCost - commission) * quantity,
    marginPercent:
      result.sellingPrice > 0 ? ((result.sellingPrice - result.unitCost - commission) / result.sellingPrice) * 100 : 0,
  };
}
