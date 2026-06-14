"use client";

import {
  BarChart3,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileDown,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  buildSimulationFromProduct,
  buildSimulationFromTreatment,
  acElectricityCost,
  deviceElectricityCost,
  electricitySummary,
  directTreatmentCost,
  fixedCostBreakdown,
  fixedCostTotals,
  percent,
  productPrice,
  productResult,
  rupiah,
  selectedTier,
  treatmentPrice,
  treatmentResult,
  staffCostTotal,
} from "../lib/calculations";
import { commissionDraftReport, commissionReport, consumableStockReport, exportBlankStockOpnamePdf, exportMasterBahanPdf, exportStockOpnameResultPdf, fixedCostReport, hppPackageReport, productProfitReport, simulationReport, staffCommissionStatement, treatmentHppReport } from "../lib/pdf";
import { clearData, generateId, getData, normalizeFixedCostSettings, resetData, saveData } from "../lib/storage";
import type {
  CommissionAppliesTo,
  CommissionDraft,
  CommissionLog,
  CommissionRule,
  CommissionType,
  CategoryGroup,
  ConsumableCategory,
  ConsumableItem,
  ConsumableUnit,
  CustomerType,
  FixedCostSettings,
  FixedCostMode,
  HeraCommissionMode,
  HeraCommissionRule,
  HeraStaffRole,
  ElectricityAcItem,
  ElectricityDeviceItem,
  HppPackageCategory,
  HppPackageItem,
  HppPackageTemplate,
  HppCategory,
  Product,
  SimulationRecord,
  StaffDirectoryItem,
  StaffHandlerSelection,
  StaffRole,
  StaffRoleCategory,
  StorageSchema,
  StockAdjustment,
  StockOpname,
  StockOpnameItem,
  Treatment,
  TreatmentConsumableUsage,
  TreatmentCostItem,
  TreatmentDeviceElectricityCost,
  TreatmentMachineItem,
  TreatmentMaterialItem,
  TreatmentShotCartridgeCost,
  TreatmentStaffFeeCost,
} from "../lib/types";

type ViewKey = "dashboard" | "fixed" | "treatments" | "staffDirectory" | "commissionSimulation" | "commissionDrafts" | "commissionHistory" | "consumables" | "hppPackages" | "masterCategories" | "products" | "simulation" | "logs" | "reports";
type PriceMode = "Normal" | "VIP" | "Promo" | "Manual";

const navItems: { key: ViewKey; label: string; icon: ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "fixed", label: "Biaya Tetap", icon: Settings },
  { key: "treatments", label: "Treatment HPP", icon: Sparkles },
  { key: "staffDirectory", label: "Data Staff", icon: ClipboardList },
  { key: "commissionSimulation", label: "Simulasi Komisi", icon: Calculator },
  { key: "commissionDrafts", label: "Draft Komisi", icon: ClipboardList },
  { key: "commissionHistory", label: "Riwayat Komisi", icon: CheckCircle2 },
  { key: "consumables", label: "Master Bahan", icon: Package },
  { key: "hppPackages", label: "Master Paket HPP", icon: ClipboardList },
  { key: "masterCategories", label: "Master Kategori", icon: Settings },
  { key: "products", label: "Produk / Retail", icon: Package },
  { key: "simulation", label: "Simulasi Harga", icon: Calculator },
  { key: "logs", label: "Log Komisi", icon: ClipboardList },
  { key: "reports", label: "Laporan PDF", icon: FileDown },
];

const roles: StaffRole[] = ["dokter", "therapist", "beautician", "sales", "admin"];
const heraRoles: HeraStaffRole[] = ["Dokter", "Beautician", "Nurse / Perawat", "Sales / Promoter", "Admin", "Therapist", "Other"];
const heraCommissionModes: { value: HeraCommissionMode; label: string }[] = [
  { value: "no_commission", label: "No commission" },
  { value: "percent_final_price", label: "% dari harga final/promo" },
  { value: "nominal_adjusted_by_discount", label: "Nominal ikut diskon promo" },
  { value: "fixed_nominal", label: "Nominal tetap" },
];
const consumableCategories: ConsumableCategory[] = ["Disposable", "Skincare / Serum", "Cairan / Liquid", "Alat habis pakai", "Obat / Injectable support", "Other"];
const consumableUnits: ConsumableUnit[] = ["pcs", "lembar", "ml", "gram", "tube", "bottle", "box", "pack", "vial", "ampoule", "syringe", "cartridge", "drop", "pump", "other"];
const hppPackageCategories: HppPackageCategory[] = ["Facial", "Injection", "Laser / Energy Based Device", "Meso / Booster", "Body Treatment", "Other"];
const customerTypes: CustomerType[] = ["Normal", "VIP", "Promo"];
const appliesToOptions: CommissionAppliesTo[] = ["All", "Normal", "VIP", "Promo"];
const commissionTypes: { value: CommissionType; label: string }[] = [
  { value: "fixed", label: "Nominal tetap per orang" },
  { value: "sellingPercentage", label: "% dari harga jual" },
  { value: "grossProfitPercentage", label: "% dari gross profit" },
  { value: "netBeforeCommissionPercentage", label: "% profit sebelum komisi" },
];

const fixedCostFields: { key: keyof FixedCostSettings; label: string; installment?: boolean }[] = [
  { key: "listrik", label: "Listrik per bulan" },
  { key: "air", label: "Air per bulan" },
  { key: "internetTelepon", label: "Internet / telepon" },
  { key: "sewaTempat", label: "Sewa tempat" },
  { key: "gajiDokter", label: "Gaji dokter" },
  { key: "gajiTherapist", label: "Gaji therapist" },
  { key: "gajiBeautician", label: "Gaji beautician" },
  { key: "gajiAdmin", label: "Gaji admin" },
  { key: "bpjsTunjangan", label: "BPJS / tunjangan staff" },
  { key: "cleaningLaundry", label: "Biaya cleaning / laundry" },
  { key: "maintenanceAlat", label: "Maintenance alat" },
  { key: "marketing", label: "Marketing" },
  { key: "softwareSubscription", label: "Software / subscription" },
  { key: "cicilanAlat", label: "Cicilan alat", installment: true },
  { key: "cicilanRenovasi", label: "Cicilan renovasi", installment: true },
  { key: "cicilanLain", label: "Cicilan lain-lain", installment: true },
  { key: "biayaTetapLain", label: "Biaya tetap lain" },
];

const defaultDisposableNames = [
  "needle / cannula / syringe",
  "gloves",
  "mask",
  "alcohol swab",
  "gauze",
  "cream / serum / gel",
  "consumable alat",
  "other disposable",
];

function emptyRule(): CommissionRule {
  return {
    id: generateId("comm"),
    role: "therapist",
    staffName: "",
    quantity: 1,
    type: "fixed",
    value: 0,
    appliesTo: "All",
    notes: "",
  };
}

function emptyTreatment(): Treatment {
  const disposableItems = defaultDisposableNames.map((name) => ({ id: generateId("cost"), name, amount: 0 }));
  return {
    id: generateId("trt"),
    name: "",
    category: "",
    durationMinutes: 60,
    disposableCosts: disposableItems,
    disposableItems,
    materialItems: [],
    machineItems: [],
    deviceElectricityCosts: [],
    shotCartridgeCosts: [],
    staffFeeCosts: [],
    includeOverhead: true,
    productMaterialCost: 0,
    machineCostAllocation: 0,
    staffInvolved: ["therapist"],
    nonVipPrice: 0,
    vipPrice: 0,
    promoPrice: 0,
    targetMarginPercent: 40,
    commissionRules: [emptyRule()],
    heraCommissionRules: defaultHeraCommissionRules(),
  };
}

function emptyProduct(): Product {
  return {
    id: generateId("prd"),
    name: "",
    category: "",
    supplier: "",
    buyingTiers: [
      { id: generateId("tier"), quantity: 1, unitCost: 0 },
      { id: generateId("tier"), quantity: 5, unitCost: 0 },
      { id: generateId("tier"), quantity: 10, unitCost: 0 },
    ],
    selectedTierId: "",
    normalPrice: 0,
    vipPrice: 0,
    promoPrice: 0,
    commissionRule: { ...emptyRule(), role: "sales" },
    commissionRules: [{ ...emptyRule(), role: "sales" }],
    heraCommissionRules: [
      { id: generateId("hcomm"), role: "Sales / Promoter", mode: "percent_final_price", percent: 2, nominal: 0, active: true, notes: "" },
      { id: generateId("hcomm"), role: "Beautician", mode: "no_commission", percent: 0, nominal: 0, active: true, notes: "" },
    ],
    stockQuantity: 0,
  };
}

function emptyConsumable(): ConsumableItem {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: generateId("cons"),
    name: "",
    category: "Disposable",
    supplier: "",
    purchasePrice: 0,
    purchaseQuantity: 1,
    purchaseUnit: "pack",
    totalSmallestUnit: 1,
    smallestUnit: "pcs",
    costPerSmallestUnit: 0,
    availableQuantity: 1,
    minimumStock: 0,
    currentStock: 1,
    stockUnit: "pcs",
    lastStockCheckDate: "",
    lastStockCheckBy: "",
    lastPhysicalStock: undefined,
    lastStockDifference: undefined,
    notes: "",
    active: true,
    createdAt: today,
    updatedAt: today,
  };
}

function emptyHppPackage(): HppPackageTemplate {
  return {
    id: generateId("pkg"),
    name: "",
    category: "Facial",
    description: "",
    items: [],
    totalCost: 0,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

function nextStaffCode(staff: StaffDirectoryItem[]) {
  const max = staff.reduce((highest, item) => {
    const number = Number(item.staffCode?.replace(/\D/g, "")) || 0;
    return Math.max(highest, number);
  }, 0);
  return `STF-${String(max + 1).padStart(3, "0")}`;
}

function emptyStaff(staff: StaffDirectoryItem[] = []): StaffDirectoryItem {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: generateId("staff"),
    staffCode: nextStaffCode(staff),
    name: "",
    role: "Beautician",
    status: "active",
    phone: "",
    notes: "",
    defaultCommissionEligible: true,
    createdAt: today,
    updatedAt: today,
  };
}

function defaultHeraCommissionRules(): HeraCommissionRule[] {
  return ["Dokter", "Beautician", "Nurse / Perawat", "Sales / Promoter"].map((role) => ({
    id: generateId("hcomm"),
    role: role as HeraStaffRole,
    mode: "no_commission",
    percent: 0,
    nominal: 0,
    notes: "",
    active: true,
  }));
}

function emptyHandlers(): StaffHandlerSelection {
  return { beauticianSplit: "equal", beautician1Percent: 50, beautician2Percent: 50 };
}

function staffName(staff: StaffDirectoryItem[], id?: string, manual = "") {
  return staff.find((item) => item.id === id)?.name || manual || "";
}

function calculateHeraCommission(rule: HeraCommissionRule, normalPrice: number, finalAllocatedAmount: number) {
  if (!rule.active || rule.mode === "no_commission") return 0;
  if (rule.mode === "percent_final_price") return finalAllocatedAmount * (rule.percent / 100);
  if (rule.mode === "nominal_adjusted_by_discount") return normalPrice > 0 ? rule.nominal * (finalAllocatedAmount / normalPrice) : 0;
  return rule.nominal;
}

function buildCommissionPreviewRows(args: {
  rules: HeraCommissionRule[];
  staff: StaffDirectoryItem[];
  handlers: StaffHandlerSelection;
  normalPrice: number;
  finalAllocatedAmount: number;
  itemName: string;
  treatmentId?: string;
  hppCost: number;
  invoiceNumber: string;
  patientName: string;
  transactionDate: string;
}) {
  const { rules, staff, handlers, normalPrice, finalAllocatedAmount, itemName, treatmentId, hppCost, invoiceNumber, patientName, transactionDate } = args;
  const now = new Date().toISOString();
  const makeRow = (rule: HeraCommissionRule, staffId: string | undefined, staffNameSnapshot: string, amount: number, notes = ""): CommissionDraft => ({
    id: generateId("draft"),
    transactionDate,
    invoiceNumber,
    patientName,
    itemName,
    treatmentId,
    staffId,
    staffNameSnapshot: staffNameSnapshot || `${rule.role} belum dipilih`,
    role: rule.role,
    commissionMode: rule.mode,
    baseAmount: finalAllocatedAmount,
    normalPrice,
    finalAllocatedAmount,
    percent: rule.percent,
    nominal: rule.nominal,
    calculatedCommission: Math.round(amount),
    hppCost,
    estimatedProfit: Math.round(finalAllocatedAmount - hppCost - amount),
    status: "draft",
    notes: notes || rule.notes,
    createdAt: now,
    updatedAt: now,
  });
  const rows: CommissionDraft[] = [];
  for (const rule of rules.filter((item) => item.active)) {
    const amount = calculateHeraCommission(rule, normalPrice, finalAllocatedAmount);
    if (rule.role === "Dokter") rows.push(makeRow(rule, handlers.doctorId, staffName(staff, handlers.doctorId, handlers.manualDoctorName), amount));
    if (rule.role === "Nurse / Perawat") rows.push(makeRow(rule, handlers.nurseId, staffName(staff, handlers.nurseId, handlers.manualNurseName), amount));
    if (rule.role === "Sales / Promoter") rows.push(makeRow(rule, handlers.salesId, staffName(staff, handlers.salesId, handlers.manualSalesName), amount));
    if (rule.role === "Beautician") {
      const hasSecond = Boolean(handlers.beautician2Id || handlers.manualBeautician2Name);
      const split1 = handlers.beauticianSplit === "beautician2" ? 0 : handlers.beauticianSplit === "custom" ? handlers.beautician1Percent / 100 : hasSecond && handlers.beauticianSplit === "equal" ? 0.5 : 1;
      const split2 = handlers.beauticianSplit === "beautician1" ? 0 : handlers.beauticianSplit === "custom" ? handlers.beautician2Percent / 100 : hasSecond && handlers.beauticianSplit === "equal" ? 0.5 : 0;
      if (split1 > 0) rows.push(makeRow(rule, handlers.beautician1Id, staffName(staff, handlers.beautician1Id, handlers.manualBeautician1Name), amount * split1, `Split beautician ${Math.round(split1 * 100)}%`));
      if (split2 > 0) rows.push(makeRow(rule, handlers.beautician2Id, staffName(staff, handlers.beautician2Id, handlers.manualBeautician2Name), amount * split2, `Split beautician ${Math.round(split2 * 100)}%`));
    }
  }
  return rows;
}

function packageTotal(items: HppPackageItem[]) {
  return items.reduce((sum, item) => sum + item.totalCost, 0);
}

function normalizeHppPackage(pkg: HppPackageTemplate): HppPackageTemplate {
  const items = (pkg.items ?? []).map((item) => ({
    ...item,
    qtyDefault: Number(item.qtyDefault) || 0,
    costPerUnit: Number(item.costPerUnit) || 0,
    totalCost: item.mode === "manual" ? Number(item.manualCost ?? item.totalCost) || 0 : (Number(item.qtyDefault) || 0) * (Number(item.costPerUnit) || 0),
  }));
  return { ...pkg, items, totalCost: packageTotal(items), updatedAt: pkg.updatedAt ?? new Date().toISOString().slice(0, 10) };
}

function normalizeConsumable(item: ConsumableItem): ConsumableItem {
  const totalSmallestUnit = Math.max(Number(item.totalSmallestUnit) || 0, 0);
  const purchaseQuantity = Math.max(Number(item.purchaseQuantity) || 0, 0);
  const costPerSmallestUnit = totalSmallestUnit > 0 ? Math.round(item.purchasePrice / totalSmallestUnit) : 0;
  const currentStock = Number(item.currentStock ?? item.availableQuantity ?? purchaseQuantity * totalSmallestUnit) || 0;
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...item,
    purchaseQuantity,
    totalSmallestUnit,
    costPerSmallestUnit,
    currentStock,
    availableQuantity: currentStock,
    stockUnit: item.stockUnit ?? item.smallestUnit,
    minimumStock: Number(item.minimumStock) || 0,
    active: item.active ?? true,
    createdAt: item.createdAt ?? today,
    updatedAt: today,
  };
}

function stockStatus(item: ConsumableItem) {
  const currentStock = Number(item.currentStock ?? item.availableQuantity ?? 0);
  if (!item.lastStockCheckDate) return "Belum dicek";
  if (currentStock <= 0) return "Habis";
  if (item.minimumStock > 0 && currentStock <= item.minimumStock) return "Low Stock";
  return "Aman";
}

function normalCustomerType(type: CustomerType): CustomerType {
  return type === "Non VIP" ? "Normal" : type;
}

function normalizeTreatmentForEdit(treatment: Treatment): Treatment {
  const disposableItems = treatment.disposableItems ?? treatment.disposableCosts ?? [];
  return {
    ...treatment,
    disposableItems,
    disposableCosts: disposableItems,
    materialItems: treatment.materialItems ?? [],
    machineItems: treatment.machineItems ?? [],
    consumableUsages: treatment.consumableUsages ?? [],
    deviceElectricityCosts: treatment.deviceElectricityCosts ?? [],
    shotCartridgeCosts: treatment.shotCartridgeCosts ?? [],
    staffFeeCosts: treatment.staffFeeCosts ?? [],
    includeOverhead: treatment.includeOverhead ?? true,
    heraCommissionRules: treatment.heraCommissionRules?.length ? treatment.heraCommissionRules : defaultHeraCommissionRules(),
    staffInvolved: treatment.staffInvolved ?? [],
    commissionRules: (treatment.commissionRules ?? []).map((rule) => ({
      ...rule,
      role: rule.role ?? rule.recipient ?? "therapist",
      quantity: rule.quantity ?? 1,
      appliesTo: rule.appliesTo === "Non VIP" ? "Normal" : rule.appliesTo,
    })),
  };
}

function treatmentDeviceElectricityTotal(items: TreatmentDeviceElectricityCost[] = []) {
  return items.filter((item) => item.includeInHpp).reduce((sum, item) => sum + item.costPerTreatment, 0);
}

function treatmentShotCartridgeTotal(items: TreatmentShotCartridgeCost[] = []) {
  return items.filter((item) => item.includeInHpp).reduce((sum, item) => sum + item.costPerTreatment, 0);
}

function treatmentStaffFeeTotal(items: TreatmentStaffFeeCost[] = []) {
  return items.filter((item) => item.includeInHpp).reduce((sum, item) => sum + item.total, 0);
}

function inputClass(extra = "") {
  return `min-h-11 w-full min-w-0 rounded-lg border border-[#ded2bf] bg-white px-3 text-base outline-none transition focus:border-[#0d4b3a] focus:ring-2 focus:ring-[#0d4b3a]/10 md:text-sm ${extra}`;
}

function compactInputClass(extra = "") {
  return `h-9 w-full min-w-0 rounded-md border border-[#ded2bf] bg-white px-2.5 text-sm outline-none transition focus:border-[#0d4b3a] focus:ring-2 focus:ring-[#0d4b3a]/10 ${extra}`;
}

function StatCard({ label, value, tone = "emerald" }: { label: string; value: string; tone?: "emerald" | "gold" | "rose" }) {
  const toneClass =
    tone === "gold" ? "border-[#d8b65f]/40 bg-[#fff8e8]" : tone === "rose" ? "border-[#e6aaa0]/50 bg-[#fff2ef]" : "border-[#bdd8cb] bg-white";
  return (
    <div className={`min-w-0 max-w-full rounded-lg border p-3 shadow-sm ${toneClass}`}>
      <p className="break-words text-[11px] font-medium uppercase leading-snug tracking-wide text-[#7a7265]">{label}</p>
      <p className="mt-1 break-words text-base font-semibold leading-snug text-[#0d4b3a]">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm text-[#4d473d]">
      <span className="font-medium">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass()} />
    </label>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm text-[#4d473d]">
      <span className="font-medium">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass()}>
        {children}
      </select>
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "primary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
}) {
  const variants = {
    primary: "bg-[#0d4b3a] text-white hover:bg-[#0a3a2d]",
    secondary: "border border-[#d8b65f] bg-[#fff8e8] text-[#6e5420] hover:bg-[#f7edd2]",
    danger: "border border-[#e1aaa0] bg-[#fff2ef] text-[#a33a2d] hover:bg-[#f8ded9]",
    ghost: "border border-[#ded2bf] bg-white text-[#0d4b3a] hover:bg-[#fbf6ed]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

function CompactAction({
  children,
  onClick,
  tone = "neutral",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "danger" | "gold";
}) {
  const toneClass =
    tone === "danger"
      ? "border-[#e1aaa0] bg-[#fff8f6] text-[#a33a2d] hover:bg-[#fff2ef]"
      : tone === "gold"
        ? "border-[#d8b65f]/70 bg-[#fffaf0] text-[#6e5420] hover:bg-[#fff5dc]"
        : "border-[#ded2bf] bg-white text-[#0d4b3a] hover:bg-[#fbf6ed]";
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${toneClass}`}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 max-w-full rounded-lg border border-[#e8dcc8] bg-white p-4 shadow-sm md:p-5 ${className}`}>{children}</section>;
}

export default function Home() {
  const [data, setData] = useState<StorageSchema | null>(null);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [editingTreatment, setEditingTreatment] = useState<Treatment>(emptyTreatment());
  const [editingProduct, setEditingProduct] = useState<Product>(emptyProduct());
  const [editingConsumable, setEditingConsumable] = useState<ConsumableItem>(emptyConsumable());
  const [editingHppPackage, setEditingHppPackage] = useState<HppPackageTemplate>(emptyHppPackage());
  const [editingStaff, setEditingStaff] = useState<StaffDirectoryItem>(emptyStaff());
  const [selectedSimulationId, setSelectedSimulationId] = useState("");
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [simulationItemId, setSimulationItemId] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [loadError, setLoadError] = useState("");
  const [databaseStatus, setDatabaseStatus] = useState<"neon" | "local" | "error">("local");

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/app-data", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          setData(payload.data);
          setStorageWarning("");
          setLoadError("");
          setDatabaseStatus("neon");
          return;
        }

        const payload = await response.json().catch(() => null);
        setData(getData());
        setStorageWarning(payload?.message ?? "Database belum terhubung, data tersimpan lokal di browser ini.");
        setDatabaseStatus("local");
      } catch {
        setData(getData());
        setLoadError("Database tidak dapat diakses. Mode lokal browser digunakan sementara.");
        setDatabaseStatus("error");
        setStorageWarning("Database belum terhubung, data tersimpan lokal di browser ini.");
      }
    }

    loadData();
  }, []);

  const persist = (next: StorageSchema) => {
    setData(next);
    saveData(next);
    fetch("/api/app-data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setStorageWarning(payload?.message ?? "Database belum terhubung, data tersimpan lokal di browser ini.");
          setDatabaseStatus("local");
        } else {
          setStorageWarning("");
          setDatabaseStatus("neon");
        }
      })
      .catch(() => {
        setStorageWarning("Database belum terhubung, data tersimpan lokal di browser ini.");
        setDatabaseStatus("error");
      });
  };

  const addCategory = (group: CategoryGroup, name: string, notes = "") => {
    const trimmed = name.trim();
    if (!trimmed || !data) return "";
    const duplicate = data.categories.find((item) => item.group === group && item.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return duplicate.id;
    const date = new Date().toISOString().slice(0, 10);
    const category: HppCategory = {
      id: `cat-${group}-${Date.now()}`,
      group,
      name: trimmed,
      active: true,
      notes,
      createdAt: date,
      updatedAt: date,
    };
    persist({ ...data, categories: [category, ...data.categories] });
    return category.id;
  };

  const clearAllData = async () => {
    if (!window.confirm("Yakin ingin mengosongkan semua data? Data treatment, produk, simulasi, log komisi, dan master bahan akan dihapus.")) return;
    const cleared = clearData();
    setData(cleared);
    setEditingTreatment(emptyTreatment());
    setEditingProduct(emptyProduct());
    setEditingConsumable(emptyConsumable());
    setEditingHppPackage(emptyHppPackage());
    setEditingStaff(emptyStaff());
    try {
      const response = await fetch("/api/admin/clear-data", { method: "POST" });
      if (response.ok) {
        setDatabaseStatus("neon");
        setStorageWarning("");
      } else {
        const payload = await response.json().catch(() => null);
        setDatabaseStatus("local");
        setStorageWarning(payload?.message ?? "Database belum terhubung, data tersimpan lokal di browser ini.");
      }
    } catch {
      setDatabaseStatus("error");
      setStorageWarning("Database belum terhubung, data tersimpan lokal di browser ini.");
    }
  };

  const seedSampleData = async () => {
    if (!window.confirm("Isi ulang contoh data Hera Clinic?")) return;
    const seeded = resetData();
    setData(seeded);
    setEditingStaff(emptyStaff(seeded.staffDirectory));
    try {
      const response = await fetch("/api/admin/seed-data", { method: "POST" });
      if (response.ok) {
        const refresh = await fetch("/api/app-data", { cache: "no-store" });
        const payload = await refresh.json();
        setData(payload.data);
        setDatabaseStatus("neon");
        setStorageWarning("");
      } else {
        const payload = await response.json().catch(() => null);
        setDatabaseStatus("local");
        setStorageWarning(payload?.message ?? "Database belum terhubung, data tersimpan lokal di browser ini.");
      }
    } catch {
      setDatabaseStatus("error");
      setStorageWarning("Database belum terhubung, data tersimpan lokal di browser ini.");
    }
  };

  const breakdown = useMemo(() => (data ? fixedCostBreakdown(data.fixedCosts) : null), [data]);

  if (!data || !breakdown) {
    return (
      <div className="min-h-screen bg-[#fff9ef] p-4">
        <div className="mx-auto grid max-w-sm gap-3 pt-20">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg border border-[#eadfce] bg-white" />)}
          <p className="text-center text-sm font-medium text-[#0d4b3a]">Memuat Hera Clinic...</p>
        </div>
      </div>
    );
  }

  const lowMarginCount =
    data.treatments.filter((treatment) => treatmentResult(normalizeTreatmentForEdit(treatment), data.fixedCosts, "Promo").marginPercent < 20).length +
    data.products.filter((product) => productResult(product, "Promo").marginPercent < 20).length;
  const unpaidCommission = data.commissionLogs.filter((log) => log.paymentStatus === "Belum dibayar").reduce((sum, log) => sum + log.commissionAmount, 0);
  const paidCommission = data.commissionLogs.filter((log) => log.paymentStatus === "Sudah dibayar").reduce((sum, log) => sum + log.commissionAmount, 0);
  const estimatedProfit = data.commissionLogs.reduce((sum, log) => sum + log.netProfit, 0);
  const inventoryValue = (data.consumables ?? []).reduce((sum, item) => sum + item.availableQuantity * item.costPerSmallestUnit, 0);
  const lowStockCount = (data.consumables ?? []).filter((item) => item.minimumStock > 0 && item.availableQuantity <= item.minimumStock).length;

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-[#fff9ef] pb-28 text-[#2e2d28] lg:pb-12">
      <div className="flex min-h-screen max-w-full overflow-x-hidden">
        <aside className="hidden w-72 shrink-0 border-r border-[#e8dcc8] bg-[#0d4b3a] p-5 text-white lg:block">
          <div className="mb-8 rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#d8b65f]">Hera Clinic</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">HPP & Commission Calculator</h1>
          </div>
          <nav className="grid gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                    view === item.key ? "bg-[#d8b65f] text-[#123b30]" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button aria-label="Tutup menu" className="absolute inset-0 bg-black/45" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative z-10 h-full w-[min(82vw,320px)] overflow-y-auto bg-[#0d4b3a] p-5 text-white shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-white/15 bg-white/10 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#d8b65f]">Hera Clinic</p>
                  <h1 className="mt-2 text-xl font-semibold leading-tight">HPP & Commission</h1>
                </div>
                <button className="rounded-lg bg-white/10 p-2" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="grid gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setView(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                        view === item.key ? "bg-[#d8b65f] text-[#123b30]" : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        <section className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="min-w-0 border-b border-[#e8dcc8] bg-[#fffdf8]/90 px-4 py-4 backdrop-blur md:px-8">
            <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
              <button className="rounded-lg border border-[#ded2bf] bg-white p-2 text-[#0d4b3a]" onClick={() => setMobileMenuOpen(true)} aria-label="Buka menu">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold text-[#0d4b3a]">Hera Clinic</p>
                <p className="text-xs text-[#8b806f]">HPP & Komisi</p>
              </div>
              <div className="h-10 w-10" />
            </div>
            <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#b19042]">Suite finansial klinik estetika</p>
                <h2 className="mt-1 break-words text-2xl font-semibold text-[#0d4b3a]">{navItems.find((item) => item.key === view)?.label}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="danger" onClick={clearAllData}>Kosongkan Data</ActionButton>
                <ActionButton variant="ghost" onClick={seedSampleData}>Isi Contoh Data</ActionButton>
                <ActionButton variant="secondary" onClick={() => commissionReport(data.commissionLogs, "Semua log komisi")}>
                  <FileDown className="h-4 w-4" /> Export Komisi
                </ActionButton>
              </div>
            </div>
            {(storageWarning || loadError) && (
              <div className="mt-4 rounded-lg border border-[#d8b65f]/50 bg-[#fff8e8] p-3 text-sm font-medium text-[#6e5420]">
                {storageWarning || loadError}
              </div>
            )}
            <div className="mt-4 inline-flex rounded-full border border-[#ded2bf] bg-white px-3 py-1 text-xs font-semibold text-[#0d4b3a]">
              Database: {databaseStatus === "neon" ? "Neon aktif" : databaseStatus === "error" ? "Error koneksi" : "Lokal browser"}
            </div>
            <div className="mt-4 hidden max-w-full gap-2 overflow-x-auto sm:flex lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${view === item.key ? "bg-[#0d4b3a] text-white" : "bg-white text-[#0d4b3a]"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-x-hidden p-4 pb-24 md:p-8 md:pb-28">
            {view === "dashboard" && (
              <Dashboard
                data={data}
                fixedPerCustomer={breakdown.perCustomer}
                fixedMonthly={breakdown.totalWithInstallments}
                unpaidCommission={unpaidCommission}
                paidCommission={paidCommission}
                estimatedProfit={estimatedProfit}
                lowMarginCount={lowMarginCount}
                consumableCount={(data.consumables ?? []).length}
                lowStockCount={lowStockCount}
                inventoryValue={inventoryValue}
                hppPackageCount={(data.hppPackages ?? []).length}
                setView={setView}
              />
            )}
            {view === "fixed" && <FixedCostPage data={data} persist={persist} addCategory={addCategory} />}
            {view === "staffDirectory" && <StaffDirectoryPage data={data} persist={persist} editingStaff={editingStaff} setEditingStaff={setEditingStaff} />}
            {view === "treatments" && (
              <TreatmentPage
                data={data}
                persist={persist}
                editingTreatment={editingTreatment}
                setEditingTreatment={setEditingTreatment}
                openSimulation={(id) => {
                  setSimulationItemId(id);
                  setView("simulation");
                }}
                addCategory={addCategory}
              />
            )}
            {view === "commissionSimulation" && <CommissionSimulationPage data={data} persist={persist} />}
            {view === "commissionDrafts" && <CommissionDraftPage data={data} persist={persist} />}
            {view === "commissionHistory" && <CommissionHistoryPage data={data} />}
            {view === "consumables" && (
              <ConsumablesPage
                data={data}
                persist={persist}
                editingConsumable={editingConsumable}
                setEditingConsumable={setEditingConsumable}
                addCategory={addCategory}
              />
            )}
            {view === "hppPackages" && (
              <HppPackagesPage
                data={data}
                persist={persist}
                editingPackage={editingHppPackage}
                setEditingPackage={setEditingHppPackage}
              />
            )}
            {view === "products" && <ProductPage data={data} persist={persist} editingProduct={editingProduct} setEditingProduct={setEditingProduct} addCategory={addCategory} />}
            {view === "masterCategories" && <MasterCategoriesPage data={data} persist={persist} addCategory={addCategory} />}
            {view === "simulation" && (
              <SimulationPage
                data={data}
                persist={persist}
                initialItemId={simulationItemId}
                selectedSimulationId={selectedSimulationId}
                setSelectedSimulationId={setSelectedSimulationId}
              />
            )}
            {view === "logs" && <CommissionLogPage data={data} persist={persist} selectedLogIds={selectedLogIds} setSelectedLogIds={setSelectedLogIds} />}
            {view === "reports" && <ReportsPage data={data} selectedSimulationId={selectedSimulationId} />}
          </div>
        </section>
      </div>
      <MobileBottomNav view={view} setView={setView} />
    </main>
  );
}

function Dashboard(props: {
  data: StorageSchema;
  fixedMonthly: number;
  fixedPerCustomer: number;
  unpaidCommission: number;
  paidCommission: number;
  estimatedProfit: number;
  lowMarginCount: number;
  consumableCount: number;
  lowStockCount: number;
  inventoryValue: number;
  hppPackageCount: number;
  setView: (view: ViewKey) => void;
}) {
  const { data, fixedMonthly, fixedPerCustomer, unpaidCommission, paidCommission, estimatedProfit, lowMarginCount, consumableCount, lowStockCount, inventoryValue, hppPackageCount, setView } = props;
  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total fixed cost / bulan" value={rupiah(fixedMonthly)} />
        <StatCard label="Fixed cost / customer" value={rupiah(fixedPerCustomer)} tone="gold" />
        <StatCard label="Treatment tersimpan" value={`${data.treatments.length} treatment`} />
        <StatCard label="Produk retail" value={`${data.products.length} produk`} />
        <StatCard label="Komisi belum dibayar" value={rupiah(unpaidCommission)} tone="rose" />
        <StatCard label="Komisi sudah dibayar" value={rupiah(paidCommission)} />
        <StatCard label="Estimasi profit dari log" value={rupiah(estimatedProfit)} tone="gold" />
        <StatCard label="Low margin warning" value={`${lowMarginCount} item`} tone={lowMarginCount ? "rose" : "emerald"} />
        <StatCard label="Jumlah master bahan" value={`${consumableCount} bahan`} />
        <StatCard label="Bahan low stock" value={`${lowStockCount} bahan`} tone={lowStockCount ? "rose" : "emerald"} />
        <StatCard label="Estimasi nilai stok bahan" value={rupiah(inventoryValue)} tone="gold" />
        <StatCard label="Jumlah Paket HPP" value={`${hppPackageCount} paket`} />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {[
          ["Treatment HPP", "Atur direct HPP, overhead durasi, komisi multi-penerima, dan slider harga.", "treatments"],
          ["Simulasi Harga", "Cek skenario Normal, VIP, Promo, Manual, lalu simpan log komisi.", "simulation"],
          ["Laporan PDF", "Buat report treatment, simulasi, komisi, dan produk retail.", "reports"],
        ].map(([title, body, target]) => (
          <button key={title} onClick={() => setView(target as ViewKey)} className="min-w-0 rounded-lg border border-[#e8dcc8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-lg font-semibold text-[#0d4b3a]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#756b5d]">{body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileBottomNav({ view, setView }: { view: ViewKey; setView: (view: ViewKey) => void }) {
  const items: { key: ViewKey; label: string; icon: ElementType }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "treatments", label: "HPP", icon: Sparkles },
    { key: "simulation", label: "Simulasi", icon: Calculator },
    { key: "logs", label: "Komisi", icon: ClipboardList },
    { key: "hppPackages", label: "Paket", icon: ClipboardList },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e8dcc8] bg-[#fffdf8]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(46,45,40,0.08)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`grid min-w-0 justify-items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold ${active ? "bg-[#0d4b3a] text-white" : "text-[#0d4b3a]"}`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function StaffDirectoryPage({ data, persist, editingStaff, setEditingStaff }: { data: StorageSchema; persist: (next: StorageSchema) => void; editingStaff: StaffDirectoryItem; setEditingStaff: (staff: StaffDirectoryItem) => void }) {
  const [newRoleName, setNewRoleName] = useState("");
  const staffUsed = (staffId: string) => [...(data.commissionDrafts ?? []), ...(data.commissionHistory ?? [])].some((row) => row.staffId === staffId);
  const saveStaff = () => {
    if (!editingStaff.name.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    const synced = { ...editingStaff, staffCode: editingStaff.staffCode || nextStaffCode(data.staffDirectory), updatedAt: now };
    const exists = data.staffDirectory.some((staff) => staff.id === synced.id);
    persist({ ...data, staffDirectory: exists ? data.staffDirectory.map((staff) => staff.id === synced.id ? synced : staff) : [synced, ...data.staffDirectory] });
    setEditingStaff(emptyStaff(data.staffDirectory));
  };
  const duplicateStaff = (staff: StaffDirectoryItem) => {
    const copy = { ...staff, id: generateId("staff"), staffCode: nextStaffCode(data.staffDirectory), name: `${staff.name} Salinan`, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) };
    persist({ ...data, staffDirectory: [copy, ...data.staffDirectory] });
  };
  const deleteStaff = (staff: StaffDirectoryItem) => {
    if (staffUsed(staff.id)) {
      persist({ ...data, staffDirectory: data.staffDirectory.map((item) => item.id === staff.id ? { ...item, status: "inactive", updatedAt: new Date().toISOString().slice(0, 10) } : item) });
      window.alert("Staff sudah dipakai di riwayat komisi, jadi dinonaktifkan agar data lama tetap aman.");
      return;
    }
    if (window.confirm("Hapus staff ini?")) persist({ ...data, staffDirectory: data.staffDirectory.filter((item) => item.id !== staff.id) });
  };
  const upsertRole = (role: StaffRoleCategory) => {
    persist({ ...data, staffRoles: data.staffRoles.map((item) => item.id === role.id ? { ...role, updatedAt: new Date().toISOString().slice(0, 10) } : item) });
  };
  const addRole = () => {
    if (!newRoleName.trim()) return;
    const date = new Date().toISOString().slice(0, 10);
    persist({ ...data, staffRoles: [{ id: generateId("role"), name: newRoleName.trim(), active: true, createdAt: date, updatedAt: date }, ...data.staffRoles] });
    setNewRoleName("");
  };

  return (
    <div className="grid min-w-0 gap-6">
      <Card>
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Data Staff</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Kode staff" value={editingStaff.staffCode} onChange={(value) => setEditingStaff({ ...editingStaff, staffCode: value })} />
          <Field label="Nama staff" value={editingStaff.name} onChange={(value) => setEditingStaff({ ...editingStaff, name: value })} />
          <SelectField label="Role" value={editingStaff.role} onChange={(value) => setEditingStaff({ ...editingStaff, role: value as HeraStaffRole })}>
            {(data.staffRoles?.filter((role) => role.active).map((role) => role.name) ?? heraRoles).map((role) => <option key={role}>{role}</option>)}
          </SelectField>
          <SelectField label="Status" value={editingStaff.status} onChange={(value) => setEditingStaff({ ...editingStaff, status: value as StaffDirectoryItem["status"] })}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </SelectField>
          <Field label="Telepon optional" value={editingStaff.phone ?? ""} onChange={(value) => setEditingStaff({ ...editingStaff, phone: value })} />
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#ded2bf] bg-white px-3 text-sm">
            <input type="checkbox" checked={editingStaff.defaultCommissionEligible} onChange={(event) => setEditingStaff({ ...editingStaff, defaultCommissionEligible: event.target.checked })} />
            Commission Eligible
          </label>
          <div className="md:col-span-3"><Field label="Notes" value={editingStaff.notes ?? ""} onChange={(value) => setEditingStaff({ ...editingStaff, notes: value })} /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton onClick={saveStaff}><Save className="h-4 w-4" /> Simpan staff</ActionButton>
          <ActionButton variant="ghost" onClick={() => setEditingStaff(emptyStaff(data.staffDirectory))}><Plus className="h-4 w-4" /> Add staff</ActionButton>
        </div>
      </Card>
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0d4b3a]">Role Staff</h3>
            <p className="mt-1 text-sm text-[#756b5d]">Role nonaktif tidak muncul sebagai pilihan baru, tetapi data lama tetap aman.</p>
          </div>
          <div className="flex min-w-[280px] flex-wrap gap-2">
            <input className={inputClass("flex-1")} value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Role baru" />
            <ActionButton variant="ghost" onClick={addRole}><Plus className="h-4 w-4" /> Tambah role</ActionButton>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]"><tr>{["Role", "Status", "Action"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr></thead>
            <tbody>{data.staffRoles.map((role) => (
              <tr key={role.id} className="border-b border-[#efe4d2]">
                <td className="p-3"><input className={inputClass()} value={role.name} onChange={(event) => upsertRole({ ...role, name: event.target.value })} /></td>
                <td className="p-3">{role.active ? "Aktif" : "Nonaktif"}</td>
                <td className="p-3"><ActionButton variant={role.active ? "danger" : "secondary"} onClick={() => upsertRole({ ...role, active: !role.active })}>{role.active ? "Deactivate" : "Reactivate"}</ActionButton></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["Code", "Name", "Role", "Status", "Commission Eligible", "Notes", "Action"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
            </thead>
            <tbody>
              {data.staffDirectory.length === 0 ? <tr><td className="p-4 text-[#756b5d]" colSpan={7}>Belum ada staff.</td></tr> : data.staffDirectory.map((staff) => (
                <tr key={staff.id} className="border-b border-[#efe4d2]">
                  <td className="p-3 font-semibold text-[#0d4b3a]">{staff.staffCode}</td>
                  <td className="p-3">{staff.name}</td>
                  <td className="p-3">{staff.role}</td>
                  <td className="p-3">{staff.status}</td>
                  <td className="p-3">{staff.defaultCommissionEligible ? "Ya" : "Tidak"}</td>
                  <td className="p-3">{staff.notes || "-"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton variant="ghost" onClick={() => setEditingStaff(staff)}>Edit</ActionButton>
                      <ActionButton variant="secondary" onClick={() => duplicateStaff(staff)}><Copy className="h-4 w-4" /></ActionButton>
                      <ActionButton variant={staff.status === "active" ? "danger" : "secondary"} onClick={() => persist({ ...data, staffDirectory: data.staffDirectory.map((item) => item.id === staff.id ? { ...item, status: staff.status === "active" ? "inactive" : "active" } : item) })}>{staff.status === "active" ? "Deactivate" : "Reactivate"}</ActionButton>
                      <ActionButton variant="danger" onClick={() => deleteStaff(staff)}>Delete</ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FixedCostPage({ data, persist, addCategory }: { data: StorageSchema; persist: (next: StorageSchema) => void; addCategory: (group: CategoryGroup, name: string, notes?: string) => string }) {
  const settings = normalizeFixedCostSettings(data.fixedCosts);
  const breakdown = fixedCostBreakdown(settings);
  const totals = fixedCostTotals(settings);
  const [savedMessage, setSavedMessage] = useState("");
  const updateSettings = (next: FixedCostSettings, message = "") => {
    persist({ ...data, fixedCosts: normalizeFixedCostSettings(next) });
    if (message) {
      setSavedMessage(message);
      window.setTimeout(() => setSavedMessage(""), 2200);
    }
  };
  const update = (key: keyof FixedCostSettings, value: number) => updateSettings({ ...settings, [key]: value });

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total fixed cost included in HPP" value={rupiah(breakdown.totalWithoutInstallments)} />
        <StatCard label="Total cashflow-only cost" value={rupiah(breakdown.cashflowOnlyTotal)} tone="gold" />
        <StatCard label="Total excluded cost" value={rupiah(breakdown.excludedTotal)} tone="rose" />
        <StatCard label="Fixed cost per customer" value={rupiah(breakdown.perCustomer)} />
        <StatCard label="HPP after overhead" value={rupiah(breakdown.totalWithoutInstallments)} />
        <StatCard label="Cashflow burden" value={rupiah(breakdown.cashflowOnlyTotal)} tone="gold" />
        <StatCard label="Profit after overhead + installment" value={rupiah(breakdown.totalWithInstallments)} tone="gold" />
        <StatCard label="Total payroll klinik" value={rupiah(totals.payrollTotal)} />
      </div>
      {savedMessage && <div className="rounded-lg border border-[#bdd8cb] bg-white p-3 text-sm font-semibold text-[#0d4b3a]">{savedMessage}</div>}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0d4b3a]">Staff Cost</h3>
            <p className="mt-1 text-sm text-[#756b5d]">Gaji dihitung dari jumlah orang x gaji default + tunjangan, dengan opsi override manual.</p>
          </div>
          <ActionButton onClick={() => updateSettings(settings, "Pengaturan berhasil disimpan.")}><Save className="h-4 w-4" /> Save Staff Cost Settings</ActionButton>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["Role", "Jumlah orang", "Gaji/orang", "Tunjangan/orang", "Override?", "Total manual", "Total otomatis", "Mode", "Notes", "Action"].map((head) => <th key={head} className="p-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {(settings.staffCosts ?? []).map((staff) => (
                <tr key={staff.id} className="border-t border-[#efe4d2] align-top">
                  <td className="p-2"><CategorySelect label="" group="staff-role" value={staff.categoryId} fallbackName={staff.role} categories={data.categories} addCategory={addCategory} onChange={(categoryId, name) => updateSettings({ ...settings, staffCosts: settings.staffCosts!.map((item) => item.id === staff.id ? { ...item, categoryId, role: name || item.role } : item) })} /></td>
                  <td className="p-2"><input className={inputClass()} type="number" value={staff.count} onChange={(event) => updateSettings({ ...settings, staffCosts: settings.staffCosts!.map((item) => item.id === staff.id ? { ...item, count: Number(event.target.value) } : item) })} placeholder="Jumlah" /></td>
                  <td className="p-2"><input className={inputClass()} type="number" value={staff.salaryPerPerson} onChange={(event) => updateSettings({ ...settings, staffCosts: settings.staffCosts!.map((item) => item.id === staff.id ? { ...item, salaryPerPerson: Number(event.target.value) } : item) })} placeholder="Gaji per orang" /></td>
                  <td className="p-2"><input className={inputClass()} type="number" value={staff.allowancePerPerson} onChange={(event) => updateSettings({ ...settings, staffCosts: settings.staffCosts!.map((item) => item.id === staff.id ? { ...item, allowancePerPerson: Number(event.target.value) } : item) })} placeholder="Tunjangan" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={staff.overrideManual} onChange={(event) => updateSettings({ ...settings, staffCosts: settings.staffCosts!.map((item) => item.id === staff.id ? { ...item, overrideManual: event.target.checked } : item) })} /></td>
                  <td className="p-2"><input className={inputClass()} type="number" disabled={!staff.overrideManual} value={staff.manualTotal} onChange={(event) => updateSettings({ ...settings, staffCosts: settings.staffCosts!.map((item) => item.id === staff.id ? { ...item, manualTotal: Number(event.target.value) } : item) })} placeholder="Total manual" /></td>
                  <td className="p-2 font-semibold text-[#0d4b3a]">{rupiah(staffCostTotal(staff))}</td>
                  <td className="p-2"><ModeSelect value={staff.mode} onChange={(mode) => updateSettings({ ...settings, staffCosts: settings.staffCosts!.map((item) => item.id === staff.id ? { ...item, mode } : item) })} /></td>
                  <td className="p-2"><input className={inputClass()} value={staff.notes ?? ""} onChange={(event) => updateSettings({ ...settings, staffCosts: settings.staffCosts!.map((item) => item.id === staff.id ? { ...item, notes: event.target.value } : item) })} placeholder="Catatan" /></td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
                      <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]" onClick={() => updateSettings({ ...settings, staffCosts: [...(settings.staffCosts ?? []), { ...staff, id: generateId("staff"), role: `${staff.role || "Staff"} Salinan` }] })}>Copy</button>
                      <button type="button" className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]" onClick={() => window.confirm("Hapus item ini?") && updateSettings({ ...settings, staffCosts: settings.staffCosts!.filter((item) => item.id !== staff.id) })}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-[#eadfce] bg-[#fffaf2] p-3">
            <ActionButton variant="ghost" onClick={() => updateSettings({ ...settings, staffCosts: [...(settings.staffCosts ?? []), { id: generateId("staff"), role: "Other Staff", count: 1, salaryPerPerson: 0, allowancePerPerson: 0, mode: "hpp", overrideManual: false, manualTotal: 0, notes: "" }] })}><Plus className="h-4 w-4" /> Tambah Role Staff</ActionButton>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total payroll klinik" value={rupiah(totals.payrollTotal)} />
          <StatCard label="Total payroll included in HPP" value={rupiah((settings.staffCosts ?? []).filter((item) => item.mode === "hpp").reduce((sum, item) => sum + staffCostTotal(item), 0))} />
          <StatCard label="Total payroll cashflow only" value={rupiah((settings.staffCosts ?? []).filter((item) => item.mode === "cashflow").reduce((sum, item) => sum + staffCostTotal(item), 0))} tone="gold" />
        </div>
      </Card>

      <ElectricitySettingsSection settings={settings} treatments={data.treatments} categories={data.categories} addCategory={addCategory} updateSettings={(next) => updateSettings(next, "Pengaturan berhasil disimpan.")} />

      <Card>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-[#0d4b3a]">Other Fixed Costs</h3>
          <Save className="h-5 w-5 shrink-0 text-[#b19042]" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["Kategori", "Nama biaya", "Nominal / bulan", "Mode", "Notes", "Action"].map((head) => <th key={head} className="p-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {fixedCostFields.filter((field) => !["gajiDokter", "gajiTherapist", "gajiBeautician", "gajiAdmin"].includes(field.key as string)).map((field) => {
                const key = field.key as string;
                const isElectricity = key === "listrik";
                const electricity = settings.electricitySettings!;
                const amount = isElectricity ? electricitySummary(settings).totalMonthly : Number(settings[field.key]);
                return (
                  <tr key={field.key} className="border-t border-[#efe4d2] align-top">
                    <td className="p-2">
                      <CategorySelect
                        label=""
                        group={field.installment ? "installment" : "fixed-cost"}
                        value={(settings.costNotes as Record<string, string> | undefined)?.[`${field.key}CategoryId`]}
                        fallbackName={field.installment ? "Cicilan / cashflow" : "Biaya tetap"}
                        categories={data.categories}
                        addCategory={addCategory}
                        onChange={(categoryId) => updateSettings({ ...settings, costNotes: { ...(settings.costNotes ?? {}), [`${field.key}CategoryId`]: categoryId } })}
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-semibold text-[#4d473d]">{field.label}</div>
                      {isElectricity && (
                        <label className="mt-2 flex items-center gap-2 text-xs text-[#756b5d]">
                          <input
                            type="checkbox"
                            checked={electricity.useCalculatorTotal}
                            onChange={(event) => updateSettings({ ...settings, electricitySettings: { ...electricity, useCalculatorTotal: event.target.checked } })}
                          />
                          Gunakan total dari kalkulator listrik
                        </label>
                      )}
                    </td>
                    <td className="p-2">
                      <input
                        className={inputClass()}
                        type="number"
                        value={Math.round(amount)}
                        disabled={isElectricity && electricity.useCalculatorTotal}
                        onChange={(event) => isElectricity ? update("listrik", Number(event.target.value)) : update(field.key, Number(event.target.value))}
                        placeholder="Nominal per bulan"
                      />
                    </td>
                    <td className="p-2">
                      <ModeSelect
                        value={isElectricity ? electricity.mode : settings.costModes?.[key] ?? (field.installment ? "cashflow" : "hpp")}
                        onChange={(mode) => isElectricity
                          ? updateSettings({ ...settings, electricitySettings: { ...electricity, mode } })
                          : updateSettings({ ...settings, costModes: { ...(settings.costModes ?? {}), [field.key]: mode } })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className={inputClass()}
                        value={isElectricity ? electricity.notes ?? "" : settings.costNotes?.[key] ?? ""}
                        onChange={(event) => isElectricity
                          ? updateSettings({ ...settings, electricitySettings: { ...electricity, notes: event.target.value } })
                          : updateSettings({ ...settings, costNotes: { ...(settings.costNotes ?? {}), [field.key]: event.target.value } })}
                        placeholder="Catatan"
                      />
                    </td>
                    <td className="p-2">
                      <ActionButton variant="ghost" onClick={() => isElectricity ? update("listrik", 0) : update(field.key, 0)}>Reset</ActionButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#0d4b3a]">Allocation Settings</h3>
          <ActionButton onClick={() => updateSettings(settings, "Pengaturan berhasil disimpan.")}><Save className="h-4 w-4" /> Save Fixed Cost Settings</ActionButton>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-3">
          <Field label="Jumlah hari kerja / bulan" type="number" value={settings.workingDays} onChange={(value) => update("workingDays", Number(value))} />
          <Field label="Jam operasional / hari" type="number" value={settings.operatingHours} onChange={(value) => update("operatingHours", Number(value))} />
          <Field label="Estimasi customer / bulan" type="number" value={settings.averageCustomers} onChange={(value) => update("averageCustomers", Number(value))} />
        </div>
      </Card>
    </div>
  );
}

function modeLabel(mode: FixedCostMode) {
  if (mode === "hpp") return "Masuk HPP";
  if (mode === "cashflow") return "Cashflow saja";
  return "Tidak dihitung";
}

function ModeSelect({ value, onChange }: { value: FixedCostMode; onChange: (mode: FixedCostMode) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as FixedCostMode)} className={inputClass()}>
      <option value="hpp">Masuk HPP</option>
      <option value="cashflow">Cashflow saja</option>
      <option value="exclude">Tidak dihitung</option>
    </select>
  );
}

function FixedCostModeRow({
  label,
  amount,
  mode,
  notes,
  categoryId,
  categories,
  addCategory,
  onAmount,
  onMode,
  onNotes,
  onCategory,
}: {
  label: string;
  amount: number;
  mode: FixedCostMode;
  notes: string;
  categoryId?: string;
  categories: HppCategory[];
  addCategory: (group: CategoryGroup, name: string, notes?: string) => string;
  onAmount: (value: number) => void;
  onMode: (mode: FixedCostMode) => void;
  onNotes: (notes: string) => void;
  onCategory: (categoryId: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px_minmax(0,1fr)]">
      <CategorySelect label="Kategori" group="fixed-cost" value={categoryId} fallbackName={label} categories={categories} addCategory={addCategory} onChange={(id) => onCategory(id)} />
      <input className={inputClass()} type="number" value={amount} onChange={(event) => onAmount(Number(event.target.value))} />
      <ModeSelect value={mode} onChange={onMode} />
      <input className={inputClass()} value={notes} onChange={(event) => onNotes(event.target.value)} placeholder="Notes optional" />
    </div>
  );
}

function CategorySelect({
  label,
  group,
  value,
  fallbackName,
  categories,
  onChange,
  addCategory,
}: {
  label: string;
  group: CategoryGroup;
  value?: string;
  fallbackName?: string;
  categories: HppCategory[];
  onChange: (categoryId: string, categoryName: string) => void;
  addCategory: (group: CategoryGroup, name: string, notes?: string) => string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [notes, setNotes] = useState("");
  const active = categories.filter((item) => item.group === group && item.active);
  const selectedExists = value ? categories.some((item) => item.id === value) : false;

  const save = () => {
    const id = addCategory(group, newName, notes);
    if (id) onChange(id, newName.trim());
    setShowModal(false);
    setNewName("");
    setNotes("");
  };

  return (
    <label className="grid min-w-0 gap-1.5 text-sm text-[#4d473d]">
      {label ? <span className="font-medium">{label}</span> : null}
      <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2">
        <select
          value={selectedExists ? value : fallbackName ? `legacy:${fallbackName}` : ""}
          onChange={(event) => {
            if (event.target.value.startsWith("legacy:")) {
              onChange("", event.target.value.replace("legacy:", ""));
              return;
            }
            const item = categories.find((category) => category.id === event.target.value);
            onChange(event.target.value, item?.name ?? "");
          }}
          className={inputClass()}
        >
          {!selectedExists && fallbackName && <option value={`legacy:${fallbackName}`}>{fallbackName} (custom lama)</option>}
          <option value="">Pilih kategori</option>
          {active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button type="button" onClick={() => setShowModal(true)} className="min-h-11 rounded-lg border border-[#ded2bf] bg-white text-sm font-bold text-[#0d4b3a]">+</button>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#e8dcc8] bg-[#fffdf8] p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0d4b3a]">Tambah Kategori</h3>
            <p className="mt-1 text-sm text-[#756b5d]">Group: {group}</p>
            <div className="mt-4 grid gap-3">
              <Field label="Nama kategori" value={newName} onChange={setNewName} />
              <Field label="Notes optional" value={notes} onChange={setNotes} />
              <div className="flex flex-wrap justify-end gap-2">
                <ActionButton variant="ghost" onClick={() => setShowModal(false)}>Batal</ActionButton>
                <ActionButton onClick={save}>Save</ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </label>
  );
}

function ElectricitySettingsSection({
  settings,
  treatments,
  categories,
  addCategory,
  updateSettings,
}: {
  settings: FixedCostSettings;
  treatments: Treatment[];
  categories: HppCategory[];
  addCategory: (group: CategoryGroup, name: string, notes?: string) => string;
  updateSettings: (settings: FixedCostSettings) => void;
}) {
  const electricity = settings.electricitySettings!;
  const summary = electricitySummary(settings);
  const updateElectricity = (patch: Partial<NonNullable<FixedCostSettings["electricitySettings"]>>) =>
    updateSettings({ ...settings, electricitySettings: { ...electricity, ...patch } });
  const updateDevice = (id: string, patch: Partial<ElectricityDeviceItem>) =>
    updateElectricity({ devices: electricity.devices.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  const updateAc = (id: string, patch: Partial<ElectricityAcItem>) =>
    updateElectricity({ acItems: electricity.acItems.map((item) => (item.id === id ? { ...item, ...patch } : item)) });

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#0d4b3a]">Kalkulator listrik</h3>
          <p className="mt-1 text-sm text-[#756b5d]">Daya 7700 VA Bisnis. Tarif per kWh dapat disesuaikan berdasarkan tagihan PLN terbaru.</p>
        </div>
        <ActionButton onClick={() => updateSettings(settings)}><Save className="h-4 w-4" /> Save Electricity Settings</ActionButton>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Daya listrik (VA)" type="number" value={electricity.powerVa} onChange={(value) => updateElectricity({ powerVa: Number(value) })} />
        <Field label="Golongan" value={electricity.group} onChange={(value) => updateElectricity({ group: value })} />
        <Field label="Tarif per kWh" type="number" value={electricity.tariffPerKwh} onChange={(value) => updateElectricity({ tariffPerKwh: Number(value), devices: electricity.devices.map((item) => ({ ...item, tariffPerKwh: Number(value) })), acItems: electricity.acItems.map((item) => ({ ...item, tariffPerKwh: Number(value) })) })} />
        <Field label="Monthly electricity fixed/manual adjustment" type="number" value={electricity.manualAdjustment} onChange={(value) => updateElectricity({ manualAdjustment: Number(value) })} />
        <Field label="PPJ/admin fee optional" type="number" value={electricity.ppjAdminFee} onChange={(value) => updateElectricity({ ppjAdminFee: Number(value) })} />
        <Field label="Other electricity charges optional" type="number" value={electricity.otherCharges} onChange={(value) => updateElectricity({ otherCharges: Number(value) })} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)]">
        <ModeSelect value={electricity.mode} onChange={(mode) => updateElectricity({ mode })} />
        <label className="flex items-center gap-2 rounded-lg border border-[#ded2bf] bg-white px-3 text-sm"><input type="checkbox" checked={electricity.manualOverride} onChange={(event) => updateElectricity({ manualOverride: event.target.checked })} /> Override listrik manual</label>
        <input className={inputClass()} type="number" disabled={!electricity.manualOverride} value={electricity.manualMonthlyTotal} onChange={(event) => updateElectricity({ manualMonthlyTotal: Number(event.target.value) })} placeholder="Total listrik manual" />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Device electricity per treatment total" value={rupiah(electricity.devices.filter((item) => item.includeInTreatmentHpp).reduce((sum, item) => sum + deviceElectricityCost(item).costPerUse, 0))} />
        <StatCard label="Estimated monthly device electricity" value={rupiah(summary.deviceMonthly)} />
        <StatCard label="Estimated monthly AC electricity" value={rupiah(summary.acMonthly)} />
        <StatCard label="Total estimated monthly electricity" value={rupiah(summary.totalMonthly)} tone="gold" />
        <StatCard label="Electricity included in HPP" value={rupiah(summary.includedInHpp)} />
        <StatCard label="Electricity cashflow only" value={rupiah(summary.cashflowOnly)} tone="gold" />
        <StatCard label="Electricity excluded" value={rupiah(summary.excluded)} tone="rose" />
      </div>

      <div className="mt-6 grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-[#0d4b3a]">Biaya listrik per tindakan</h4>
            <p className="mt-1 text-sm text-[#756b5d]">Hitung biaya listrik alat berdasarkan watt, durasi pemakaian, dan tarif listrik per kWh.</p>
          </div>
          <ActionButton variant="ghost" onClick={() => updateElectricity({ devices: [...electricity.devices, { id: generateId("dev"), name: "Other device", watt: 0, quantity: 1, durationMinutes: 30, usagePerTreatment: 1, estimatedUsesPerMonth: 0, tariffPerKwh: electricity.tariffPerKwh, includeInTreatmentHpp: true, linkedTreatmentId: "", notes: "" }] })}><Plus className="h-4 w-4" /> Tambah alat listrik</ActionButton>
        </div>
        {electricity.devices.length === 0 ? <EmptyState text="Belum ada alat listrik per tindakan." /> : (
          <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
            <table className="w-full min-w-[1480px] text-sm">
              <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
                <tr>
                  {["Kategori alat", "Nama alat", "Watt alat", "Jumlah alat", "Durasi pakai / tindakan (menit)", "Est. tindakan / bulan", "Tarif listrik / kWh", "Link treatment", "Masuk HPP?", "kWh / tindakan", "Rp / tindakan", "Rp / bulan", "Aksi"].map((head) => <th key={head} className="p-2 align-bottom">{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {electricity.devices.map((device) => {
                  const cost = deviceElectricityCost(device);
                  return (
                    <tr key={device.id} className="border-t border-[#efe4d2] align-top">
                      <td className="p-2"><CategorySelect label="" group="electricity-device" value={device.categoryId} fallbackName={device.name} categories={categories} addCategory={addCategory} onChange={(categoryId) => updateDevice(device.id, { categoryId })} /></td>
                      <td className="p-2"><input className={inputClass()} value={device.name} onChange={(event) => updateDevice(device.id, { name: event.target.value })} placeholder="Nama alat" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={device.watt} onChange={(event) => updateDevice(device.id, { watt: Number(event.target.value) })} placeholder="Watt alat, contoh 1200" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={device.quantity} onChange={(event) => updateDevice(device.id, { quantity: Number(event.target.value) })} placeholder="Jumlah, contoh 1" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={device.durationMinutes} onChange={(event) => updateDevice(device.id, { durationMinutes: Number(event.target.value) })} placeholder="Menit, contoh 20" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={device.estimatedUsesPerMonth} onChange={(event) => updateDevice(device.id, { estimatedUsesPerMonth: Number(event.target.value) })} placeholder="Tindakan/bulan, contoh 40" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={device.tariffPerKwh} onChange={(event) => updateDevice(device.id, { tariffPerKwh: Number(event.target.value) })} placeholder="Tarif/kWh, contoh 1444.7" /></td>
                      <td className="p-2"><select className={inputClass()} value={device.linkedTreatmentId ?? ""} onChange={(event) => updateDevice(device.id, { linkedTreatmentId: event.target.value })}><option value="">Tidak di-link</option>{treatments.map((treatment) => <option key={treatment.id} value={treatment.id}>{treatment.name}</option>)}</select></td>
                      <td className="p-2 text-center"><input type="checkbox" checked={device.includeInTreatmentHpp} onChange={(event) => updateDevice(device.id, { includeInTreatmentHpp: event.target.checked })} /></td>
                      <td className="p-2 font-medium">{cost.kwhPerUse.toFixed(3)}</td>
                      <td className="p-2 font-semibold text-[#0d4b3a]">{rupiah(cost.costPerUse)}</td>
                      <td className="p-2 font-semibold text-[#0d4b3a]">{rupiah(cost.monthlyCost)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
                          <button
                            type="button"
                            className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]"
                            onClick={() => updateElectricity({ devices: [...electricity.devices, { ...device, id: generateId("dev"), name: `${device.name || "Alat"} Salinan` }] })}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]"
                            onClick={() => window.confirm("Hapus item ini?\n\nData yang sudah dipakai di laporan lama tidak akan ikut berubah jika sudah disimpan sebagai snapshot.") && updateElectricity({ devices: electricity.devices.filter((item) => item.id !== device.id) })}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs leading-5 text-[#756b5d]">Formula: Watt x Jumlah x Durasi menit / 60 / 1000 x Tarif/kWh</p>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-[#0d4b3a]">Biaya listrik bulanan AC</h4>
          <ActionButton variant="ghost" onClick={() => updateElectricity({ acItems: [...electricity.acItems, { id: generateId("ac"), name: "Other", pkOption: "1 PK", watt: 900, quantity: 1, hoursPerDay: 8, daysPerMonth: 26, efficiencyFactor: 1, tariffPerKwh: electricity.tariffPerKwh, mode: "hpp" }] })}><Plus className="h-4 w-4" /> Tambah AC</ActionButton>
        </div>
        {electricity.acItems.length === 0 ? <EmptyState text="Belum ada data AC." /> : (
          <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
            <table className="w-full min-w-[1500px] text-sm">
              <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
                <tr>{["Room category", "Room name", "PK", "Watt", "Jumlah AC", "Jam pakai / hari", "Hari pakai / bulan", "Faktor efisiensi", "Mode", "Total kWh / bulan", "Total Rp / bulan", "Cost per operational day", "Cost per estimated customer", "Aksi"].map((head) => <th key={head} className="p-2">{head}</th>)}</tr>
              </thead>
              <tbody>
                {electricity.acItems.map((ac) => {
                  const cost = acElectricityCost(ac);
                  return (
                    <tr key={ac.id} className="border-t border-[#efe4d2] align-top">
                      <td className="p-2"><CategorySelect label="" group="ac-room" value={ac.categoryId} fallbackName={ac.name} categories={categories} addCategory={addCategory} onChange={(categoryId) => updateAc(ac.id, { categoryId })} /></td>
                      <td className="p-2"><input className={inputClass()} value={ac.name} onChange={(event) => updateAc(ac.id, { name: event.target.value })} placeholder="Nama ruangan" /></td>
                      <td className="p-2"><select className={inputClass()} value={ac.pkOption} onChange={(event) => updateAc(ac.id, { pkOption: event.target.value as ElectricityAcItem["pkOption"] })}>{["1/2 PK", "3/4 PK", "1 PK", "1.5 PK", "2 PK", "custom"].map((pk) => <option key={pk}>{pk}</option>)}</select></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={ac.watt} onChange={(event) => updateAc(ac.id, { watt: Number(event.target.value) })} placeholder="Watt" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={ac.quantity} onChange={(event) => updateAc(ac.id, { quantity: Number(event.target.value) })} placeholder="Jumlah AC" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={ac.hoursPerDay} onChange={(event) => updateAc(ac.id, { hoursPerDay: Number(event.target.value) })} placeholder="Jam pakai / hari" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={ac.daysPerMonth} onChange={(event) => updateAc(ac.id, { daysPerMonth: Number(event.target.value) })} placeholder="Hari pakai / bulan" /></td>
                      <td className="p-2"><input className={inputClass()} type="number" value={ac.efficiencyFactor} onChange={(event) => updateAc(ac.id, { efficiencyFactor: Number(event.target.value) })} placeholder="Faktor efisiensi" /></td>
                      <td className="p-2"><ModeSelect value={ac.mode} onChange={(mode) => updateAc(ac.id, { mode })} /></td>
                      <td className="p-2 font-medium">{cost.monthlyKwh.toFixed(2)}</td>
                      <td className="p-2 font-semibold text-[#0d4b3a]">{rupiah(cost.monthlyCost)}</td>
                      <td className="p-2">{rupiah(cost.monthlyCost / Math.max(settings.workingDays, 1))}</td>
                      <td className="p-2">{rupiah(cost.monthlyCost / Math.max(settings.averageCustomers, 1))}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
                          <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]" onClick={() => updateElectricity({ acItems: [...electricity.acItems, { ...ac, id: generateId("ac"), name: `${ac.name || "AC"} Salinan` }] })}>Copy</button>
                          <button type="button" className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]" onClick={() => window.confirm("Hapus item ini?\n\nData yang sudah dipakai di laporan lama tidak akan ikut berubah jika sudah disimpan sebagai snapshot.") && updateElectricity({ acItems: electricity.acItems.filter((item) => item.id !== ac.id) })}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

function TreatmentPage(props: {
  data: StorageSchema;
  persist: (next: StorageSchema) => void;
  editingTreatment: Treatment;
  setEditingTreatment: (treatment: Treatment) => void;
  openSimulation: (id: string) => void;
  addCategory: (group: CategoryGroup, name: string, notes?: string) => string;
}) {
  const { data, persist, setEditingTreatment, openSimulation, addCategory } = props;
  const editingTreatment = normalizeTreatmentForEdit(props.editingTreatment);
  const [priceMode, setPriceMode] = useState<PriceMode>("Normal");
  const [handlers, setHandlers] = useState<StaffHandlerSelection>(emptyHandlers());
  const defaultPrice = priceMode === "VIP" ? editingTreatment.vipPrice : priceMode === "Promo" ? editingTreatment.promoPrice : editingTreatment.nonVipPrice;
  const baseResult = treatmentResult(editingTreatment, data.fixedCosts, priceMode === "Manual" ? "Normal" : priceMode, defaultPrice);
  const sliderMax = Math.max(baseResult.recommendedPrice * 3, editingTreatment.nonVipPrice * 2, baseResult.totalCost + 100000);
  const [manualPrice, setManualPrice] = useState(0);
  const [savedMessage, setSavedMessage] = useState("");
  const sellingPrice = priceMode === "Manual" ? manualPrice || Math.ceil(baseResult.recommendedPrice / 10000) * 10000 : defaultPrice;
  const liveResult = treatmentResult(editingTreatment, data.fixedCosts, priceMode === "Manual" ? "Normal" : priceMode, sellingPrice);
  const heraCommissionRows = buildCommissionPreviewRows({
    rules: editingTreatment.heraCommissionRules ?? defaultHeraCommissionRules(),
    staff: data.staffDirectory ?? [],
    handlers,
    normalPrice: editingTreatment.nonVipPrice,
    finalAllocatedAmount: sellingPrice,
    itemName: editingTreatment.name || "Treatment belum dinamai",
    treatmentId: editingTreatment.id,
    hppCost: liveResult.totalCost,
    invoiceNumber: "PREVIEW",
    patientName: "",
    transactionDate: new Date().toISOString().slice(0, 10),
  });
  const heraCommissionTotal = heraCommissionRows.reduce((sum, row) => sum + row.calculatedCommission, 0);

  useEffect(() => {
    if (manualPrice === 0 && baseResult.recommendedPrice > 0) setManualPrice(Math.ceil(baseResult.recommendedPrice / 10000) * 10000);
  }, [baseResult.recommendedPrice, manualPrice]);

  const updateTreatment = (next: Treatment) => setEditingTreatment({ ...next, disposableCosts: next.disposableItems ?? next.disposableCosts });
  const saveTreatment = () => {
    if (!editingTreatment.name.trim()) return;
    const synced = { ...editingTreatment, disposableCosts: editingTreatment.disposableItems ?? editingTreatment.disposableCosts };
    const exists = data.treatments.some((treatment) => treatment.id === synced.id);
    persist({ ...data, treatments: exists ? data.treatments.map((treatment) => (treatment.id === synced.id ? synced : treatment)) : [synced, ...data.treatments] });
    setSavedMessage("Data berhasil disimpan.");
    window.setTimeout(() => setSavedMessage(""), 2200);
    setEditingTreatment(emptyTreatment());
  };
  const deleteTreatment = (id: string) => {
    if (window.confirm("Hapus treatment ini?")) persist({ ...data, treatments: data.treatments.filter((item) => item.id !== id) });
  };

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.58fr)]">
      <div className="grid min-w-0 gap-5">
        <Card className="p-4">
          <div>
            <h3 className="text-base font-semibold text-[#0d4b3a]">Master Data Treatment</h3>
            <p className="mt-1 text-xs text-[#756b5d]">Atur biaya, bahan, harga, dan komisi treatment dalam satu alur.</p>
          </div>
          <div className="mt-4 grid min-w-0 gap-3.5">
            <div className="grid min-w-0 gap-3 md:grid-cols-3">
              <Field label="Nama treatment" value={editingTreatment.name} onChange={(value) => updateTreatment({ ...editingTreatment, name: value })} />
              <CategorySelect label="Kategori treatment" group="product" fallbackName={editingTreatment.category} categories={data.categories} addCategory={addCategory} onChange={(_id, name) => updateTreatment({ ...editingTreatment, category: name })} />
              <Field label="Durasi treatment (menit)" type="number" value={editingTreatment.durationMinutes} onChange={(value) => updateTreatment({ ...editingTreatment, durationMinutes: Number(value) })} />
            </div>

            <HppPackageInsertSection treatment={editingTreatment} updateTreatment={updateTreatment} packages={data.hppPackages ?? []} />
            <DynamicDisposableSection treatment={editingTreatment} updateTreatment={updateTreatment} categories={data.categories} addCategory={addCategory} />
            <DynamicConsumableUsageSection treatment={editingTreatment} updateTreatment={updateTreatment} consumables={data.consumables ?? []} />
            <DynamicMaterialSection treatment={editingTreatment} updateTreatment={updateTreatment} categories={data.categories} addCategory={addCategory} />
            <DynamicMachineSection treatment={editingTreatment} updateTreatment={updateTreatment} />
            <TreatmentDeviceElectricitySection treatment={editingTreatment} updateTreatment={updateTreatment} defaultTariff={data.fixedCosts.electricitySettings?.tariffPerKwh ?? 1444} />
            <TreatmentShotCartridgeSection treatment={editingTreatment} updateTreatment={updateTreatment} />
            <TreatmentStaffFeeSection treatment={editingTreatment} updateTreatment={updateTreatment} basePrice={editingTreatment.nonVipPrice} />
            <TreatmentOverheadSection treatment={editingTreatment} updateTreatment={updateTreatment} settings={data.fixedCosts} />
            <HeraCommissionRulesEditor rules={editingTreatment.heraCommissionRules ?? defaultHeraCommissionRules()} onChange={(rules) => updateTreatment({ ...editingTreatment, heraCommissionRules: rules })} />
            <StaffHandlerSection staff={data.staffDirectory ?? []} handlers={handlers} setHandlers={setHandlers} />

            <div>
              <p className="mb-2 text-sm font-semibold text-[#0d4b3a]">Staff yang terlibat</p>
              <div className="grid min-w-0 grid-cols-2 gap-2 md:grid-cols-4">
                {roles.filter((role) => role !== "other").map((role) => (
                  <label key={role} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#ded2bf] bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editingTreatment.staffInvolved.includes(role)}
                      onChange={(event) =>
                        updateTreatment({
                          ...editingTreatment,
                          staffInvolved: event.target.checked ? [...editingTreatment.staffInvolved, role] : editingTreatment.staffInvolved.filter((item) => item !== role),
                        })
                      }
                    />
                    <span className="truncate">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Harga Normal / Non-VIP" type="number" value={editingTreatment.nonVipPrice} onChange={(value) => updateTreatment({ ...editingTreatment, nonVipPrice: Number(value) })} />
              <Field label="Harga VIP" type="number" value={editingTreatment.vipPrice} onChange={(value) => updateTreatment({ ...editingTreatment, vipPrice: Number(value) })} />
              <Field label="Harga Promo" type="number" value={editingTreatment.promoPrice} onChange={(value) => updateTreatment({ ...editingTreatment, promoPrice: Number(value) })} />
              <Field label="Target Margin (%)" type="number" value={editingTreatment.targetMarginPercent} onChange={(value) => updateTreatment({ ...editingTreatment, targetMarginPercent: Number(value) })} />
            </div>

            <CommissionEditor rules={editingTreatment.commissionRules} onChange={(rules) => updateTreatment({ ...editingTreatment, commissionRules: rules })} />

            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={saveTreatment}><Save className="h-4 w-4" /> Simpan treatment</ActionButton>
              <ActionButton variant="ghost" onClick={() => setEditingTreatment(emptyTreatment())}><Plus className="h-4 w-4" /> Baru</ActionButton>
            </div>
            {savedMessage && <div className="rounded-lg border border-[#bdd8cb] bg-white p-3 text-sm font-semibold text-[#0d4b3a]">{savedMessage}</div>}
          </div>
        </Card>

        <TreatmentTable data={data} deleteTreatment={deleteTreatment} editTreatment={(treatment) => setEditingTreatment(normalizeTreatmentForEdit(treatment))} openSimulation={openSimulation} />
      </div>

      <div className="min-w-0">
        <Card className="max-w-full p-4 2xl:sticky 2xl:top-6">
          <h3 className="text-base font-semibold text-[#0d4b3a]">Simulasi Harga & Profit</h3>
          <div className="mt-3 grid min-w-0 gap-3">
            <div className="grid min-w-0 gap-2 lg:grid-cols-2 2xl:grid-cols-1 min-[1500px]:grid-cols-2">
              <StatCard label="Consumable + material + alat" value={rupiah(liveResult.directHpp - treatmentDeviceElectricityTotal(editingTreatment.deviceElectricityCosts) - treatmentShotCartridgeTotal(editingTreatment.shotCartridgeCosts) - treatmentStaffFeeTotal(editingTreatment.staffFeeCosts) - liveResult.electricityPerTreatment)} />
              <StatCard label="Listrik device treatment" value={rupiah(treatmentDeviceElectricityTotal(editingTreatment.deviceElectricityCosts) + liveResult.electricityPerTreatment)} tone="gold" />
              <StatCard label="Shot / cartridge" value={rupiah(treatmentShotCartridgeTotal(editingTreatment.shotCartridgeCosts))} tone="gold" />
              <StatCard label="Staff fee masuk HPP" value={rupiah(treatmentStaffFeeTotal(editingTreatment.staffFeeCosts))} tone="gold" />
              <StatCard label="Total komisi Hera" value={rupiah(heraCommissionTotal)} tone="gold" />
              <StatCard label="Direct HPP" value={rupiah(liveResult.directHpp)} />
              <StatCard label="Biaya listrik per tindakan" value={rupiah(liveResult.electricityPerTreatment)} tone="gold" />
              <StatCard label="Overhead per treatment" value={rupiah(liveResult.overheadAllocated)} tone="gold" />
              <StatCard label="Total cost sebelum komisi" value={rupiah(liveResult.totalCost)} />
              <StatCard label="Recommended minimum price" value={rupiah(liveResult.totalCost)} />
              <StatCard label="Recommended price target margin" value={rupiah(liveResult.recommendedPrice)} tone="gold" />
              <StatCard label="Harga Normal / VIP / Promo" value={`${rupiah(editingTreatment.nonVipPrice)} / ${rupiah(editingTreatment.vipPrice)} / ${rupiah(editingTreatment.promoPrice)}`} />
            </div>

            <div className="rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3">
              <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-1 min-[1500px]:grid-cols-2">
                <SelectField label="Tier harga" value={priceMode} onChange={(value) => setPriceMode(value as PriceMode)}>
                  {["Normal", "VIP", "Promo", "Manual"].map((mode) => <option key={mode}>{mode}</option>)}
                </SelectField>
                <Field label="Harga jual manual" type="number" value={sellingPrice} onChange={(value) => setManualPrice(Number(value))} />
              </div>
              <input
                type="range"
                min={Math.max(0, Math.floor(liveResult.totalCost / 10000) * 10000)}
                max={Math.ceil(sliderMax / 10000) * 10000}
                step={10000}
                value={sellingPrice}
                onChange={(event) => {
                  setPriceMode("Manual");
                  setManualPrice(Number(event.target.value));
                }}
                className="mt-4 w-full accent-[#0d4b3a]"
              />
            </div>

            <div className="grid min-w-0 gap-2 lg:grid-cols-2 2xl:grid-cols-1 min-[1500px]:grid-cols-2">
              <StatCard label="Harga jual" value={rupiah(liveResult.sellingPrice)} />
              <StatCard label="HPP" value={rupiah(liveResult.totalCost)} />
              <StatCard label="HPP + komisi" value={rupiah(liveResult.totalCost + heraCommissionTotal)} tone="gold" />
              <StatCard label="Komisi" value={rupiah(liveResult.totalCommission)} tone="gold" />
              <StatCard label="Profit setelah komisi Hera" value={rupiah(liveResult.sellingPrice - liveResult.totalCost - heraCommissionTotal)} tone={liveResult.sellingPrice - liveResult.totalCost - heraCommissionTotal < 0 ? "rose" : "emerald"} />
              <StatCard label="Margin setelah komisi" value={percent(liveResult.sellingPrice > 0 ? ((liveResult.sellingPrice - liveResult.totalCost - heraCommissionTotal) / liveResult.sellingPrice) * 100 : 0)} tone={liveResult.marginPercent < editingTreatment.targetMarginPercent ? "rose" : "emerald"} />
            </div>
            <CommissionDraftPreview rows={heraCommissionRows} />

            {liveResult.marginPercent < editingTreatment.targetMarginPercent && (
              <div className="rounded-lg border border-[#e1aaa0] bg-[#fff2ef] p-4 text-sm font-medium text-[#a33a2d]">
                Margin bersih masih di bawah target {percent(editingTreatment.targetMarginPercent)}. Naikkan harga atau sesuaikan komisi.
              </div>
            )}

            <CommissionBreakdown rules={liveResult.commissionBreakdown ?? []} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function DynamicDisposableSection({ treatment, updateTreatment, categories, addCategory }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void; categories: HppCategory[]; addCategory: (group: CategoryGroup, name: string, notes?: string) => string }) {
  const items = treatment.disposableItems ?? treatment.disposableCosts ?? [];
  const updateItem = (id: string, patch: Partial<TreatmentCostItem>) => updateTreatment({ ...treatment, disposableItems: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#0d4b3a]">Disposable Cost per Customer</p>
          <p className="mt-0.5 text-xs text-[#756b5d]">Kelola item habis pakai per pasien dalam daftar ringkas.</p>
        </div>
        <ActionButton variant="secondary" onClick={() => updateTreatment({ ...treatment, disposableItems: [...items, { id: generateId("cost"), name: "", amount: 0 }] })}>
          <Plus className="h-4 w-4" /> Tambah item disposable
        </ActionButton>
      </div>
      {items.length === 0 ? <EmptyState text="Belum ada disposable item. Tambahkan needle, kapas, spuit, anestesi, atau item lain." /> : (
        <div className="max-w-full overflow-x-auto rounded-lg border border-[#eadfce] bg-white">
          <div className="hidden min-w-[640px] grid-cols-[minmax(160px,0.95fr)_minmax(180px,1.1fr)_120px_130px] gap-2 border-b border-[#eadfce] bg-[#f7efdf] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#0d4b3a] md:grid">
            <span>Kategori</span><span>Nama item</span><span>Biaya</span><span>Aksi</span>
          </div>
          <div className="grid gap-0">
            {items.map((item) => (
              <div key={item.id} className="grid min-w-0 grid-cols-1 gap-2 border-b border-[#f0e6d6] p-2.5 last:border-b-0 md:min-w-[640px] md:grid-cols-[minmax(160px,0.95fr)_minmax(180px,1.1fr)_120px_130px] md:items-center md:py-2">
                <CategorySelect label="" group="treatment-cost" value={item.categoryId} fallbackName="Consumables" categories={categories} addCategory={addCategory} onChange={(categoryId) => updateItem(item.id, { categoryId })} />
                <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Nama item" className={compactInputClass()} />
                <input type="number" value={item.amount} onChange={(event) => updateItem(item.id, { amount: Number(event.target.value) })} placeholder="Biaya" className={compactInputClass()} />
                <div className="flex flex-wrap items-center gap-1">
                  <CompactAction>Edit</CompactAction>
                  <CompactAction onClick={() => updateTreatment({ ...treatment, disposableItems: [...items, { ...item, id: generateId("cost"), name: `${item.name || "Item"} Salinan` }] })}>Copy</CompactAction>
                  <CompactAction tone="danger" onClick={() => window.confirm("Hapus item ini?") && updateTreatment({ ...treatment, disposableItems: items.filter((row) => row.id !== item.id) })}>Hapus</CompactAction>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HppPackageInsertSection({
  treatment,
  updateTreatment,
  packages,
}: {
  treatment: Treatment;
  updateTreatment: (treatment: Treatment) => void;
  packages: HppPackageTemplate[];
}) {
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id ?? "");
  const [mergeSame, setMergeSame] = useState(true);
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? packages[0];

  useEffect(() => {
    if (!selectedPackageId && packages[0]) setSelectedPackageId(packages[0].id);
  }, [packages, selectedPackageId]);

  const insertPackage = () => {
    if (!selectedPackage) return;
    let consumableUsages = [...(treatment.consumableUsages ?? [])];
    let disposableItems = [...(treatment.disposableItems ?? treatment.disposableCosts ?? [])];

    selectedPackage.items.forEach((item) => {
      if (item.mode === "master" && item.consumableItemId) {
        const existingIndex = consumableUsages.findIndex((usage) => usage.consumableId === item.consumableItemId);
        if (mergeSame && existingIndex >= 0) {
          consumableUsages = consumableUsages.map((usage, index) =>
            index === existingIndex
              ? {
                  ...usage,
                  quantityUsed: usage.quantityUsed + item.qtyDefault,
                  sourcePackageName: usage.sourcePackageName ?? selectedPackage.name,
                }
              : usage,
          );
        } else {
          consumableUsages.push({
            id: generateId("usage"),
            consumableId: item.consumableItemId,
            name: item.consumableName,
            quantityUsed: item.qtyDefault,
            unit: item.unit,
            costPerUnit: item.costPerUnit,
            sourcePackageName: selectedPackage.name,
            notes: item.notes,
          });
        }
      } else {
        const name = item.manualName ?? item.consumableName;
        const amount = item.manualCost ?? item.totalCost;
        const existingIndex = disposableItems.findIndex((row) => row.name.toLowerCase() === name.toLowerCase());
        if (mergeSame && existingIndex >= 0) {
          disposableItems = disposableItems.map((row, index) =>
            index === existingIndex ? { ...row, amount: row.amount + amount } : row,
          );
        } else {
          disposableItems.push({
            id: generateId("cost"),
            name: `${name} (Dari paket: ${selectedPackage.name})`,
            amount,
          });
        }
      }
    });

    updateTreatment({ ...treatment, consumableUsages, disposableItems, disposableCosts: disposableItems });
  };

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#d8b65f]/50 bg-[#fff8e8] p-3">
      <div>
        <p className="text-sm font-semibold text-[#0d4b3a]">Pilih Paket HPP</p>
        <p className="mt-1 text-xs leading-5 text-[#756b5d]">Item paket akan disalin ke treatment, sehingga bisa diedit tanpa mengubah template asli.</p>
      </div>
      {packages.length === 0 ? (
        <EmptyState text="Belum ada Master Paket HPP. Buat paket dahulu untuk mempercepat input treatment." />
      ) : (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <SelectField label="Pilih paket HPP" value={selectedPackage?.id ?? ""} onChange={setSelectedPackageId}>
            {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} - {rupiah(pkg.totalCost)}</option>)}
          </SelectField>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#ded2bf] bg-white px-3 text-sm">
              <input type="checkbox" checked={mergeSame} onChange={(event) => setMergeSame(event.target.checked)} />
              Gabungkan item yang sama
            </label>
            <ActionButton onClick={insertPackage}><Plus className="h-4 w-4" /> Masukkan Paket ke Treatment</ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}

function DynamicConsumableUsageSection({
  treatment,
  updateTreatment,
  consumables,
}: {
  treatment: Treatment;
  updateTreatment: (treatment: Treatment) => void;
  consumables: ConsumableItem[];
}) {
  const usages = treatment.consumableUsages ?? [];
  const addFromMaster = () => {
    const first = consumables[0];
    if (!first) return;
    updateTreatment({
      ...treatment,
      consumableUsages: [
        ...usages,
        {
          id: generateId("usage"),
          consumableId: first.id,
          name: first.name,
          quantityUsed: 1,
          unit: first.smallestUnit,
          costPerUnit: first.costPerSmallestUnit,
          notes: "",
        },
      ],
    });
  };
  const updateUsage = (id: string, patch: Partial<TreatmentConsumableUsage>) =>
    updateTreatment({ ...treatment, consumableUsages: usages.map((usage) => (usage.id === id ? { ...usage, ...patch } : usage)) });

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#0d4b3a]">Bahan dari Master</p>
          <p className="mt-1 text-xs leading-5 text-[#756b5d]">
            Contoh: Sabun 1 liter = 1000 ml. Jika 1 pasien memakai 5 ml, sistem otomatis menghitung HPP per pasien.
          </p>
        </div>
        <ActionButton variant="ghost" onClick={addFromMaster}>
          <Plus className="h-4 w-4" /> Tambah bahan dari master
        </ActionButton>
      </div>
      {consumables.length === 0 && <EmptyState text="Master bahan masih kosong. Tambahkan bahan terlebih dahulu di halaman Master Bahan." />}
      {usages.map((usage) => {
        const selected = consumables.find((item) => item.id === usage.consumableId);
        return (
          <div key={usage.id} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_120px_100px_130px_130px_44px]">
            <div className="grid gap-1">
              <select
                value={usage.consumableId}
                onChange={(event) => {
                  const item = consumables.find((candidate) => candidate.id === event.target.value);
                  if (!item) return;
                  updateUsage(usage.id, {
                    consumableId: item.id,
                    name: item.name,
                    unit: item.smallestUnit,
                    costPerUnit: item.costPerSmallestUnit,
                  });
                }}
                className={inputClass()}
              >
                {consumables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {usage.sourcePackageName && <span className="w-fit rounded-full bg-[#0d4b3a]/10 px-2 py-1 text-[11px] font-semibold text-[#0d4b3a]">Dari paket: {usage.sourcePackageName}</span>}
              {selected && (
                <span className={`text-xs ${stockStatus(selected) === "Low Stock" || stockStatus(selected) === "Habis" ? "text-[#a33a2d]" : "text-[#756b5d]"}`}>
                  1x treatment memakai {usage.quantityUsed} {selected.stockUnit ?? selected.smallestUnit}. Stok sistem: {selected.currentStock ?? selected.availableQuantity} {selected.stockUnit ?? selected.smallestUnit}.
                </span>
              )}
            </div>
            <input type="number" value={usage.quantityUsed} onChange={(event) => updateUsage(usage.id, { quantityUsed: Number(event.target.value) })} className={inputClass()} placeholder="Qty terpakai" />
            <div className="flex min-h-11 items-center rounded-lg border border-[#eadfce] bg-white px-3 text-sm">{selected?.smallestUnit ?? usage.unit}</div>
            <div className="flex min-h-11 items-center rounded-lg border border-[#eadfce] bg-white px-3 text-sm">{rupiah(selected?.costPerSmallestUnit ?? usage.costPerUnit)}</div>
            <div className="flex min-h-11 items-center rounded-lg border border-[#eadfce] bg-white px-3 text-sm font-semibold text-[#0d4b3a]">{rupiah(usage.quantityUsed * (selected?.costPerSmallestUnit ?? usage.costPerUnit))}</div>
            <button type="button" onClick={() => updateTreatment({ ...treatment, consumableUsages: usages.filter((row) => row.id !== usage.id) })} className="min-h-11 rounded-lg border border-[#e1aaa0] text-[#a33a2d]">
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DynamicMaterialSection({ treatment, updateTreatment, categories, addCategory }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void; categories: HppCategory[]; addCategory: (group: CategoryGroup, name: string, notes?: string) => string }) {
  const items = treatment.materialItems ?? [];
  const updateItem = (id: string, patch: Partial<TreatmentMaterialItem>) => updateTreatment({ ...treatment, materialItems: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0d4b3a]">Material / Produk Treatment</p>
        <ActionButton variant="ghost" onClick={() => updateTreatment({ ...treatment, materialItems: [...items, { id: generateId("mat"), name: "", quantity: 1, unitCost: 0 }] })}>
          <Plus className="h-4 w-4" /> Tambah material
        </ActionButton>
      </div>
      {items.length === 0 && <EmptyState text="Belum ada material. Tambahkan serum khusus, anestesi, cartridge, atau produk lain." />}
      {items.map((item) => (
        <div key={item.id} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_140px_140px_150px]">
          <CategorySelect label="Kategori" group="material" value={item.categoryId} fallbackName="Skincare / Serum" categories={categories} addCategory={addCategory} onChange={(categoryId) => updateItem(item.id, { categoryId })} />
          <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Nama material" className={inputClass()} />
          <input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} placeholder="Qty" className={inputClass()} />
          <input type="number" value={item.unitCost} onChange={(event) => updateItem(item.id, { unitCost: Number(event.target.value) })} placeholder="Unit cost" className={inputClass()} />
          <div className="flex min-h-10 items-center rounded-lg border border-[#eadfce] bg-[#fffaf2] px-3 text-sm font-semibold text-[#0d4b3a]">{rupiah(item.quantity * item.unitCost)}</div>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
            <button type="button" onClick={() => updateTreatment({ ...treatment, materialItems: [...items, { ...item, id: generateId("mat"), name: `${item.name || "Material"} Salinan` }] })} className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Copy</button>
            <button type="button" onClick={() => window.confirm("Hapus item ini?") && updateTreatment({ ...treatment, materialItems: items.filter((row) => row.id !== item.id) })} className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]">Hapus</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DynamicMachineSection({ treatment, updateTreatment }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void }) {
  const items = treatment.machineItems ?? [];
  const updateItem = (id: string, patch: Partial<TreatmentMachineItem>) => updateTreatment({ ...treatment, machineItems: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0d4b3a]">Biaya Alat / Mesin</p>
        <ActionButton variant="ghost" onClick={() => updateTreatment({ ...treatment, machineItems: [...items, { id: generateId("machine"), name: "", amount: 0, notes: "" }] })}>
          <Plus className="h-4 w-4" /> Tambah alat
        </ActionButton>
      </div>
      {items.length === 0 && <EmptyState text="Belum ada alokasi alat / mesin." />}
      {items.map((item) => (
        <div key={item.id} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_150px]">
          <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Nama alat" className={inputClass()} />
          <input type="number" value={item.amount} onChange={(event) => updateItem(item.id, { amount: Number(event.target.value) })} placeholder="Biaya" className={inputClass()} />
          <input value={item.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} placeholder="Notes optional" className={inputClass()} />
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
            <button type="button" onClick={() => updateTreatment({ ...treatment, machineItems: [...items, { ...item, id: generateId("machine"), name: `${item.name || "Alat"} Salinan` }] })} className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Copy</button>
            <button type="button" onClick={() => window.confirm("Hapus item ini?") && updateTreatment({ ...treatment, machineItems: items.filter((row) => row.id !== item.id) })} className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]">Hapus</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TreatmentDeviceElectricitySection({ treatment, updateTreatment, defaultTariff }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void; defaultTariff: number }) {
  const items = treatment.deviceElectricityCosts ?? [];
  const compute = (item: Pick<TreatmentDeviceElectricityCost, "watt" | "durationMinutes" | "tariffPerKwh">) => {
    const kwhPerTreatment = ((Number(item.watt) || 0) * (Number(item.durationMinutes) || 0)) / 60 / 1000;
    return { kwhPerTreatment, costPerTreatment: Math.round(kwhPerTreatment * (Number(item.tariffPerKwh) || 0)) };
  };
  const normalize = (item: TreatmentDeviceElectricityCost) => ({ ...item, ...compute(item) });
  const updateItem = (id: string, patch: Partial<TreatmentDeviceElectricityCost>) =>
    updateTreatment({ ...treatment, deviceElectricityCosts: items.map((item) => (item.id === id ? normalize({ ...item, ...patch }) : item)) });

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#0d4b3a]">Device Electricity Cost</p>
          <p className="mt-1 text-xs text-[#756b5d]">Hitung listrik alat khusus per tindakan: watt x durasi x tarif PLN.</p>
        </div>
        <ActionButton variant="ghost" onClick={() => updateTreatment({ ...treatment, deviceElectricityCosts: [...items, normalize({ id: generateId("devhpp"), deviceName: "", watt: 0, durationMinutes: treatment.durationMinutes, tariffPerKwh: defaultTariff, kwhPerTreatment: 0, costPerTreatment: 0, includeInHpp: true, notes: "" })] })}>
          <Plus className="h-4 w-4" /> Tambah device cost
        </ActionButton>
      </div>
      {items.length === 0 ? <EmptyState text="Belum ada biaya listrik device khusus." /> : (
        <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["Nama device", "Watt", "Durasi menit", "Tarif/kWh", "kWh/treatment", "Biaya/treatment", "Include?", "Action"].map((head) => <th key={head} className="p-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[#efe4d2]">
                  <td className="p-2"><input value={item.deviceName} onChange={(event) => updateItem(item.id, { deviceName: event.target.value })} placeholder="Nama device" className={inputClass()} /></td>
                  <td className="p-2"><input type="number" value={item.watt} onChange={(event) => updateItem(item.id, { watt: Number(event.target.value) })} placeholder="Watt" className={inputClass()} /></td>
                  <td className="p-2"><input type="number" value={item.durationMinutes} onChange={(event) => updateItem(item.id, { durationMinutes: Number(event.target.value) })} placeholder="Menit" className={inputClass()} /></td>
                  <td className="p-2"><input type="number" value={item.tariffPerKwh} onChange={(event) => updateItem(item.id, { tariffPerKwh: Number(event.target.value) })} placeholder="Tarif" className={inputClass()} /></td>
                  <td className="p-2 font-medium">{item.kwhPerTreatment.toFixed(4)}</td>
                  <td className="p-2 font-semibold text-[#0d4b3a]">{rupiah(item.costPerTreatment)}</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={item.includeInHpp} onChange={(event) => updateItem(item.id, { includeInHpp: event.target.checked })} /></td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
                      <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]" onClick={() => updateTreatment({ ...treatment, deviceElectricityCosts: [...items, { ...item, id: generateId("devhpp"), deviceName: `${item.deviceName || "Device"} Salinan` }] })}>Copy</button>
                      <button type="button" className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]" onClick={() => window.confirm("Hapus item ini?") && updateTreatment({ ...treatment, deviceElectricityCosts: items.filter((row) => row.id !== item.id) })}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TreatmentShotCartridgeSection({ treatment, updateTreatment }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void }) {
  const items = treatment.shotCartridgeCosts ?? [];
  const normalize = (item: TreatmentShotCartridgeCost) => ({
    ...item,
    costPerTreatment: item.totalCapacity > 0 ? Math.round((item.cartridgePrice / item.totalCapacity) * item.usedPerTreatment) : 0,
  });
  const updateItem = (id: string, patch: Partial<TreatmentShotCartridgeCost>) =>
    updateTreatment({ ...treatment, shotCartridgeCosts: items.map((item) => (item.id === id ? normalize({ ...item, ...patch }) : item)) });

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0d4b3a]">Shot / Cartridge Cost</p>
        <ActionButton variant="ghost" onClick={() => updateTreatment({ ...treatment, shotCartridgeCosts: [...items, { id: generateId("shot"), cartridgeName: "", cartridgePrice: 0, totalCapacity: 1, unit: "shots", usedPerTreatment: 1, costPerTreatment: 0, includeInHpp: true, notes: "" }] })}>
          <Plus className="h-4 w-4" /> Tambah shot / cartridge
        </ActionButton>
      </div>
      {items.length === 0 ? <EmptyState text="Belum ada biaya shot, tip, line, cartridge, atau vial." /> : (
        <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["Nama alat/cartridge", "Harga cartridge", "Isi total", "Unit", "Dipakai/treatment", "Cost/treatment", "Include?", "Action"].map((head) => <th key={head} className="p-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[#efe4d2]">
                  <td className="p-2"><input value={item.cartridgeName} onChange={(event) => updateItem(item.id, { cartridgeName: event.target.value })} placeholder="Nama cartridge" className={inputClass()} /></td>
                  <td className="p-2"><input type="number" value={item.cartridgePrice} onChange={(event) => updateItem(item.id, { cartridgePrice: Number(event.target.value) })} placeholder="Harga" className={inputClass()} /></td>
                  <td className="p-2"><input type="number" value={item.totalCapacity} onChange={(event) => updateItem(item.id, { totalCapacity: Number(event.target.value) })} placeholder="Isi total" className={inputClass()} /></td>
                  <td className="p-2">
                    <select value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value as TreatmentShotCartridgeCost["unit"] })} className={inputClass()}>
                      {["shots", "pulses", "tips", "lines", "cc", "ml", "other"].map((unit) => <option key={unit}>{unit}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input type="number" value={item.usedPerTreatment} onChange={(event) => updateItem(item.id, { usedPerTreatment: Number(event.target.value) })} placeholder="Dipakai" className={inputClass()} /></td>
                  <td className="p-2 font-semibold text-[#0d4b3a]">{rupiah(item.costPerTreatment)}</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={item.includeInHpp} onChange={(event) => updateItem(item.id, { includeInHpp: event.target.checked })} /></td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
                      <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]" onClick={() => updateTreatment({ ...treatment, shotCartridgeCosts: [...items, { ...item, id: generateId("shot"), cartridgeName: `${item.cartridgeName || "Cartridge"} Salinan` }] })}>Copy</button>
                      <button type="button" className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]" onClick={() => window.confirm("Hapus item ini?") && updateTreatment({ ...treatment, shotCartridgeCosts: items.filter((row) => row.id !== item.id) })}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TreatmentStaffFeeSection({ treatment, updateTreatment, basePrice }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void; basePrice: number }) {
  const items = treatment.staffFeeCosts ?? [];
  const normalize = (item: TreatmentStaffFeeCost) => ({ ...item, total: item.type === "percent" ? Math.round((basePrice * item.value) / 100) : Math.round(item.value) });
  const updateItem = (id: string, patch: Partial<TreatmentStaffFeeCost>) =>
    updateTreatment({ ...treatment, staffFeeCosts: items.map((item) => (item.id === id ? normalize({ ...item, ...patch }) : item)) });

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#0d4b3a]">Staff Fee / Commission Cost</p>
          <p className="mt-1 text-xs text-[#756b5d]">Gunakan jika ada fee staff yang ingin dimasukkan sebagai HPP langsung. Aturan komisi tetap dihitung terpisah di bawah.</p>
        </div>
        <ActionButton variant="ghost" onClick={() => updateTreatment({ ...treatment, staffFeeCosts: [...items, { id: generateId("fee"), role: "therapist", type: "nominal", value: 0, total: 0, includeInHpp: true, notes: "" }] })}>
          <Plus className="h-4 w-4" /> Tambah staff fee
        </ActionButton>
      </div>
      {items.length === 0 ? <EmptyState text="Belum ada staff fee yang masuk HPP langsung." /> : (
        <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["Role", "Tipe", "Nilai", "Total", "Include?", "Notes", "Action"].map((head) => <th key={head} className="p-2">{head}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[#efe4d2]">
                  <td className="p-2"><input value={item.role} onChange={(event) => updateItem(item.id, { role: event.target.value })} placeholder="Role" className={inputClass()} /></td>
                  <td className="p-2"><select value={item.type} onChange={(event) => updateItem(item.id, { type: event.target.value as TreatmentStaffFeeCost["type"] })} className={inputClass()}><option value="nominal">Nominal</option><option value="percent">% harga normal</option></select></td>
                  <td className="p-2"><input type="number" value={item.value} onChange={(event) => updateItem(item.id, { value: Number(event.target.value) })} placeholder="Nilai" className={inputClass()} /></td>
                  <td className="p-2 font-semibold text-[#0d4b3a]">{rupiah(item.total)}</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={item.includeInHpp} onChange={(event) => updateItem(item.id, { includeInHpp: event.target.checked })} /></td>
                  <td className="p-2"><input value={item.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} placeholder="Catatan" className={inputClass()} /></td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
                      <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]" onClick={() => updateTreatment({ ...treatment, staffFeeCosts: [...items, { ...item, id: generateId("fee"), role: `${item.role || "Role"} Salinan` }] })}>Copy</button>
                      <button type="button" className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]" onClick={() => window.confirm("Hapus item ini?") && updateTreatment({ ...treatment, staffFeeCosts: items.filter((row) => row.id !== item.id) })}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TreatmentOverheadSection({ treatment, updateTreatment, settings }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void; settings: FixedCostSettings }) {
  const breakdown = fixedCostBreakdown(settings);
  const overheadPerTreatment = treatment.includeOverhead === false ? 0 : breakdown.perMinute * treatment.durationMinutes;
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#d8b65f]/50 bg-[#fff8e8] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0d4b3a]">Overhead Allocation</p>
          <p className="mt-1 text-xs text-[#756b5d]">Alokasi biaya tetap berdasarkan durasi treatment.</p>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#ded2bf] bg-white px-3 text-sm">
          <input type="checkbox" checked={treatment.includeOverhead !== false} onChange={(event) => updateTreatment({ ...treatment, includeOverhead: event.target.checked })} />
          Masukkan overhead ke HPP
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniMetric label="Fixed cost / menit" value={rupiah(breakdown.perMinute)} />
        <MiniMetric label="Durasi treatment" value={`${treatment.durationMinutes} menit`} />
        <MiniMetric label="Overhead treatment" value={rupiah(overheadPerTreatment)} />
        <MiniMetric label="Fixed cost / customer" value={rupiah(breakdown.perCustomer)} />
      </div>
    </div>
  );
}

function HeraCommissionRulesEditor({ rules, onChange }: { rules: HeraCommissionRule[]; onChange: (rules: HeraCommissionRule[]) => void }) {
  const normalized = rules.length ? rules : defaultHeraCommissionRules();
  const updateRule = (id: string, patch: Partial<HeraCommissionRule>) => onChange(normalized.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0d4b3a]">Aturan Komisi</p>
        <ActionButton variant="ghost" onClick={() => onChange([...normalized, { id: generateId("hcomm"), role: "Other", mode: "no_commission", percent: 0, nominal: 0, active: true, notes: "" }])}><Plus className="h-4 w-4" /> Tambah aturan</ActionButton>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
            <tr>{["Role", "Mode", "Percent %", "Nominal Rp", "Notes", "Active", "Aksi"].map((head) => <th key={head} className="p-2">{head}</th>)}</tr>
          </thead>
          <tbody>
            {normalized.map((rule) => (
              <tr key={rule.id} className="border-t border-[#efe4d2]">
                <td className="p-2"><select className={inputClass()} value={rule.role} onChange={(event) => updateRule(rule.id, { role: event.target.value as HeraStaffRole })}>{heraRoles.map((role) => <option key={role}>{role}</option>)}</select></td>
                <td className="p-2"><select className={inputClass()} value={rule.mode} onChange={(event) => updateRule(rule.id, { mode: event.target.value as HeraCommissionMode })}>{heraCommissionModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></td>
                <td className="p-2"><input className={inputClass()} type="number" value={rule.percent} onChange={(event) => updateRule(rule.id, { percent: Number(event.target.value) })} placeholder="%" /></td>
                <td className="p-2"><input className={inputClass()} type="number" value={rule.nominal} onChange={(event) => updateRule(rule.id, { nominal: Number(event.target.value) })} placeholder="Nominal" /></td>
                <td className="p-2"><input className={inputClass()} value={rule.notes ?? ""} onChange={(event) => updateRule(rule.id, { notes: event.target.value })} placeholder="Catatan" /></td>
                <td className="p-2 text-center"><input type="checkbox" checked={rule.active} onChange={(event) => updateRule(rule.id, { active: event.target.checked })} /></td>
                <td className="p-2"><ActionButton variant="danger" onClick={() => onChange(normalized.filter((item) => item.id !== rule.id))}>Hapus</ActionButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffHandlerSection({ staff, handlers, setHandlers }: { staff: StaffDirectoryItem[]; handlers: StaffHandlerSelection; setHandlers: (handlers: StaffHandlerSelection) => void }) {
  const active = staff.filter((item) => item.status === "active");
  const byRole = (rolesList: HeraStaffRole[]) => active.filter((item) => rolesList.includes(item.role));
  const StaffSelect = ({ label, value, rolesList, onChange }: { label: string; value?: string; rolesList: HeraStaffRole[]; onChange: (value: string) => void }) => (
    <SelectField label={label} value={value ?? ""} onChange={onChange}>
      <option value="">Manual / staff tidak dipilih</option>
      {byRole(rolesList).map((item) => <option key={item.id} value={item.id}>{item.staffCode} - {item.name}</option>)}
    </SelectField>
  );
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-white p-3.5">
      <div>
        <p className="text-sm font-semibold text-[#0d4b3a]">Staff yang Handle</p>
        <p className="mt-0.5 text-xs text-[#756b5d]">Pilih staff aktif untuk preview komisi. Bisa dikosongkan untuk estimasi role.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StaffSelect label="Doctor" value={handlers.doctorId} rolesList={["Dokter"]} onChange={(value) => setHandlers({ ...handlers, doctorId: value })} />
        <StaffSelect label="Beautician 1" value={handlers.beautician1Id} rolesList={["Beautician", "Therapist"]} onChange={(value) => setHandlers({ ...handlers, beautician1Id: value })} />
        <StaffSelect label="Beautician 2 optional" value={handlers.beautician2Id} rolesList={["Beautician", "Therapist"]} onChange={(value) => setHandlers({ ...handlers, beautician2Id: value })} />
        <SelectField label="Beautician split" value={handlers.beauticianSplit} onChange={(value) => setHandlers({ ...handlers, beauticianSplit: value as StaffHandlerSelection["beauticianSplit"] })}>
          <option value="equal">Equal</option><option value="beautician1">Beautician 1 only</option><option value="beautician2">Beautician 2 only</option><option value="custom">Custom %</option>
        </SelectField>
        <Field label="Beautician 1 %" type="number" value={handlers.beautician1Percent} onChange={(value) => setHandlers({ ...handlers, beautician1Percent: Number(value) })} />
        <Field label="Beautician 2 %" type="number" value={handlers.beautician2Percent} onChange={(value) => setHandlers({ ...handlers, beautician2Percent: Number(value) })} />
        <StaffSelect label="Nurse / Perawat" value={handlers.nurseId} rolesList={["Nurse / Perawat"]} onChange={(value) => setHandlers({ ...handlers, nurseId: value })} />
        <StaffSelect label="Sales / Promoter" value={handlers.salesId} rolesList={["Sales / Promoter"]} onChange={(value) => setHandlers({ ...handlers, salesId: value })} />
      </div>
    </div>
  );
}

function CommissionDraftPreview({ rows }: { rows: CommissionDraft[] }) {
  return (
    <div className="min-w-0 max-w-full rounded-lg border border-[#eadfce] bg-white">
      <div className="border-b border-[#eadfce] px-3 py-2">
        <p className="text-sm font-semibold text-[#0d4b3a]">Preview Komisi</p>
        <p className="mt-0.5 text-xs text-[#756b5d]">Estimasi komisi per role/staff berdasarkan harga final.</p>
      </div>
      <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
          <tr>{["Role", "Staff", "Mode", "Base", "Komisi", "Estimasi profit"].map((head) => <th key={head} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">{head}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td className="px-4 py-6 text-center text-sm text-[#756b5d]" colSpan={6}>Belum ada preview komisi. Isi transaksi dan klik Hitung Preview Komisi.</td></tr> : rows.map((row) => (
            <tr key={row.id} className="border-t border-[#efe4d2]">
              <td className="px-3 py-2 font-medium text-[#0d4b3a]">{row.role}</td>
              <td className="px-3 py-2">{row.staffNameSnapshot}</td>
              <td className="px-3 py-2 text-[#756b5d]">{heraCommissionModes.find((mode) => mode.value === row.commissionMode)?.label ?? row.commissionMode}</td>
              <td className="px-3 py-2 text-right">{rupiah(row.finalAllocatedAmount)}</td>
              <td className="px-3 py-2 text-right font-semibold text-[#0d4b3a]">{rupiah(row.calculatedCommission)}</td>
              <td className="px-3 py-2 text-right">{rupiah(row.estimatedProfit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function CommissionEditor({ rules, onChange }: { rules: CommissionRule[]; onChange: (rules: CommissionRule[]) => void }) {
  const updateRule = (id: string, patch: Partial<CommissionRule>) => onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0d4b3a]">Aturan Komisi Treatment</p>
          <p className="text-xs text-[#756b5d]">Satu treatment bisa punya beberapa penerima komisi dengan role dan nilai berbeda.</p>
        </div>
        <ActionButton variant="secondary" onClick={() => onChange([...rules, emptyRule()])}>
          <Plus className="h-4 w-4" /> Tambah penerima komisi
        </ActionButton>
      </div>
      {rules.length === 0 ? (
        <EmptyState text="Belum ada penerima komisi. Tambahkan role dokter, therapist, beautician, sales, atau admin sesuai kebutuhan." />
      ) : (
        <div className="max-w-full overflow-x-auto rounded-lg border border-[#eadfce] bg-white">
          <div className="hidden min-w-[900px] grid-cols-[108px_minmax(120px,1fr)_64px_minmax(160px,1.1fr)_96px_108px_minmax(120px,1fr)_126px] gap-2 border-b border-[#eadfce] bg-[#f7efdf] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#0d4b3a] md:grid">
            <span>Role</span>
            <span>Staff</span>
            <span>Qty</span>
            <span>Tipe</span>
            <span>Nilai</span>
            <span>Berlaku</span>
            <span>Catatan</span>
            <span>Aksi</span>
          </div>
          <div className="grid min-w-0 gap-0 divide-y divide-[#efe4d2] md:min-w-[900px]">
            {rules.map((rule) => (
              <div key={rule.id} className="grid grid-cols-1 gap-1.5 px-2.5 py-2 md:grid-cols-[108px_minmax(120px,1fr)_64px_minmax(160px,1.1fr)_96px_108px_minmax(120px,1fr)_126px] md:items-center">
                <label className="grid gap-1 text-xs font-semibold text-[#756b5d] md:contents">
                  <span className="md:hidden">Role</span>
                  <select className={compactInputClass()} value={rule.role} onChange={(event) => updateRule(rule.id, { role: event.target.value as StaffRole })}>
                    {[...roles, "other" as StaffRole].map((role) => <option key={role}>{role}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[#756b5d] md:contents">
                  <span className="md:hidden">Nama staff optional</span>
                  <input className={compactInputClass()} value={rule.staffName ?? ""} onChange={(event) => updateRule(rule.id, { staffName: event.target.value })} placeholder="Nama staff" />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[#756b5d] md:contents">
                  <span className="md:hidden">Jumlah orang</span>
                  <input className={compactInputClass()} type="number" value={rule.quantity} onChange={(event) => updateRule(rule.id, { quantity: Math.max(Number(event.target.value), 1) })} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[#756b5d] md:contents">
                  <span className="md:hidden">Tipe komisi</span>
                  <select className={compactInputClass()} value={rule.type} onChange={(event) => updateRule(rule.id, { type: event.target.value as CommissionType })}>
                    {commissionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[#756b5d] md:contents">
                  <span className="md:hidden">Nilai komisi</span>
                  <input className={compactInputClass()} type="number" value={rule.value} onChange={(event) => updateRule(rule.id, { value: Number(event.target.value) })} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[#756b5d] md:contents">
                  <span className="md:hidden">Berlaku untuk</span>
                  <select className={compactInputClass()} value={rule.appliesTo} onChange={(event) => updateRule(rule.id, { appliesTo: event.target.value as CommissionAppliesTo })}>
                    {appliesToOptions.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[#756b5d] md:contents">
                  <span className="md:hidden">Catatan</span>
                  <input className={compactInputClass()} value={rule.notes ?? ""} onChange={(event) => updateRule(rule.id, { notes: event.target.value })} placeholder="Catatan" />
                </label>
                <div className="flex flex-wrap gap-1">
                  <CompactAction tone="gold" onClick={() => onChange([...rules, { ...rule, id: generateId("comm") }])}><Copy className="h-3.5 w-3.5" /> Duplikasi</CompactAction>
                  <CompactAction tone="danger" onClick={() => onChange(rules.filter((item) => item.id !== rule.id))}><Trash2 className="h-3.5 w-3.5" /> Hapus</CompactAction>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommissionBreakdown({ rules }: { rules: { rule: CommissionRule; amount: number }[] }) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-[#eadfce]">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
          <tr>
            <th className="p-3">Role</th>
            <th className="p-3">Staff</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Tipe</th>
            <th className="p-3">Value</th>
            <th className="p-3">Commission amount</th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr><td className="p-4 text-[#756b5d]" colSpan={6}>Belum ada komisi yang berlaku untuk tier harga ini.</td></tr>
          ) : (
            rules.map(({ rule, amount }) => (
              <tr key={rule.id} className="border-t border-[#efe4d2]">
                <td className="p-3">{rule.role}</td>
                <td className="p-3">{rule.staffName || "-"}</td>
                <td className="p-3">{rule.quantity}</td>
                <td className="p-3">{commissionTypes.find((type) => type.value === rule.type)?.label ?? rule.type}</td>
                <td className="p-3">{rule.type === "fixed" ? rupiah(rule.value) : `${rule.value}%`}</td>
                <td className="p-3 font-semibold text-[#0d4b3a]">{rupiah(amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TreatmentTable({
  data,
  editTreatment,
  deleteTreatment,
  openSimulation,
}: {
  data: StorageSchema;
  editTreatment: (treatment: Treatment) => void;
  deleteTreatment: (id: string) => void;
  openSimulation: (id: string) => void;
}) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Kalkulasi Treatment Tersimpan</h3>
        <ActionButton variant="secondary" onClick={() => treatmentHppReport(data.treatments, data.fixedCosts)}><FileDown className="h-4 w-4" /> PDF</ActionButton>
      </div>
      {data.treatments.length === 0 ? <EmptyState text="Belum ada treatment. Tambahkan treatment Hera Clinic pertama." /> : (
        <>
        <div className="grid gap-3 md:hidden">
          {data.treatments.map((raw) => {
            const treatment = normalizeTreatmentForEdit(raw);
            const normal = treatmentResult(treatment, data.fixedCosts, "Normal");
            const vip = treatmentResult(treatment, data.fixedCosts, "VIP");
            const promo = treatmentResult(treatment, data.fixedCosts, "Promo");
            return (
              <div key={`mobile-${treatment.id}`} className="rounded-lg border border-[#eadfce] bg-[#fffaf2] p-4">
                <p className="font-semibold text-[#0d4b3a]">{treatment.name}</p>
                <p className="text-xs text-[#7a7265]">{treatment.category} - {treatment.durationMinutes} menit</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <MiniMetric label="Direct HPP" value={rupiah(directTreatmentCost(treatment))} />
                  <MiniMetric label="Total cost" value={rupiah(normal.totalCost)} />
                  <MiniMetric label="Rekomendasi" value={rupiah(normal.recommendedPrice)} />
                  <MiniMetric label="Normal profit" value={rupiah(normal.netProfit)} />
                  <MiniMetric label="VIP profit" value={rupiah(vip.netProfit)} />
                  <MiniMetric label="Promo profit" value={rupiah(promo.netProfit)} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <ActionButton variant="ghost" onClick={() => editTreatment(treatment)}>Edit</ActionButton>
                  <ActionButton variant="secondary" onClick={() => openSimulation(treatment.id)}>Simulasi</ActionButton>
                  <ActionButton variant="danger" onClick={() => deleteTreatment(treatment.id)}><Trash2 className="h-4 w-4" /></ActionButton>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden max-w-full overflow-x-auto md:block">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>
                {["Treatment", "Direct HPP", "Overhead", "Total Cost", "Recommended Price", "Normal Profit", "VIP Profit", "Promo Profit", "Margin Normal", "Actions"].map((head) => <th key={head} className="p-3">{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.treatments.map((raw) => {
                const treatment = normalizeTreatmentForEdit(raw);
                const normal = treatmentResult(treatment, data.fixedCosts, "Normal");
                const vip = treatmentResult(treatment, data.fixedCosts, "VIP");
                const promo = treatmentResult(treatment, data.fixedCosts, "Promo");
                return (
                  <tr key={treatment.id} className="border-b border-[#efe4d2]">
                    <td className="p-3">
                      <p className="font-semibold text-[#0d4b3a]">{treatment.name}</p>
                      <p className="text-xs text-[#7a7265]">{treatment.category} - {treatment.durationMinutes} menit</p>
                    </td>
                    <td className="p-3">{rupiah(directTreatmentCost(treatment))}</td>
                    <td className="p-3">{rupiah(normal.overheadAllocated)}</td>
                    <td className="p-3">{rupiah(normal.totalCost)}</td>
                    <td className="p-3">{rupiah(normal.recommendedPrice)}</td>
                    <td className="p-3">{rupiah(normal.netProfit)}</td>
                    <td className="p-3">{rupiah(vip.netProfit)}</td>
                    <td className="p-3">{rupiah(promo.netProfit)}</td>
                    <td className="p-3">{percent(normal.marginPercent)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton variant="ghost" onClick={() => editTreatment(treatment)}>Edit</ActionButton>
                        <ActionButton variant="secondary" onClick={() => openSimulation(treatment.id)}>Open Simulation</ActionButton>
                        <ActionButton variant="danger" onClick={() => deleteTreatment(treatment.id)}><Trash2 className="h-4 w-4" /></ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#eadfce] bg-white p-2">
      <p className="text-[11px] uppercase tracking-wide text-[#8b806f]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#0d4b3a]">{value}</p>
    </div>
  );
}

function ConsumablesPage({
  data,
  persist,
  editingConsumable,
  setEditingConsumable,
  addCategory,
}: {
  data: StorageSchema;
  persist: (next: StorageSchema) => void;
  editingConsumable: ConsumableItem;
  setEditingConsumable: (item: ConsumableItem) => void;
  addCategory: (group: CategoryGroup, name: string, notes?: string) => string;
}) {
  const draft = normalizeConsumable(editingConsumable);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [supplierFilter, setSupplierFilter] = useState("Semua");
  const [adjustingItem, setAdjustingItem] = useState<ConsumableItem | null>(null);
  const [adjustType, setAdjustType] = useState<StockAdjustment["type"]>("Tambah stok");
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState<StockAdjustment["reason"]>("Pembelian");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().slice(0, 10));
  const [adjustPic, setAdjustPic] = useState("");
  const [opname, setOpname] = useState<StockOpname>(() => createStockOpname(data.consumables));
  const activeConsumables = (data.consumables ?? []).filter((item) => item.active !== false);
  const lowStockCount = activeConsumables.filter((item) => Number(item.currentStock ?? item.availableQuantity ?? 0) > 0 && item.minimumStock > 0 && Number(item.currentStock ?? item.availableQuantity ?? 0) <= item.minimumStock).length;
  const emptyStockCount = activeConsumables.filter((item) => Number(item.currentStock ?? item.availableQuantity ?? 0) <= 0).length;
  const inventoryValue = activeConsumables.reduce((sum, item) => sum + Number(item.currentStock ?? item.availableQuantity ?? 0) * item.costPerSmallestUnit, 0);
  const lastOpname = data.stockOpnames?.[0];
  const categories = Array.from(new Set(activeConsumables.map((item) => item.category).filter(Boolean)));
  const suppliers = Array.from(new Set(activeConsumables.map((item) => item.supplier || "Tanpa supplier")));
  const filteredConsumables = activeConsumables.filter((item) => {
    const status = stockStatus(item);
    return item.name.toLowerCase().includes(search.toLowerCase()) &&
      (categoryFilter === "Semua" || item.category === categoryFilter) &&
      (statusFilter === "Semua" || status === statusFilter) &&
      (supplierFilter === "Semua" || (item.supplier || "Tanpa supplier") === supplierFilter);
  });

  const saveConsumable = () => {
    if (!draft.name.trim()) return;
    const synced = normalizeConsumable({ ...draft, stockUnit: draft.stockUnit ?? draft.smallestUnit });
    const exists = data.consumables.some((item) => item.id === draft.id);
    persist({
      ...data,
      consumables: exists ? data.consumables.map((item) => (item.id === synced.id ? synced : item)) : [synced, ...data.consumables],
    });
    setEditingConsumable(emptyConsumable());
  };
  const deleteConsumable = (id: string) => {
    if (window.confirm("Hapus bahan ini dari master?")) persist({ ...data, consumables: data.consumables.filter((item) => item.id !== id) });
  };
  const duplicateConsumable = (item: ConsumableItem) => {
    persist({ ...data, consumables: [{ ...item, id: generateId("cons"), name: `${item.name} Salinan`, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) }, ...data.consumables] });
  };
  const deactivateConsumable = (id: string) => {
    persist({ ...data, consumables: data.consumables.map((item) => item.id === id ? { ...item, active: false, updatedAt: new Date().toISOString().slice(0, 10) } : item) });
  };
  const openAdjustment = (item: ConsumableItem) => {
    setAdjustingItem(item);
    setAdjustType("Tambah stok");
    setAdjustQty(0);
    setAdjustReason("Pembelian");
    setAdjustNotes("");
    setAdjustDate(new Date().toISOString().slice(0, 10));
  };
  const applyAdjustment = () => {
    if (!adjustingItem) return;
    const previousStock = Number(adjustingItem.currentStock ?? adjustingItem.availableQuantity ?? 0);
    let newStock = adjustType === "Tambah stok" ? previousStock + adjustQty : adjustType === "Kurangi stok" ? previousStock - adjustQty : adjustQty;
    if (newStock < 0 && !window.confirm("Stok akan menjadi negatif. Lanjutkan?")) return;
    const now = new Date().toISOString();
    const adjustment: StockAdjustment = {
      id: generateId("adj"),
      materialId: adjustingItem.id,
      materialNameSnapshot: adjustingItem.name,
      type: adjustType,
      quantity: adjustQty,
      previousStock,
      newStock,
      reason: adjustReason,
      notes: adjustNotes,
      date: adjustDate,
      pic: adjustPic,
      createdAt: now,
    };
    persist({
      ...data,
      consumables: data.consumables.map((item) => item.id === adjustingItem.id ? { ...item, currentStock: newStock, availableQuantity: newStock, updatedAt: now.slice(0, 10) } : item),
      stockAdjustments: [adjustment, ...(data.stockAdjustments ?? [])],
    });
    setAdjustingItem(null);
  };
  const saveOpname = (status: StockOpname["status"], applyToStock = false) => {
    const now = new Date().toISOString();
    const normalizedItems = opname.items.map((item) => {
      const difference = item.physicalStock == null ? 0 : item.physicalStock - item.systemStock;
      const statusItem = item.physicalStock == null ? "Belum diisi" : difference === 0 ? "Sesuai" : difference < 0 ? "Selisih kurang" : "Selisih lebih";
      return { ...item, difference, status: statusItem as StockOpnameItem["status"] };
    });
    const saved: StockOpname = { ...opname, id: opname.id || generateId("opname"), status, items: normalizedItems, updatedAt: now, createdAt: opname.createdAt || now };
    const nextConsumables = applyToStock
      ? data.consumables.map((material) => {
          const row = normalizedItems.find((item) => item.materialId === material.id && item.physicalStock != null);
          return row ? { ...material, currentStock: row.physicalStock!, availableQuantity: row.physicalStock!, lastStockCheckDate: saved.date, lastStockCheckBy: saved.checkedBy, lastPhysicalStock: row.physicalStock, lastStockDifference: row.difference, updatedAt: now.slice(0, 10) } : material;
        })
      : data.consumables.map((material) => {
          const row = normalizedItems.find((item) => item.materialId === material.id && item.physicalStock != null);
          return row ? { ...material, lastStockCheckDate: saved.date, lastStockCheckBy: saved.checkedBy, lastPhysicalStock: row.physicalStock, lastStockDifference: row.difference, updatedAt: now.slice(0, 10) } : material;
        });
    persist({
      ...data,
      consumables: nextConsumables,
      stockOpnames: [saved, ...(data.stockOpnames ?? []).filter((item) => item.id !== saved.id)],
    });
    setOpname(createStockOpname(nextConsumables));
  };
  const applyOpname = () => {
    if (window.confirm("Stok sistem akan disesuaikan dengan stok fisik. Lanjutkan?")) saveOpname("applied", true);
  };
  const exportStockList = () => {
    exportMasterBahanPdf(filteredConsumables);
  };
  const exportChecklist = () => {
    exportBlankStockOpnamePdf(filteredConsumables);
  };
  const exportOpname = () => {
    saveOpname("finalized", false);
    exportStockOpnameResultPdf(opname, data.consumables);
  };

  return (
    <div className="grid min-w-0 gap-6">
      <div className="no-print grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      <Card>
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Master Bahan</h3>
        <p className="mt-2 text-sm leading-6 text-[#756b5d]">
          Contoh: Sabun 1 liter = 1000 ml. Jika 1 pasien memakai 5 ml, sistem otomatis menghitung HPP per pasien.
        </p>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama bahan" value={draft.name} onChange={(value) => setEditingConsumable({ ...draft, name: value })} />
            <CategorySelect label="Kategori" group="material" value={draft.categoryId} fallbackName={draft.category} categories={data.categories} addCategory={addCategory} onChange={(categoryId, name) => setEditingConsumable({ ...draft, categoryId, category: (name || draft.category) as ConsumableCategory })} />
            <Field label="Supplier optional" value={draft.supplier ?? ""} onChange={(value) => setEditingConsumable({ ...draft, supplier: value })} />
            <Field label="Harga beli" type="number" value={draft.purchasePrice} onChange={(value) => setEditingConsumable({ ...draft, purchasePrice: Number(value) })} />
            <Field label="Stock purchase quantity optional" type="number" value={draft.purchaseQuantity} onChange={(value) => setEditingConsumable({ ...draft, purchaseQuantity: Number(value) })} />
            <SelectField label="Unit pembelian" value={draft.purchaseUnit} onChange={(value) => setEditingConsumable({ ...draft, purchaseUnit: value as ConsumableUnit })}>
              {consumableUnits.map((unit) => <option key={unit}>{unit}</option>)}
            </SelectField>
            <Field label="Total isi dalam unit terkecil" type="number" value={draft.totalSmallestUnit} onChange={(value) => setEditingConsumable({ ...draft, totalSmallestUnit: Number(value) })} />
            <SelectField label="Unit terkecil" value={draft.smallestUnit} onChange={(value) => setEditingConsumable({ ...draft, smallestUnit: value as ConsumableUnit })}>
              {consumableUnits.map((unit) => <option key={unit}>{unit}</option>)}
            </SelectField>
            <Field label="Stok minimum" type="number" value={draft.minimumStock} onChange={(value) => setEditingConsumable({ ...draft, minimumStock: Number(value) })} />
            <Field label="Stok sistem / internal" type="number" value={draft.currentStock ?? draft.availableQuantity ?? 0} onChange={(value) => setEditingConsumable({ ...draft, currentStock: Number(value), availableQuantity: Number(value) })} />
            <SelectField label="Unit stok" value={draft.stockUnit ?? draft.smallestUnit} onChange={(value) => setEditingConsumable({ ...draft, stockUnit: value as ConsumableUnit })}>
              {consumableUnits.map((unit) => <option key={unit}>{unit}</option>)}
            </SelectField>
            <Field label="Notes" value={draft.notes ?? ""} onChange={(value) => setEditingConsumable({ ...draft, notes: value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Biaya per unit" value={rupiah(draft.costPerSmallestUnit)} />
            <StatCard label="Stok sistem" value={`${draft.currentStock ?? draft.availableQuantity} ${draft.stockUnit ?? draft.smallestUnit}`} />
            <StatCard label="Nilai stok" value={rupiah((draft.currentStock ?? draft.availableQuantity) * draft.costPerSmallestUnit)} tone="gold" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={saveConsumable}><Save className="h-4 w-4" /> Simpan bahan</ActionButton>
            <ActionButton variant="ghost" onClick={() => setEditingConsumable(emptyConsumable())}><Plus className="h-4 w-4" /> Baru</ActionButton>
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 gap-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Jumlah master bahan" value={`${data.consumables.length} bahan`} />
          <StatCard label="Bahan low stock" value={`${lowStockCount} bahan`} tone={lowStockCount ? "rose" : "emerald"} />
          <StatCard label="Bahan habis" value={`${emptyStockCount} bahan`} tone={emptyStockCount ? "rose" : "emerald"} />
          <StatCard label="Estimasi nilai stok bahan" value={rupiah(inventoryValue)} tone="gold" />
          <StatCard label="Terakhir stock opname" value={lastOpname ? `${lastOpname.date} / ${lastOpname.status}` : "-"} />
        </div>
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-[#0d4b3a]">Daftar Stok Bahan</h3>
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="secondary" onClick={exportStockList}><FileDown className="h-4 w-4" /> PDF Daftar Stok</ActionButton>
              <ActionButton variant="ghost" onClick={exportChecklist}>PDF Format Kosong Opname</ActionButton>
            </div>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Field label="Search bahan" value={search} onChange={setSearch} />
            <SelectField label="Category" value={categoryFilter} onChange={setCategoryFilter}><option>Semua</option>{categories.map((item) => <option key={item}>{item}</option>)}</SelectField>
            <SelectField label="Status stok" value={statusFilter} onChange={setStatusFilter}>{["Semua", "Aman", "Low Stock", "Habis", "Belum dicek"].map((item) => <option key={item}>{item}</option>)}</SelectField>
            <SelectField label="Supplier" value={supplierFilter} onChange={setSupplierFilter}><option>Semua</option>{suppliers.map((item) => <option key={item}>{item}</option>)}</SelectField>
          </div>
          {data.consumables.length === 0 ? <EmptyState text="Belum ada master bahan." /> : (
            <>
              <div className="grid gap-3 md:hidden">
                {filteredConsumables.map((item) => {
                  const status = stockStatus(item);
                  return (
                    <div key={`cons-mobile-${item.id}`} className="rounded-lg border border-[#eadfce] bg-[#fffaf2] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0d4b3a]">{item.name}</p>
                          <p className="text-xs text-[#7a7265]">{item.category} - {item.supplier || "Tanpa supplier"}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">{status}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <MiniMetric label="Harga beli" value={rupiah(item.purchasePrice)} />
                        <MiniMetric label="Isi" value={`${item.totalSmallestUnit} ${item.smallestUnit}`} />
                        <MiniMetric label="Biaya per unit" value={rupiah(item.costPerSmallestUnit)} />
                        <MiniMetric label="Stok sistem" value={`${item.currentStock ?? item.availableQuantity} ${item.stockUnit ?? item.smallestUnit}`} />
                        <MiniMetric label="Stok fisik terakhir" value={item.lastPhysicalStock == null ? "-" : `${item.lastPhysicalStock} ${item.stockUnit ?? item.smallestUnit}`} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <ActionButton variant="ghost" onClick={() => setEditingConsumable(item)}>Edit</ActionButton>
                        <ActionButton variant="secondary" onClick={() => duplicateConsumable(item)}><Copy className="h-4 w-4" /></ActionButton>
                        <ActionButton variant="secondary" onClick={() => openAdjustment(item)}>Adjust Stock</ActionButton>
                        <ActionButton variant="danger" onClick={() => deactivateConsumable(item.id)}>Deactivate</ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden max-w-full overflow-x-auto md:block">
                <table className="w-full min-w-[1320px] text-sm">
                  <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
                    <tr>{["Nama bahan", "Kategori", "Supplier", "Stok sistem", "Unit", "Stok minimum", "Status stok", "Stok fisik terakhir", "Selisih terakhir", "Terakhir dicek", "Action"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filteredConsumables.map((item) => {
                      const status = stockStatus(item);
                      return (
                        <tr key={item.id} className="border-b border-[#efe4d2]">
                          <td className="p-3"><p className="font-semibold text-[#0d4b3a]">{item.name}</p><p className="text-xs text-[#7a7265]">{item.supplier || "-"}</p></td>
                          <td className="p-3">{item.category}</td>
                          <td className="p-3">{item.supplier || "-"}</td>
                          <td className="p-3 font-semibold text-[#0d4b3a]">{item.currentStock ?? item.availableQuantity}</td>
                          <td className="p-3">{item.stockUnit ?? item.smallestUnit}</td>
                          <td className="p-3">{item.minimumStock}</td>
                          <td className="p-3">{status}</td>
                          <td className="p-3">{item.lastPhysicalStock ?? "-"}</td>
                          <td className="p-3">{item.lastStockDifference ?? "-"}</td>
                          <td className="p-3">{item.lastStockCheckDate ?? "Belum dicek"}</td>
                          <td className="p-3"><div className="flex flex-wrap gap-2"><ActionButton variant="ghost" onClick={() => setEditingConsumable(item)}>Edit</ActionButton><ActionButton variant="secondary" onClick={() => duplicateConsumable(item)}><Copy className="h-4 w-4" /></ActionButton><ActionButton variant="secondary" onClick={() => openAdjustment(item)}>Adjust Stock</ActionButton><ActionButton variant="danger" onClick={() => deactivateConsumable(item.id)}>Deactivate</ActionButton><ActionButton variant="danger" onClick={() => deleteConsumable(item.id)}>Delete</ActionButton></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
      </div>
      <StockOpnameSection opname={opname} setOpname={setOpname} consumables={activeConsumables} saveDraft={() => saveOpname("draft", false)} finalize={() => saveOpname("finalized", false)} apply={applyOpname} exportPdf={exportOpname} />
      <AdjustmentHistory adjustments={data.stockAdjustments ?? []} />
      {adjustingItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-lg border border-[#e8dcc8] bg-[#fffdf8] p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0d4b3a]">Adjust Stock</h3>
            <p className="mt-1 text-sm text-[#756b5d]">{adjustingItem.name} - stok saat ini {adjustingItem.currentStock ?? adjustingItem.availableQuantity} {adjustingItem.stockUnit ?? adjustingItem.smallestUnit}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SelectField label="Adjustment type" value={adjustType} onChange={(value) => setAdjustType(value as StockAdjustment["type"])}>{["Tambah stok", "Kurangi stok", "Set stok manual"].map((item) => <option key={item}>{item}</option>)}</SelectField>
              <Field label="Quantity" type="number" value={adjustQty} onChange={(value) => setAdjustQty(Number(value))} />
              <SelectField label="Reason" value={adjustReason} onChange={(value) => setAdjustReason(value as StockAdjustment["reason"])}>{["Pembelian", "Pemakaian", "Rusak", "Expired", "Sample", "Koreksi stok", "Lainnya"].map((item) => <option key={item}>{item}</option>)}</SelectField>
              <Field label="Date" type="date" value={adjustDate} onChange={setAdjustDate} />
              <Field label="Staff / PIC" value={adjustPic} onChange={setAdjustPic} />
              <Field label="Notes" value={adjustNotes} onChange={setAdjustNotes} />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <ActionButton variant="ghost" onClick={() => setAdjustingItem(null)}>Batal</ActionButton>
              <ActionButton onClick={applyAdjustment}>Simpan adjustment</ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function createStockOpname(consumables: ConsumableItem[]): StockOpname {
  const now = new Date().toISOString();
  return {
    id: generateId("opname"),
    date: now.slice(0, 10),
    checkedBy: "",
    location: "",
    notes: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    items: (consumables ?? []).filter((item) => item.active !== false).map((item) => ({
      materialId: item.id,
      materialNameSnapshot: item.name,
      categorySnapshot: item.category,
      systemStock: Number(item.currentStock ?? item.availableQuantity ?? 0),
      physicalStock: undefined,
      difference: 0,
      unit: item.stockUnit ?? item.smallestUnit,
      status: "Belum diisi",
      notes: "",
    })),
  };
}

function StockOpnameSection({
  opname,
  setOpname,
  consumables,
  saveDraft,
  finalize,
  apply,
  exportPdf,
}: {
  opname: StockOpname;
  setOpname: (opname: StockOpname) => void;
  consumables: ConsumableItem[];
  saveDraft: () => void;
  finalize: () => void;
  apply: () => void;
  exportPdf: () => void;
}) {
  useEffect(() => {
    setOpname({ ...opname, items: createStockOpname(consumables).items });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumables.length]);
  const updateItem = (materialId: string, patch: Partial<StockOpnameItem>) => {
    setOpname({
      ...opname,
      items: opname.items.map((item) => {
        if (item.materialId !== materialId) return item;
        const next = { ...item, ...patch };
        const difference = next.physicalStock == null ? 0 : next.physicalStock - next.systemStock;
        const status = next.physicalStock == null ? "Belum diisi" : difference === 0 ? "Sesuai" : difference < 0 ? "Selisih kurang" : "Selisih lebih";
        return { ...next, difference, status: status as StockOpnameItem["status"] };
      }),
    });
  };
  return (
    <Card className="no-print">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Stock Opname</h3>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="ghost" onClick={saveDraft}>Save Opname Draft</ActionButton>
          <ActionButton variant="secondary" onClick={finalize}>Finalize Opname</ActionButton>
          <ActionButton onClick={apply}>Apply Adjustment to System Stock</ActionButton>
          <ActionButton variant="secondary" onClick={exportPdf}>PDF Hasil Opname</ActionButton>
        </div>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Field label="Opname date" type="date" value={opname.date} onChange={(value) => setOpname({ ...opname, date: value })} />
        <Field label="Checked by / PIC" value={opname.checkedBy} onChange={(value) => setOpname({ ...opname, checkedBy: value })} />
        <Field label="Location optional" value={opname.location ?? ""} onChange={(value) => setOpname({ ...opname, location: value })} />
        <Field label="Notes" value={opname.notes ?? ""} onChange={(value) => setOpname({ ...opname, notes: value })} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
            <tr>{["Nama bahan", "Kategori", "Stok sistem", "Stok fisik", "Selisih", "Unit", "Status", "Catatan"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
          </thead>
          <tbody>
            {opname.items.map((item) => (
              <tr key={item.materialId} className="border-b border-[#efe4d2]">
                <td className="p-3 font-semibold text-[#0d4b3a]">{item.materialNameSnapshot}</td>
                <td className="p-3">{item.categorySnapshot}</td>
                <td className="p-3">{item.systemStock}</td>
                <td className="p-3"><input className={inputClass()} type="number" value={item.physicalStock ?? ""} onChange={(event) => updateItem(item.materialId, { physicalStock: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="Stok fisik" /></td>
                <td className="p-3">{item.physicalStock == null ? "-" : item.difference}</td>
                <td className="p-3">{item.unit}</td>
                <td className="p-3">{item.status}</td>
                <td className="p-3"><input className={inputClass()} value={item.notes ?? ""} onChange={(event) => updateItem(item.materialId, { notes: event.target.value })} placeholder="Catatan" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AdjustmentHistory({ adjustments }: { adjustments: StockAdjustment[] }) {
  return (
    <Card className="no-print">
      <h3 className="text-lg font-semibold text-[#0d4b3a]">Adjustment History</h3>
      {adjustments.length === 0 ? <EmptyState text="Belum ada adjustment stock." /> : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#eadfce]">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["Tanggal", "Bahan", "Type", "Qty", "Stok sebelumnya", "Stok baru", "Reason", "PIC", "Notes"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
            </thead>
            <tbody>
              {adjustments.map((item) => (
                <tr key={item.id} className="border-b border-[#efe4d2]">
                  <td className="p-3">{item.date}</td>
                  <td className="p-3">{item.materialNameSnapshot}</td>
                  <td className="p-3">{item.type}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.previousStock}</td>
                  <td className="p-3">{item.newStock}</td>
                  <td className="p-3">{item.reason}</td>
                  <td className="p-3">{item.pic || "-"}</td>
                  <td className="p-3">{item.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function HppPackagesPage({
  data,
  persist,
  editingPackage,
  setEditingPackage,
}: {
  data: StorageSchema;
  persist: (next: StorageSchema) => void;
  editingPackage: HppPackageTemplate;
  setEditingPackage: (pkg: HppPackageTemplate) => void;
}) {
  const draft = normalizeHppPackage(editingPackage);
  const updateDraft = (next: HppPackageTemplate) => setEditingPackage(normalizeHppPackage(next));
  const savePackage = () => {
    if (!draft.name.trim()) return;
    const exists = data.hppPackages.some((pkg) => pkg.id === draft.id);
    persist({
      ...data,
      hppPackages: exists ? data.hppPackages.map((pkg) => (pkg.id === draft.id ? draft : pkg)) : [draft, ...data.hppPackages],
    });
    setEditingPackage(emptyHppPackage());
  };
  const duplicatePackage = (pkg: HppPackageTemplate) => {
    const copy = { ...pkg, id: generateId("pkg"), name: `${pkg.name} Copy`, updatedAt: new Date().toISOString().slice(0, 10) };
    persist({ ...data, hppPackages: [copy, ...data.hppPackages] });
  };
  const deletePackage = (id: string) => {
    if (window.confirm("Hapus Master Paket HPP ini?")) persist({ ...data, hppPackages: data.hppPackages.filter((pkg) => pkg.id !== id) });
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
      <Card>
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Master Paket HPP</h3>
        <p className="mt-2 text-sm leading-6 text-[#756b5d]">Buat template bahan treatment berulang seperti Basic Facial Set atau Meso Default Set.</p>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama paket" value={draft.name} onChange={(value) => updateDraft({ ...draft, name: value })} />
            <SelectField label="Kategori paket" value={draft.category} onChange={(value) => updateDraft({ ...draft, category: value as HppPackageCategory })}>
              {hppPackageCategories.map((category) => <option key={category}>{category}</option>)}
            </SelectField>
          </div>
          <Field label="Description / notes optional" value={draft.description ?? ""} onChange={(value) => updateDraft({ ...draft, description: value })} />
          <PackageItemEditor pkg={draft} consumables={data.consumables} onChange={updateDraft} />
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total HPP paket" value={rupiah(draft.totalCost)} />
            <StatCard label="Jumlah item" value={`${draft.items.length} item`} />
            <StatCard label="Last updated" value={draft.updatedAt ?? "-"} tone="gold" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={savePackage}><Save className="h-4 w-4" /> Simpan paket</ActionButton>
            <ActionButton variant="ghost" onClick={() => setEditingPackage(emptyHppPackage())}><Plus className="h-4 w-4" /> Paket baru</ActionButton>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[#0d4b3a]">Daftar Paket HPP</h3>
          <ActionButton variant="secondary" onClick={() => hppPackageReport(data.hppPackages)}><FileDown className="h-4 w-4" /> PDF</ActionButton>
        </div>
        {data.hppPackages.length === 0 ? <EmptyState text="Belum ada Master Paket HPP." /> : (
          <>
            <div className="grid gap-3 md:hidden">
              {data.hppPackages.map((pkg) => (
                <div key={`pkg-mobile-${pkg.id}`} className="rounded-lg border border-[#eadfce] bg-[#fffaf2] p-4">
                  <p className="font-semibold text-[#0d4b3a]">{pkg.name}</p>
                  <p className="text-xs text-[#7a7265]">{pkg.category} - {pkg.items.length} item</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MiniMetric label="Total HPP paket" value={rupiah(pkg.totalCost)} />
                    <MiniMetric label="Last updated" value={pkg.updatedAt ?? "-"} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <ActionButton variant="ghost" onClick={() => setEditingPackage(pkg)}>Edit</ActionButton>
                    <ActionButton variant="secondary" onClick={() => duplicatePackage(pkg)}><Copy className="h-4 w-4" /> Duplikasi</ActionButton>
                    <ActionButton variant="danger" onClick={() => deletePackage(pkg.id)}><Trash2 className="h-4 w-4" /> Hapus</ActionButton>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden max-w-full overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
                  <tr>{["Nama paket", "Kategori", "Jumlah item", "Total HPP paket", "Last updated", "Aksi"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
                </thead>
                <tbody>
                  {data.hppPackages.map((pkg) => (
                    <tr key={pkg.id} className="border-b border-[#efe4d2]">
                      <td className="p-3"><p className="font-semibold text-[#0d4b3a]">{pkg.name}</p><p className="text-xs text-[#7a7265]">{pkg.description ?? "-"}</p></td>
                      <td className="p-3">{pkg.category}</td>
                      <td className="p-3">{pkg.items.length}</td>
                      <td className="p-3">{rupiah(pkg.totalCost)}</td>
                      <td className="p-3">{pkg.updatedAt ?? "-"}</td>
                      <td className="p-3"><div className="flex flex-wrap gap-2"><ActionButton variant="ghost" onClick={() => setEditingPackage(pkg)}>Edit</ActionButton><ActionButton variant="secondary" onClick={() => duplicatePackage(pkg)}><Copy className="h-4 w-4" /></ActionButton><ActionButton variant="danger" onClick={() => deletePackage(pkg.id)}><Trash2 className="h-4 w-4" /></ActionButton></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function PackageItemEditor({
  pkg,
  consumables,
  onChange,
}: {
  pkg: HppPackageTemplate;
  consumables: ConsumableItem[];
  onChange: (pkg: HppPackageTemplate) => void;
}) {
  const updateItems = (items: HppPackageItem[]) => onChange({ ...pkg, items, totalCost: packageTotal(items), updatedAt: new Date().toISOString().slice(0, 10) });
  const addMaster = () => {
    const first = consumables[0];
    if (!first) return;
    updateItems([
      ...pkg.items,
      {
        id: generateId("pkgitem"),
        mode: "master",
        consumableItemId: first.id,
        consumableName: first.name,
        qtyDefault: 1,
        unit: first.smallestUnit,
        costPerUnit: first.costPerSmallestUnit,
        totalCost: first.costPerSmallestUnit,
        notes: "",
      },
    ]);
  };
  const addManual = () => {
    updateItems([
      ...pkg.items,
      {
        id: generateId("pkgitem"),
        mode: "manual",
        consumableName: "",
        manualName: "",
        qtyDefault: 1,
        unit: "pcs",
        costPerUnit: 0,
        manualCost: 0,
        totalCost: 0,
        notes: "",
      },
    ]);
  };
  const updateItem = (id: string, patch: Partial<HppPackageItem>) =>
    updateItems(pkg.items.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch };
      const totalCost = next.mode === "manual" ? Number(next.manualCost ?? 0) : Number(next.qtyDefault ?? 0) * Number(next.costPerUnit ?? 0);
      return { ...next, totalCost };
    }));

  return (
    <div className="grid gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0d4b3a]">Item paket</p>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="ghost" onClick={addMaster}><Plus className="h-4 w-4" /> Dari Master Bahan</ActionButton>
          <ActionButton variant="ghost" onClick={addManual}><Plus className="h-4 w-4" /> Item manual</ActionButton>
        </div>
      </div>
      {pkg.items.length === 0 && <EmptyState text="Belum ada item paket." />}
      {pkg.items.map((item) => (
        <div key={item.id} className="grid gap-2 rounded-lg border border-[#eadfce] bg-white p-3">
          {item.mode === "master" ? (
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_100px_130px_130px_150px]">
              <select
                value={item.consumableItemId ?? ""}
                onChange={(event) => {
                  const selected = consumables.find((candidate) => candidate.id === event.target.value);
                  if (!selected) return;
                  updateItem(item.id, {
                    consumableItemId: selected.id,
                    consumableName: selected.name,
                    unit: selected.smallestUnit,
                    costPerUnit: selected.costPerSmallestUnit,
                  });
                }}
                className={inputClass()}
              >
                {consumables.map((consumable) => <option key={consumable.id} value={consumable.id}>{consumable.name}</option>)}
              </select>
              <input type="number" value={item.qtyDefault} onChange={(event) => updateItem(item.id, { qtyDefault: Number(event.target.value) })} className={inputClass()} placeholder="Qty default" />
              <div className="flex min-h-11 items-center rounded-lg border border-[#eadfce] bg-[#fffaf2] px-3 text-sm">{item.unit}</div>
              <div className="flex min-h-11 items-center rounded-lg border border-[#eadfce] bg-[#fffaf2] px-3 text-sm">{rupiah(item.costPerUnit)}</div>
              <div className="flex min-h-11 items-center rounded-lg border border-[#eadfce] bg-[#fffaf2] px-3 text-sm font-semibold text-[#0d4b3a]">{rupiah(item.totalCost)}</div>
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
                <button type="button" onClick={() => updateItems([...pkg.items, { ...item, id: generateId("pkgitem"), consumableName: `${item.consumableName || "Item"} Salinan` }])} className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Copy</button>
                <button type="button" onClick={() => window.confirm("Hapus item ini?") && updateItems(pkg.items.filter((row) => row.id !== item.id))} className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]">Hapus</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_130px_minmax(0,1fr)_150px]">
              <input value={item.manualName ?? ""} onChange={(event) => updateItem(item.id, { manualName: event.target.value, consumableName: event.target.value })} className={inputClass()} placeholder="Nama item manual" />
              <input type="number" value={item.manualCost ?? 0} onChange={(event) => updateItem(item.id, { manualCost: Number(event.target.value), totalCost: Number(event.target.value) })} className={inputClass()} placeholder="Default cost" />
              <select value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value as ConsumableUnit })} className={inputClass()}>{consumableUnits.map((unit) => <option key={unit}>{unit}</option>)}</select>
              <input value={item.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} className={inputClass()} placeholder="Notes optional" />
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Edit</button>
                <button type="button" onClick={() => updateItems([...pkg.items, { ...item, id: generateId("pkgitem"), manualName: `${item.manualName || "Item"} Salinan`, consumableName: `${item.consumableName || "Item"} Salinan` }])} className="rounded-md border border-[#ded2bf] bg-white px-2 py-1 text-xs font-semibold text-[#0d4b3a]">Copy</button>
                <button type="button" onClick={() => window.confirm("Hapus item ini?") && updateItems(pkg.items.filter((row) => row.id !== item.id))} className="rounded-md border border-[#e1aaa0] bg-white px-2 py-1 text-xs font-semibold text-[#a33a2d]">Hapus</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductPage({ data, persist, editingProduct, setEditingProduct, addCategory }: { data: StorageSchema; persist: (next: StorageSchema) => void; editingProduct: Product; setEditingProduct: (product: Product) => void; addCategory: (group: CategoryGroup, name: string, notes?: string) => string }) {
  const productRules: CommissionRule[] = (editingProduct.commissionRules ?? [{ ...editingProduct.commissionRule, appliesTo: "All" }]).map((rule) => ({
    ...rule,
    appliesTo: rule.appliesTo ?? "All",
    role: rule.role ?? rule.recipient ?? "sales",
    quantity: rule.quantity ?? 1,
  }));
  const productDraft: Product = { ...editingProduct, selectedTierId: editingProduct.selectedTierId || editingProduct.buyingTiers[0]?.id || "", commissionRules: productRules };
  const [productMode, setProductMode] = useState<PriceMode>("Normal");
  const [productManualPrice, setProductManualPrice] = useState(0);
  const [quantitySold, setQuantitySold] = useState(1);
  const productSellingPrice = productMode === "Manual" ? productManualPrice || productPrice(productDraft, "Normal") : productPrice(productDraft, productMode);
  const productLive = productResult(productDraft, productMode === "Manual" ? "Normal" : productMode, productSellingPrice);

  const saveProduct = () => {
    if (!productDraft.name.trim()) return;
    const exists = data.products.some((product) => product.id === productDraft.id);
    persist({ ...data, products: exists ? data.products.map((product) => (product.id === productDraft.id ? productDraft : product)) : [productDraft, ...data.products] });
    setEditingProduct(emptyProduct());
  };

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.58fr)]">
      <Card className="p-4">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-[#0d4b3a]">Produk / Retail</h3>
          <p className="mt-1 text-xs text-[#756b5d]">Input modal, harga jual, dan komisi produk retail.</p>
        </div>
        <div className="grid min-w-0 gap-3">
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Field label="Nama produk" value={productDraft.name} onChange={(value) => setEditingProduct({ ...productDraft, name: value })} />
            <CategorySelect label="Kategori" group="product" value={productDraft.categoryId} fallbackName={productDraft.category} categories={data.categories} addCategory={addCategory} onChange={(categoryId, name) => setEditingProduct({ ...productDraft, categoryId, category: name || productDraft.category })} />
            <Field label="Supplier" value={productDraft.supplier} onChange={(value) => setEditingProduct({ ...productDraft, supplier: value })} />
          </div>
          <div className="grid min-w-0 gap-2 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#0d4b3a]">Buying tier</p>
                <p className="mt-0.5 text-xs text-[#756b5d]">Satu baris untuk setiap tier pembelian.</p>
              </div>
              <ActionButton variant="secondary" onClick={() => setEditingProduct({ ...productDraft, buyingTiers: [...productDraft.buyingTiers, { id: generateId("tier"), quantity: 20, unitCost: 0 }] })}>
                <Plus className="h-4 w-4" /> Custom tier
              </ActionButton>
            </div>
            <div className="max-w-full overflow-x-auto rounded-lg border border-[#eadfce] bg-white">
              <div className="hidden min-w-[500px] grid-cols-[92px_minmax(130px,1fr)_74px_126px] gap-2 border-b border-[#eadfce] bg-[#f7efdf] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#0d4b3a] md:grid">
                <span>Qty</span><span>Modal/unit</span><span>Pakai</span><span>Aksi</span>
              </div>
              {productDraft.buyingTiers.map((tier) => (
                <div key={tier.id} className="grid min-w-0 grid-cols-1 gap-1.5 border-b border-[#f0e6d6] p-2 last:border-b-0 md:min-w-[500px] md:grid-cols-[92px_minmax(130px,1fr)_74px_126px] md:items-center">
                  <input type="number" value={tier.quantity} onChange={(event) => setEditingProduct({ ...productDraft, buyingTiers: productDraft.buyingTiers.map((item) => item.id === tier.id ? { ...item, quantity: Number(event.target.value) } : item) })} className={compactInputClass()} placeholder="Qty" />
                  <input type="number" value={tier.unitCost} onChange={(event) => setEditingProduct({ ...productDraft, buyingTiers: productDraft.buyingTiers.map((item) => item.id === tier.id ? { ...item, unitCost: Number(event.target.value) } : item) })} className={compactInputClass()} placeholder="Modal per unit" />
                  <label className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#ded2bf] bg-white px-2 text-xs font-semibold text-[#0d4b3a]"><input type="radio" checked={productDraft.selectedTierId === tier.id} onChange={() => setEditingProduct({ ...productDraft, selectedTierId: tier.id })} /> Pakai</label>
                  <div className="flex flex-wrap items-center gap-1">
                    <CompactAction>Edit</CompactAction>
                    <CompactAction onClick={() => setEditingProduct({ ...productDraft, buyingTiers: [...productDraft.buyingTiers, { ...tier, id: generateId("tier") }] })}>Copy</CompactAction>
                    <CompactAction tone="danger" onClick={() => window.confirm("Hapus tier ini?") && setEditingProduct({ ...productDraft, buyingTiers: productDraft.buyingTiers.filter((item) => item.id !== tier.id) })}>Hapus</CompactAction>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Harga Normal / Non-VIP" type="number" value={productDraft.normalPrice} onChange={(value) => setEditingProduct({ ...productDraft, normalPrice: Number(value) })} />
            <Field label="Harga VIP" type="number" value={productDraft.vipPrice} onChange={(value) => setEditingProduct({ ...productDraft, vipPrice: Number(value) })} />
            <Field label="Harga Promo" type="number" value={productDraft.promoPrice} onChange={(value) => setEditingProduct({ ...productDraft, promoPrice: Number(value) })} />
            <Field label="Stok optional" type="number" value={productDraft.stockQuantity ?? 0} onChange={(value) => setEditingProduct({ ...productDraft, stockQuantity: Number(value) })} />
          </div>
          <CommissionEditor rules={productDraft.commissionRules ?? []} onChange={(rules) => setEditingProduct({ ...productDraft, commissionRules: rules, commissionRule: rules[0] ?? productDraft.commissionRule })} />
          <HeraCommissionRulesEditor rules={productDraft.heraCommissionRules?.length ? productDraft.heraCommissionRules : [{ id: generateId("hcomm"), role: "Sales / Promoter", mode: "percent_final_price", percent: 2, nominal: 0, active: true, notes: "" }]} onChange={(rules) => setEditingProduct({ ...productDraft, heraCommissionRules: rules })} />
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={saveProduct}><Save className="h-4 w-4" /> Simpan produk</ActionButton>
            <ActionButton variant="ghost" onClick={() => setEditingProduct(emptyProduct())}><Plus className="h-4 w-4" /> Baru</ActionButton>
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 max-w-full gap-5">
        <Card className="p-4">
          <h3 className="text-base font-semibold text-[#0d4b3a]">Simulasi Produk</h3>
          <div className="mt-3 grid gap-3">
            <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-1 min-[1500px]:grid-cols-2">
              <SelectField label="Tier harga" value={productMode} onChange={(value) => setProductMode(value as PriceMode)}>
                {["Normal", "VIP", "Promo", "Manual"].map((mode) => <option key={mode}>{mode}</option>)}
              </SelectField>
              <Field label="Harga jual manual" type="number" value={productSellingPrice} onChange={(value) => setProductManualPrice(Number(value))} />
              <Field label="Quantity sold" type="number" value={quantitySold} onChange={(value) => setQuantitySold(Math.max(Number(value), 1))} />
              <StatCard label="Modal tier dipakai" value={`Buy ${selectedTier(productDraft)?.quantity ?? 1}: ${rupiah(productLive.unitCost)}`} />
            </div>
            <div className="grid min-w-0 gap-2 lg:grid-cols-2 2xl:grid-cols-1 min-[1500px]:grid-cols-2">
              <StatCard label="Total sales" value={rupiah(productSellingPrice * quantitySold)} />
              <StatCard label="Total modal" value={rupiah(productLive.unitCost * quantitySold)} />
              <StatCard label="Total komisi" value={rupiah(productLive.totalCommission * quantitySold)} tone="gold" />
              <StatCard label="Net profit" value={rupiah(productLive.netProfit * quantitySold)} />
              <StatCard label="Margin" value={percent(productLive.marginPercent)} tone={productLive.marginPercent < 20 ? "rose" : "emerald"} />
            </div>
          </div>
        </Card>
        <ProductTable data={data} persist={persist} setEditingProduct={setEditingProduct} />
      </div>
    </div>
  );
}

function ProductTable({ data, persist, setEditingProduct }: { data: StorageSchema; persist: (next: StorageSchema) => void; setEditingProduct: (product: Product) => void }) {
  const duplicateProduct = (product: Product) => {
    persist({ ...data, products: [{ ...product, id: generateId("prd"), name: `${product.name} Salinan` }, ...data.products] });
  };
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Profit Produk Retail</h3>
        <ActionButton variant="secondary" onClick={() => productProfitReport(data.products)}><FileDown className="h-4 w-4" /> PDF</ActionButton>
      </div>
      <div className="grid gap-3 md:hidden">
        {data.products.map((product) => {
          const normal = productResult(product, "Normal");
          const vip = productResult(product, "VIP");
          const promo = productResult(product, "Promo");
          return (
            <div key={`product-mobile-${product.id}`} className="rounded-lg border border-[#eadfce] bg-[#fffaf2] p-4">
              <p className="font-semibold text-[#0d4b3a]">{product.name}</p>
              <p className="text-xs text-[#7a7265]">{product.category} - {product.supplier}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniMetric label="Modal tier" value={`Buy ${selectedTier(product)?.quantity}: ${rupiah(normal.unitCost)}`} />
                <MiniMetric label="Normal" value={`${rupiah(normal.netProfit)} (${percent(normal.marginPercent)})`} />
                <MiniMetric label="VIP" value={`${rupiah(vip.netProfit)} (${percent(vip.marginPercent)})`} />
                <MiniMetric label="Promo" value={`${rupiah(promo.netProfit)} (${percent(promo.marginPercent)})`} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <ActionButton variant="ghost" onClick={() => setEditingProduct(product)}>Edit</ActionButton>
                <ActionButton variant="secondary" onClick={() => duplicateProduct(product)}><Copy className="h-4 w-4" /></ActionButton>
                <ActionButton variant="danger" onClick={() => window.confirm("Hapus produk ini?") && persist({ ...data, products: data.products.filter((item) => item.id !== product.id) })}>Hapus</ActionButton>
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
            <tr>{["Produk", "Modal tier", "Normal", "VIP", "Promo", "Stok", "Aksi"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
          </thead>
          <tbody>
            {data.products.map((product) => {
              const normal = productResult(product, "Normal");
              const vip = productResult(product, "VIP");
              const promo = productResult(product, "Promo");
              return (
                <tr key={product.id} className="border-b border-[#efe4d2]">
                  <td className="p-3"><p className="font-semibold text-[#0d4b3a]">{product.name}</p><p className="text-xs text-[#7a7265]">{product.category} - {product.supplier}</p></td>
                  <td className="p-3">Buy {selectedTier(product)?.quantity}: {rupiah(normal.unitCost)}</td>
                  <td className="p-3">{rupiah(normal.netProfit)} ({percent(normal.marginPercent)})</td>
                  <td className="p-3">{rupiah(vip.netProfit)} ({percent(vip.marginPercent)})</td>
                  <td className="p-3">{rupiah(promo.netProfit)} ({percent(promo.marginPercent)})</td>
                  <td className="p-3">{product.stockQuantity ?? "-"}</td>
                  <td className="p-3"><div className="flex gap-2"><ActionButton variant="ghost" onClick={() => setEditingProduct(product)}>Edit</ActionButton><ActionButton variant="secondary" onClick={() => duplicateProduct(product)}><Copy className="h-4 w-4" /></ActionButton><ActionButton variant="danger" onClick={() => window.confirm("Hapus produk ini?") && persist({ ...data, products: data.products.filter((item) => item.id !== product.id) })}>Hapus</ActionButton></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CommissionSimulationPage({ data, persist }: { data: StorageSchema; persist: (next: StorageSchema) => void }) {
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [patientName, setPatientName] = useState("");
  const [treatmentId, setTreatmentId] = useState(data.treatments[0]?.id ?? "");
  const [finalAllocatedAmount, setFinalAllocatedAmount] = useState(0);
  const [handlers, setHandlers] = useState<StaffHandlerSelection>(emptyHandlers());
  const treatment = data.treatments.map(normalizeTreatmentForEdit).find((item) => item.id === treatmentId) ?? data.treatments.map(normalizeTreatmentForEdit)[0];
  const normalPrice = treatment?.nonVipPrice ?? 0;
  const result = treatment ? treatmentResult(treatment, data.fixedCosts, "Normal", finalAllocatedAmount || normalPrice) : undefined;
  const allocated = finalAllocatedAmount || normalPrice;
  const previewRows = treatment && result ? buildCommissionPreviewRows({
    rules: treatment.heraCommissionRules ?? defaultHeraCommissionRules(),
    staff: data.staffDirectory ?? [],
    handlers,
    normalPrice,
    finalAllocatedAmount: allocated,
    itemName: treatment.name,
    treatmentId: treatment.id,
    hppCost: result.totalCost,
    invoiceNumber,
    patientName,
    transactionDate,
  }) : [];
  const totalCommission = previewRows.reduce((sum, row) => sum + row.calculatedCommission, 0);
  const stockWarnings = treatment?.consumableUsages?.map((usage) => {
    const material = data.consumables.find((item) => item.id === usage.consumableId);
    return material ? `${usage.name}: pakai ${usage.quantityUsed} ${usage.unit}, stok ${material.currentStock ?? material.availableQuantity}` : "";
  }).filter(Boolean) ?? [];
  const saveDraft = () => {
    if (!previewRows.length) return;
    persist({ ...data, commissionDrafts: [...previewRows, ...(data.commissionDrafts ?? [])] });
  };
  return (
    <div className="grid min-w-0 max-w-full gap-5 2xl:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.58fr)]">
      <Card className="p-4">
        <div>
          <h3 className="text-base font-semibold text-[#0d4b3a]">Manual Transaction Entry</h3>
          <p className="mt-1 text-xs text-[#756b5d]">Isi transaksi singkat untuk menghitung komisi dan profit.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Transaction Date" type="date" value={transactionDate} onChange={setTransactionDate} />
          <Field label="Invoice Number" value={invoiceNumber} onChange={setInvoiceNumber} />
          <Field label="Patient Name optional" value={patientName} onChange={setPatientName} />
          <SelectField label="Treatment Master" value={treatment?.id ?? ""} onChange={setTreatmentId}>
            {data.treatments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <Field label="Normal Price" type="number" value={normalPrice} onChange={() => undefined} />
          <Field label="Final Allocated Amount" type="number" value={allocated} onChange={(value) => setFinalAllocatedAmount(Number(value))} />
        </div>
        <div className="mt-3"><StaffHandlerSection staff={data.staffDirectory ?? []} handlers={handlers} setHandlers={setHandlers} /></div>
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#eadfce] pt-3">
          <ActionButton onClick={() => undefined}>Hitung Preview Komisi</ActionButton>
          <ActionButton variant="secondary" onClick={saveDraft}>Simpan Draft</ActionButton>
        </div>
      </Card>
      <div className="grid min-w-0 max-w-full gap-4">
        <div className="grid min-w-0 gap-2 lg:grid-cols-2 2xl:grid-cols-1 min-[1500px]:grid-cols-2">
          <StatCard label="Total normal value" value={rupiah(normalPrice)} />
          <StatCard label="Total patient paid" value={rupiah(allocated)} />
          <StatCard label="HPP from treatment master" value={rupiah(result?.totalCost ?? 0)} />
          <StatCard label="Total commission" value={rupiah(totalCommission)} tone="gold" />
          <StatCard label="Estimated gross profit" value={rupiah(allocated - (result?.directHpp ?? 0))} />
          <StatCard label="Estimated net profit" value={rupiah(allocated - (result?.totalCost ?? 0) - totalCommission)} tone={allocated - (result?.totalCost ?? 0) - totalCommission < 0 ? "rose" : "emerald"} />
        </div>
        {stockWarnings.length > 0 && <Card><h3 className="text-sm font-semibold text-[#0d4b3a]">Estimasi pemakaian stock</h3><div className="mt-2 grid gap-1 text-sm text-[#756b5d]">{stockWarnings.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</div></Card>}
        <CommissionDraftPreview rows={previewRows} />
      </div>
    </div>
  );
}

function CommissionDraftPage({ data, persist }: { data: StorageSchema; persist: (next: StorageSchema) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const approveSelected = () => {
    const approved = data.commissionDrafts.filter((row) => selected.includes(row.id)).map((row) => ({ ...row, status: "approved" as const, updatedAt: new Date().toISOString() }));
    persist({ ...data, commissionDrafts: data.commissionDrafts.filter((row) => !selected.includes(row.id)), commissionHistory: [...approved, ...(data.commissionHistory ?? [])] });
    setSelected([]);
  };
  const rejectSelected = () => {
    persist({ ...data, commissionDrafts: data.commissionDrafts.map((row) => selected.includes(row.id) ? { ...row, status: "rejected", updatedAt: new Date().toISOString() } : row) });
    setSelected([]);
  };
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Draft Komisi</h3>
        <div className="flex flex-wrap gap-2"><ActionButton variant="secondary" onClick={() => commissionDraftReport(data.commissionDrafts, "Commission Draft Report")}>PDF Draft</ActionButton><ActionButton onClick={approveSelected}>Approve selected</ActionButton><ActionButton variant="danger" onClick={rejectSelected}>Reject selected</ActionButton></div>
      </div>
      <CommissionRowsTable rows={data.commissionDrafts ?? []} selected={selected} setSelected={setSelected} persistDelete={(ids) => persist({ ...data, commissionDrafts: data.commissionDrafts.filter((row) => !ids.includes(row.id)) })} />
    </Card>
  );
}

function CommissionHistoryPage({ data }: { data: StorageSchema }) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Riwayat Komisi</h3>
        <div className="flex flex-wrap gap-2"><ActionButton variant="secondary" onClick={() => commissionDraftReport(data.commissionHistory, "Commission Approved Report")}>PDF Approved</ActionButton><ActionButton variant="ghost" onClick={() => staffCommissionStatement(data.commissionHistory)}>PDF Staff Statement</ActionButton></div>
      </div>
      <CommissionRowsTable rows={data.commissionHistory ?? []} />
    </Card>
  );
}

function CommissionRowsTable({ rows, selected, setSelected, persistDelete }: { rows: CommissionDraft[]; selected?: string[]; setSelected?: (ids: string[]) => void; persistDelete?: (ids: string[]) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#eadfce]">
      <table className="w-full min-w-[1180px] text-sm">
        <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
          <tr>{["", "Tanggal", "Invoice", "Pasien", "Item", "Staff", "Role", "Mode", "Base", "Komisi", "Profit", "Status", "Aksi"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td className="p-4 text-[#756b5d]" colSpan={13}>Belum ada data.</td></tr> : rows.map((row) => (
            <tr key={row.id} className="border-b border-[#efe4d2]">
              <td className="p-3">{selected && setSelected ? <input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} /> : null}</td>
              <td className="p-3">{row.transactionDate}</td>
              <td className="p-3">{row.invoiceNumber}</td>
              <td className="p-3">{row.patientName || "-"}</td>
              <td className="p-3">{row.itemName}</td>
              <td className="p-3">{row.staffNameSnapshot}</td>
              <td className="p-3">{row.role}</td>
              <td className="p-3">{heraCommissionModes.find((mode) => mode.value === row.commissionMode)?.label ?? row.commissionMode}</td>
              <td className="p-3">{rupiah(row.finalAllocatedAmount)}</td>
              <td className="p-3 font-semibold text-[#0d4b3a]">{rupiah(row.calculatedCommission)}</td>
              <td className="p-3">{rupiah(row.estimatedProfit)}</td>
              <td className="p-3">{row.status}</td>
              <td className="p-3">{persistDelete ? <ActionButton variant="danger" onClick={() => persistDelete([row.id])}>Delete</ActionButton> : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimulationPage({ data, persist, initialItemId, selectedSimulationId, setSelectedSimulationId }: { data: StorageSchema; persist: (next: StorageSchema) => void; initialItemId: string; selectedSimulationId: string; setSelectedSimulationId: (id: string) => void }) {
  const allItems = [...data.treatments.map((item) => ({ id: item.id, name: item.name, type: "treatment" as const })), ...data.products.map((item) => ({ id: item.id, name: item.name, type: "product" as const }))];
  const [itemId, setItemId] = useState(initialItemId || allItems[0]?.id || "");
  const [priceMode, setPriceMode] = useState<PriceMode>("Normal");
  const [overridePrice, setOverridePrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [staffName, setStaffName] = useState("Staff Hera");
  const [staffRole, setStaffRole] = useState<StaffRole>("therapist");
  const [deductStock, setDeductStock] = useState(false);

  useEffect(() => {
    if (initialItemId) setItemId(initialItemId);
  }, [initialItemId]);

  const currentTreatment = data.treatments.map(normalizeTreatmentForEdit).find((item) => item.id === itemId);
  const currentProduct = data.products.find((item) => item.id === itemId);
  const customerType: CustomerType = priceMode === "Manual" ? "Normal" : priceMode;
  const defaultPrice = currentTreatment ? treatmentPrice(currentTreatment, customerType) : currentProduct ? productPrice(currentProduct, customerType) : 0;
  const sellingPrice = priceMode === "Manual" ? overridePrice || defaultPrice : defaultPrice;
  const simulation = currentTreatment
    ? buildSimulationFromTreatment(generateId("sim"), currentTreatment, data.fixedCosts, customerType, quantity, staffName, staffRole, sellingPrice)
    : currentProduct
      ? buildSimulationFromProduct(generateId("sim"), currentProduct, customerType, quantity, staffName, staffRole, sellingPrice)
      : undefined;

  const saveSimulation = () => {
    if (!simulation) return;
    const saved = { ...simulation, id: generateId("sim") };
    persist({ ...data, simulations: [saved, ...data.simulations] });
    setSelectedSimulationId(saved.id);
  };
  const saveToLog = () => {
    if (!simulation) return;
    const log: CommissionLog = {
      id: generateId("log"),
      date: new Date().toISOString().slice(0, 10),
      customerName: "Customer Hera",
      itemName: simulation.itemName,
      itemType: simulation.itemType === "treatment" ? "Treatment" : "Produk",
      customerType: simulation.customerType,
      sellingPrice: simulation.sellingPrice,
      quantity: simulation.quantity,
      staffName: simulation.staffName,
      staffRole: simulation.staffRole,
      commissionAmount: simulation.totalCommission,
      netProfit: simulation.netProfit,
      paymentStatus: "Belum dibayar",
    };
    const nextConsumables =
      deductStock && currentTreatment
        ? data.consumables.map((item) => {
            const used = (currentTreatment.consumableUsages ?? [])
              .filter((usage) => usage.consumableId === item.id)
              .reduce((sum, usage) => sum + usage.quantityUsed * quantity, 0);
            return used > 0 ? { ...item, availableQuantity: Math.max(0, item.availableQuantity - used) } : item;
          })
        : data.consumables;
    persist({ ...data, commissionLogs: [log, ...data.commissionLogs], consumables: nextConsumables });
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      <Card>
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Open Simulation</h3>
        <div className="mt-4 grid gap-4">
          <SelectField label="Treatment / Produk" value={itemId} onChange={setItemId}>
            {allItems.map((item) => <option key={`${item.type}-${item.id}`} value={item.id}>{item.name} ({item.type === "treatment" ? "Treatment" : "Produk"})</option>)}
          </SelectField>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Tier harga" value={priceMode} onChange={(value) => setPriceMode(value as PriceMode)}>
              {["Normal", "VIP", "Promo", "Manual"].map((mode) => <option key={mode}>{mode}</option>)}
            </SelectField>
            <Field label="Selling price" type="number" value={sellingPrice} onChange={(value) => { setPriceMode("Manual"); setOverridePrice(Number(value)); }} />
            <Field label="Jumlah customer / quantity" type="number" value={quantity} onChange={(value) => setQuantity(Math.max(Number(value), 1))} />
            <Field label="Nama staff utama" value={staffName} onChange={setStaffName} />
            <SelectField label="Role staff utama" value={staffRole} onChange={(value) => setStaffRole(value as StaffRole)}>
              {roles.map((role) => <option key={role}>{role}</option>)}
            </SelectField>
            {currentTreatment && (
              <label className="flex min-w-0 items-center gap-2 rounded-lg border border-[#ded2bf] bg-white px-3 py-3 text-sm text-[#4d473d] md:col-span-2">
                <input type="checkbox" checked={deductStock} onChange={(event) => setDeductStock(event.target.checked)} />
                Kurangi stok bahan dari Master Bahan
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={saveSimulation}><Save className="h-4 w-4" /> Save to simulation log</ActionButton>
            <ActionButton variant="secondary" onClick={saveToLog}><CheckCircle2 className="h-4 w-4" /> Save to commission log</ActionButton>
            <ActionButton variant="ghost" onClick={() => simulation && simulationReport(simulation)}><FileDown className="h-4 w-4" /> Generate PDF</ActionButton>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Hasil Instan</h3>
        {simulation ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard label="Total sales" value={rupiah(simulation.sellingPrice * simulation.quantity)} />
              <StatCard label="Total HPP" value={rupiah(simulation.directHpp)} />
              <StatCard label="Total overhead" value={rupiah(simulation.overheadAllocated)} tone="gold" />
              <StatCard label="Total commission" value={rupiah(simulation.totalCommission)} tone="gold" />
              <StatCard label="Net profit" value={rupiah(simulation.netProfit)} tone={simulation.netProfit < 0 ? "rose" : "emerald"} />
              <StatCard label="Margin" value={percent(simulation.marginPercent)} tone={simulation.marginPercent < 20 ? "rose" : "emerald"} />
            </div>
            {simulation.marginPercent < 20 && <div className="rounded-lg border border-[#e1aaa0] bg-[#fff2ef] p-4 text-sm font-medium text-[#a33a2d]">Warning: margin terlalu rendah untuk standar profit Hera Clinic.</div>}
            <SelectField label="PDF dari simulasi tersimpan" value={selectedSimulationId || data.simulations[0]?.id || ""} onChange={setSelectedSimulationId}>
              {data.simulations.map((record) => <option key={record.id} value={record.id}>{record.date} - {record.itemName}</option>)}
            </SelectField>
          </div>
        ) : <EmptyState text="Tambahkan treatment atau produk terlebih dahulu." />}
      </Card>
    </div>
  );
}

function CommissionLogPage({ data, persist, selectedLogIds, setSelectedLogIds }: { data: StorageSchema; persist: (next: StorageSchema) => void; selectedLogIds: string[]; setSelectedLogIds: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [staff, setStaff] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const filtered = data.commissionLogs.filter((log) => {
    const q = query.toLowerCase();
    const matchesQuery = [log.customerName, log.itemName, log.staffName].some((value) => value.toLowerCase().includes(q));
    const matchesDate = (!fromDate || log.date >= fromDate) && (!toDate || log.date <= toDate);
    return matchesQuery && matchesDate && (!staff || log.staffName === staff) && (!role || log.staffRole === role) && (!status || log.paymentStatus === status);
  });
  const staffNames = Array.from(new Set(data.commissionLogs.map((log) => log.staffName)));
  const totalSales = filtered.reduce((sum, log) => sum + log.sellingPrice * log.quantity, 0);
  const totalCommission = filtered.reduce((sum, log) => sum + log.commissionAmount, 0);
  const totalNetProfit = filtered.reduce((sum, log) => sum + log.netProfit, 0);
  const markPaid = () => {
    persist({ ...data, commissionLogs: data.commissionLogs.map((log) => selectedLogIds.includes(log.id) ? { ...log, paymentStatus: "Sudah dibayar" } : log) });
    setSelectedLogIds([]);
  };

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total sales summary" value={rupiah(totalSales)} />
        <StatCard label="Total commission summary" value={rupiah(totalCommission)} tone="gold" />
        <StatCard label="Total net profit summary" value={rupiah(totalNetProfit)} />
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-6">
          <label className="relative min-w-0 md:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#8b806f]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari customer, item, staff" className={inputClass("pl-9")} />
          </label>
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={inputClass()} />
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={inputClass()} />
          <select value={staff} onChange={(event) => setStaff(event.target.value)} className={inputClass()}><option value="">Semua staff</option>{staffNames.map((name) => <option key={name}>{name}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass()}><option value="">Semua status</option><option>Belum dibayar</option><option>Sudah dibayar</option></select>
          <select value={role} onChange={(event) => setRole(event.target.value)} className={inputClass()}><option value="">Semua role</option>{roles.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton variant="secondary" onClick={markPaid}><CheckCircle2 className="h-4 w-4" /> Mark selected as paid</ActionButton>
          <ActionButton variant="ghost" onClick={() => commissionReport(filtered, "Filter aktif pada halaman log")}><FileDown className="h-4 w-4" /> Export PDF</ActionButton>
        </div>
      </Card>
      <Card>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["", "Date", "Customer", "Treatment/product", "Type", "Harga", "Qty", "Staff", "Komisi", "Status", "Aksi"].map((head, index) => <th key={`${head}-${index}`} className="p-3">{head}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-[#efe4d2]">
                  <td className="p-3"><input type="checkbox" checked={selectedLogIds.includes(log.id)} onChange={(event) => setSelectedLogIds(event.target.checked ? [...selectedLogIds, log.id] : selectedLogIds.filter((id) => id !== log.id))} /></td>
                  <td className="p-3">{log.date}</td><td className="p-3">{log.customerName}</td><td className="p-3">{log.itemName}</td><td className="p-3">{log.customerType}</td><td className="p-3">{rupiah(log.sellingPrice)}</td><td className="p-3">{log.quantity}</td><td className="p-3">{log.staffName} / {log.staffRole}</td><td className="p-3">{rupiah(log.commissionAmount)}</td><td className="p-3">{log.paymentStatus}</td>
                  <td className="p-3"><ActionButton variant="danger" onClick={() => window.confirm("Hapus log komisi ini?") && persist({ ...data, commissionLogs: data.commissionLogs.filter((item) => item.id !== log.id) })}><Trash2 className="h-4 w-4" /></ActionButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const categoryGroupLabels: Record<CategoryGroup, string> = {
  "fixed-cost": "Fixed Cost Category",
  "staff-role": "Staff Role Category",
  "electricity-device": "Electricity Device Category",
  "ac-room": "AC / Room Category",
  "treatment-cost": "Treatment Cost Category",
  material: "Material Category",
  product: "Product Category",
  installment: "Installment Category",
  "other-cost": "Other Cost Category",
};

function MasterCategoriesPage({ data, persist, addCategory }: { data: StorageSchema; persist: (next: StorageSchema) => void; addCategory: (group: CategoryGroup, name: string, notes?: string) => string }) {
  const groups = Object.keys(categoryGroupLabels) as CategoryGroup[];
  const [activeGroup, setActiveGroup] = useState<CategoryGroup>("fixed-cost");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const filtered = data.categories.filter((item) => item.group === activeGroup && item.name.toLowerCase().includes(search.toLowerCase()));

  const saveNew = () => {
    const duplicate = data.categories.some((item) => item.group === activeGroup && item.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      window.alert("Kategori dengan nama yang sama sudah ada di group ini.");
      return;
    }
    addCategory(activeGroup, name, notes);
    setName("");
    setNotes("");
  };
  const updateCategory = (id: string, patch: Partial<HppCategory>) => {
    persist({
      ...data,
      categories: data.categories.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : item),
    });
  };
  const categoryIsUsed = (id: string) => {
    const fixedNotes = Object.values(data.fixedCosts.costNotes ?? {}).includes(id);
    const staff = (data.fixedCosts.staffCosts ?? []).some((item) => item.categoryId === id);
    const electricity = [
      ...(data.fixedCosts.electricitySettings?.devices ?? []).map((item) => item.categoryId),
      ...(data.fixedCosts.electricitySettings?.acItems ?? []).map((item) => item.categoryId),
    ].includes(id);
    const treatments = data.treatments.some((treatment) =>
      (treatment.disposableItems ?? treatment.disposableCosts ?? []).some((item) => item.categoryId === id) ||
      (treatment.materialItems ?? []).some((item) => item.categoryId === id),
    );
    const consumables = data.consumables.some((item) => item.categoryId === id);
    const products = data.products.some((item) => item.categoryId === id);
    return fixedNotes || staff || electricity || treatments || consumables || products;
  };
  const deleteCategory = (item: HppCategory) => {
    if (categoryIsUsed(item.id)) {
      window.alert("Kategori sudah dipakai, nonaktifkan saja agar data lama tetap aman.");
      return;
    }
    if (window.confirm("Hapus kategori ini?")) persist({ ...data, categories: data.categories.filter((category) => category.id !== item.id) });
  };

  return (
    <div className="grid min-w-0 gap-6">
      <Card>
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Master Kategori</h3>
        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto">
          {groups.map((group) => (
            <button key={group} onClick={() => setActiveGroup(group)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${activeGroup === group ? "bg-[#0d4b3a] text-white" : "border border-[#ded2bf] bg-white text-[#0d4b3a]"}`}>
              {categoryGroupLabels[group]}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Field label="Tambah Kategori" value={name} onChange={setName} />
          <Field label="Notes" value={notes} onChange={setNotes} />
          <div className="flex items-end"><ActionButton onClick={saveNew}><Plus className="h-4 w-4" /> Tambah Kategori</ActionButton></div>
        </div>
        <div className="mt-4">
          <Field label="Cari kategori" value={search} onChange={setSearch} />
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 md:hidden">
          {filtered.map((item) => (
            <div key={`cat-mobile-${item.id}`} className="rounded-lg border border-[#eadfce] bg-[#fffaf2] p-4">
              <input className={inputClass()} value={item.name} onChange={(event) => updateCategory(item.id, { name: event.target.value })} />
              <p className="mt-2 text-xs text-[#756b5d]">{categoryGroupLabels[item.group]}</p>
              <input className={`${inputClass()} mt-2`} value={item.notes ?? ""} onChange={(event) => updateCategory(item.id, { notes: event.target.value })} placeholder="Notes" />
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton variant="ghost" onClick={() => updateCategory(item.id, { name: item.name })}>Edit</ActionButton>
                <ActionButton variant={item.active ? "danger" : "secondary"} onClick={() => updateCategory(item.id, { active: !item.active })}>{item.active ? "Nonaktifkan" : "Aktifkan"}</ActionButton>
                <ActionButton variant="danger" onClick={() => deleteCategory(item)}>{categoryIsUsed(item.id) ? "Delete disabled" : "Hapus"}</ActionButton>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
              <tr>{["Nama kategori", "Group", "Status", "Notes", "Action"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-[#efe4d2]">
                  <td className="p-3"><input className={inputClass()} value={item.name} onChange={(event) => updateCategory(item.id, { name: event.target.value })} /></td>
                  <td className="p-3">{categoryGroupLabels[item.group]}</td>
                  <td className="p-3">{item.active ? "Kategori aktif" : "Kategori nonaktif"}</td>
                  <td className="p-3"><input className={inputClass()} value={item.notes ?? ""} onChange={(event) => updateCategory(item.id, { notes: event.target.value })} /></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2" title={categoryIsUsed(item.id) ? "Kategori sudah dipakai, nonaktifkan saja agar data lama tetap aman." : undefined}>
                      <ActionButton variant="ghost" onClick={() => updateCategory(item.id, { name: item.name })}>Edit</ActionButton>
                      <ActionButton variant={item.active ? "danger" : "secondary"} onClick={() => updateCategory(item.id, { active: !item.active })}>{item.active ? "Nonaktifkan" : "Aktifkan"}</ActionButton>
                      <ActionButton variant="danger" onClick={() => deleteCategory(item)}>{categoryIsUsed(item.id) ? "Delete disabled" : "Hapus"}</ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReportsPage({ data, selectedSimulationId }: { data: StorageSchema; selectedSimulationId: string }) {
  const selectedSimulation = data.simulations.find((item) => item.id === selectedSimulationId) ?? data.simulations[0];
  const reports = [
    { title: "Treatment HPP Report", body: "Ringkasan direct HPP, overhead durasi, harga rekomendasi, profit dan margin.", action: () => treatmentHppReport(data.treatments, data.fixedCosts) },
    { title: "Biaya Tetap & Listrik", body: "Breakdown fixed cost, cashflow-only, excluded, payroll, listrik AC/alat, dan basis alokasi.", action: () => fixedCostReport(data.fixedCosts) },
    { title: "Price Simulation Report", body: "PDF dari simulasi harga terakhir atau simulasi yang dipilih.", action: () => selectedSimulation && simulationReport(selectedSimulation) },
    { title: "Commission Report by date range", body: "Log komisi lengkap dengan total sales, total komisi, status pembayaran, dan net profit.", action: () => commissionReport(data.commissionLogs, "Semua tanggal") },
    { title: "Product Profit Report", body: "Profit produk retail berdasarkan tier modal, harga normal, VIP, promo, dan komisi.", action: () => productProfitReport(data.products) },
    { title: "Master Bahan & Stok", body: "Daftar bahan internal, biaya per unit terkecil, stok tersedia, nilai stok, dan low stock.", action: () => consumableStockReport(data.consumables) },
    { title: "Master Paket HPP", body: "Template paket bahan treatment, item list, qty, unit, dan total HPP paket.", action: () => hppPackageReport(data.hppPackages) },
    { title: "Commission Draft Report", body: "Draft komisi berdasarkan invoice, staff, role, HPP, dan estimasi profit.", action: () => commissionDraftReport(data.commissionDrafts, "Commission Draft Report") },
    { title: "Commission Approved Report", body: "Riwayat komisi approved untuk review sebelum payroll.", action: () => commissionDraftReport(data.commissionHistory, "Commission Approved Report") },
    { title: "Staff Commission Statement", body: "Statement komisi staff dari riwayat approved.", action: () => staffCommissionStatement(data.commissionHistory) },
  ];
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      {reports.map((report) => (
        <Card key={report.title}>
          <BarChart3 className="h-5 w-5 text-[#b19042]" />
          <h3 className="mt-3 text-lg font-semibold text-[#0d4b3a]">{report.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#756b5d]">{report.body}</p>
          <div className="mt-5"><ActionButton onClick={report.action}><FileDown className="h-4 w-4" /> Generate PDF</ActionButton></div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[#d8b65f] bg-[#fffaf2] p-5 text-center text-sm text-[#756b5d]">{text}</div>;
}
