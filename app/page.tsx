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
  directTreatmentCost,
  fixedCostBreakdown,
  percent,
  productPrice,
  productResult,
  rupiah,
  selectedTier,
  treatmentPrice,
  treatmentResult,
} from "../lib/calculations";
import { commissionReport, consumableStockReport, hppPackageReport, productProfitReport, simulationReport, treatmentHppReport } from "../lib/pdf";
import { clearData, generateId, getData, resetData, saveData } from "../lib/storage";
import type {
  CommissionAppliesTo,
  CommissionLog,
  CommissionRule,
  CommissionType,
  ConsumableCategory,
  ConsumableItem,
  ConsumableUnit,
  CustomerType,
  FixedCostSettings,
  HppPackageCategory,
  HppPackageItem,
  HppPackageTemplate,
  Product,
  SimulationRecord,
  StaffRole,
  StorageSchema,
  Treatment,
  TreatmentConsumableUsage,
  TreatmentCostItem,
  TreatmentMachineItem,
  TreatmentMaterialItem,
} from "../lib/types";

type ViewKey = "dashboard" | "fixed" | "treatments" | "consumables" | "hppPackages" | "products" | "simulation" | "logs" | "reports";
type PriceMode = "Normal" | "VIP" | "Promo" | "Manual";

const navItems: { key: ViewKey; label: string; icon: ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "fixed", label: "Biaya Tetap", icon: Settings },
  { key: "treatments", label: "Treatment HPP", icon: Sparkles },
  { key: "consumables", label: "Master Bahan", icon: Package },
  { key: "hppPackages", label: "Master Paket HPP", icon: ClipboardList },
  { key: "products", label: "Produk / Retail", icon: Package },
  { key: "simulation", label: "Simulasi Harga", icon: Calculator },
  { key: "logs", label: "Log Komisi", icon: ClipboardList },
  { key: "reports", label: "Laporan PDF", icon: FileDown },
];

const roles: StaffRole[] = ["dokter", "therapist", "beautician", "sales", "admin"];
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
    productMaterialCost: 0,
    machineCostAllocation: 0,
    staffInvolved: ["therapist"],
    nonVipPrice: 0,
    vipPrice: 0,
    promoPrice: 0,
    targetMarginPercent: 40,
    commissionRules: [emptyRule()],
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
    stockQuantity: 0,
  };
}

function emptyConsumable(): ConsumableItem {
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
    notes: "",
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
  return {
    ...item,
    purchaseQuantity,
    totalSmallestUnit,
    costPerSmallestUnit,
    availableQuantity: item.availableQuantity || purchaseQuantity * totalSmallestUnit,
    minimumStock: Number(item.minimumStock) || 0,
  };
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
    staffInvolved: treatment.staffInvolved ?? [],
    commissionRules: (treatment.commissionRules ?? []).map((rule) => ({
      ...rule,
      role: rule.role ?? rule.recipient ?? "therapist",
      quantity: rule.quantity ?? 1,
      appliesTo: rule.appliesTo === "Non VIP" ? "Normal" : rule.appliesTo,
    })),
  };
}

function inputClass(extra = "") {
  return `min-h-11 w-full min-w-0 rounded-lg border border-[#ded2bf] bg-white px-3 text-base outline-none transition focus:border-[#0d4b3a] focus:ring-2 focus:ring-[#0d4b3a]/10 md:text-sm ${extra}`;
}

function StatCard({ label, value, tone = "emerald" }: { label: string; value: string; tone?: "emerald" | "gold" | "rose" }) {
  const toneClass =
    tone === "gold" ? "border-[#d8b65f]/40 bg-[#fff8e8]" : tone === "rose" ? "border-[#e6aaa0]/50 bg-[#fff2ef]" : "border-[#bdd8cb] bg-white";
  return (
    <div className={`min-w-0 rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-[#7a7265]">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-[#0d4b3a]">{value}</p>
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

  const clearAllData = async () => {
    if (!window.confirm("Yakin ingin mengosongkan semua data? Data treatment, produk, simulasi, log komisi, dan master bahan akan dihapus.")) return;
    const cleared = clearData();
    setData(cleared);
    setEditingTreatment(emptyTreatment());
    setEditingProduct(emptyProduct());
    setEditingConsumable(emptyConsumable());
    setEditingHppPackage(emptyHppPackage());
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
            {view === "fixed" && <FixedCostPage data={data} persist={persist} />}
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
              />
            )}
            {view === "consumables" && (
              <ConsumablesPage
                data={data}
                persist={persist}
                editingConsumable={editingConsumable}
                setEditingConsumable={setEditingConsumable}
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
            {view === "products" && <ProductPage data={data} persist={persist} editingProduct={editingProduct} setEditingProduct={setEditingProduct} />}
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

function FixedCostPage({ data, persist }: { data: StorageSchema; persist: (next: StorageSchema) => void }) {
  const settings = data.fixedCosts;
  const breakdown = fixedCostBreakdown(settings);
  const update = (key: keyof FixedCostSettings, value: number) => persist({ ...data, fixedCosts: { ...settings, [key]: value } });

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="HPP tanpa cicilan" value={rupiah(breakdown.totalWithoutInstallments)} />
        <StatCard label="Beban cicilan cashflow" value={rupiah(breakdown.installmentTotal)} tone="gold" />
        <StatCard label="Profit after overhead + cicilan" value={rupiah(breakdown.totalWithInstallments)} tone="gold" />
        <StatCard label="Fixed cost per customer" value={rupiah(breakdown.perCustomer)} />
      </div>
      <Card>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-[#0d4b3a]">Pengaturan Biaya Tetap Bulanan</h3>
          <Save className="h-5 w-5 shrink-0 text-[#b19042]" />
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fixedCostFields.map((field) => (
            <Field key={field.key} label={`${field.label}${field.installment ? " (cashflow, bukan direct HPP)" : ""}`} type="number" value={settings[field.key]} onChange={(value) => update(field.key, Number(value))} />
          ))}
          <Field label="Jumlah hari kerja / bulan" type="number" value={settings.workingDays} onChange={(value) => update("workingDays", Number(value))} />
          <Field label="Jam operasional / hari" type="number" value={settings.operatingHours} onChange={(value) => update("operatingHours", Number(value))} />
          <Field label="Estimasi customer / bulan" type="number" value={settings.averageCustomers} onChange={(value) => update("averageCustomers", Number(value))} />
        </div>
      </Card>
    </div>
  );
}

function TreatmentPage(props: {
  data: StorageSchema;
  persist: (next: StorageSchema) => void;
  editingTreatment: Treatment;
  setEditingTreatment: (treatment: Treatment) => void;
  openSimulation: (id: string) => void;
}) {
  const { data, persist, setEditingTreatment, openSimulation } = props;
  const editingTreatment = normalizeTreatmentForEdit(props.editingTreatment);
  const [priceMode, setPriceMode] = useState<PriceMode>("Normal");
  const defaultPrice = priceMode === "VIP" ? editingTreatment.vipPrice : priceMode === "Promo" ? editingTreatment.promoPrice : editingTreatment.nonVipPrice;
  const baseResult = treatmentResult(editingTreatment, data.fixedCosts, priceMode === "Manual" ? "Normal" : priceMode, defaultPrice);
  const sliderMax = Math.max(baseResult.recommendedPrice * 3, editingTreatment.nonVipPrice * 2, baseResult.totalCost + 100000);
  const [manualPrice, setManualPrice] = useState(0);
  const sellingPrice = priceMode === "Manual" ? manualPrice || Math.ceil(baseResult.recommendedPrice / 10000) * 10000 : defaultPrice;
  const liveResult = treatmentResult(editingTreatment, data.fixedCosts, priceMode === "Manual" ? "Normal" : priceMode, sellingPrice);

  useEffect(() => {
    if (manualPrice === 0 && baseResult.recommendedPrice > 0) setManualPrice(Math.ceil(baseResult.recommendedPrice / 10000) * 10000);
  }, [baseResult.recommendedPrice, manualPrice]);

  const updateTreatment = (next: Treatment) => setEditingTreatment({ ...next, disposableCosts: next.disposableItems ?? next.disposableCosts });
  const saveTreatment = () => {
    if (!editingTreatment.name.trim()) return;
    const synced = { ...editingTreatment, disposableCosts: editingTreatment.disposableItems ?? editingTreatment.disposableCosts };
    const exists = data.treatments.some((treatment) => treatment.id === synced.id);
    persist({ ...data, treatments: exists ? data.treatments.map((treatment) => (treatment.id === synced.id ? synced : treatment)) : [synced, ...data.treatments] });
    setEditingTreatment(emptyTreatment());
  };
  const deleteTreatment = (id: string) => {
    if (window.confirm("Hapus treatment ini?")) persist({ ...data, treatments: data.treatments.filter((item) => item.id !== id) });
  };

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
      <div className="grid min-w-0 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-[#0d4b3a]">Master Data Treatment</h3>
          <div className="mt-4 grid min-w-0 gap-4">
            <div className="grid min-w-0 gap-4 md:grid-cols-3">
              <Field label="Nama treatment" value={editingTreatment.name} onChange={(value) => updateTreatment({ ...editingTreatment, name: value })} />
              <Field label="Kategori treatment" value={editingTreatment.category} onChange={(value) => updateTreatment({ ...editingTreatment, category: value })} />
              <Field label="Durasi treatment (menit)" type="number" value={editingTreatment.durationMinutes} onChange={(value) => updateTreatment({ ...editingTreatment, durationMinutes: Number(value) })} />
            </div>

            <HppPackageInsertSection treatment={editingTreatment} updateTreatment={updateTreatment} packages={data.hppPackages ?? []} />
            <DynamicDisposableSection treatment={editingTreatment} updateTreatment={updateTreatment} />
            <DynamicConsumableUsageSection treatment={editingTreatment} updateTreatment={updateTreatment} consumables={data.consumables ?? []} />
            <DynamicMaterialSection treatment={editingTreatment} updateTreatment={updateTreatment} />
            <DynamicMachineSection treatment={editingTreatment} updateTreatment={updateTreatment} />

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

            <div className="grid min-w-0 gap-4 md:grid-cols-4">
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
          </div>
        </Card>

        <TreatmentTable data={data} deleteTreatment={deleteTreatment} editTreatment={(treatment) => setEditingTreatment(normalizeTreatmentForEdit(treatment))} openSimulation={openSimulation} />
      </div>

      <div className="min-w-0">
        <Card className="xl:sticky xl:top-6">
          <h3 className="text-lg font-semibold text-[#0d4b3a]">Simulasi Harga & Profit</h3>
          <div className="mt-4 grid min-w-0 gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Direct HPP" value={rupiah(liveResult.directHpp)} />
              <StatCard label="Overhead per treatment" value={rupiah(liveResult.overheadAllocated)} tone="gold" />
              <StatCard label="Total cost sebelum komisi" value={rupiah(liveResult.totalCost)} />
              <StatCard label="Recommended minimum price" value={rupiah(liveResult.totalCost)} />
              <StatCard label="Recommended price target margin" value={rupiah(liveResult.recommendedPrice)} tone="gold" />
              <StatCard label="Harga Normal / VIP / Promo" value={`${rupiah(editingTreatment.nonVipPrice)} / ${rupiah(editingTreatment.vipPrice)} / ${rupiah(editingTreatment.promoPrice)}`} />
            </div>

            <div className="rounded-lg border border-[#eadfce] bg-[#fffaf2] p-4">
              <div className="grid gap-3 md:grid-cols-2">
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

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Harga jual" value={rupiah(liveResult.sellingPrice)} />
              <StatCard label="HPP" value={rupiah(liveResult.totalCost)} />
              <StatCard label="Komisi" value={rupiah(liveResult.totalCommission)} tone="gold" />
              <StatCard label="Profit bersih" value={rupiah(liveResult.netProfit)} tone={liveResult.netProfit < 0 ? "rose" : "emerald"} />
              <StatCard label="Margin" value={percent(liveResult.marginPercent)} tone={liveResult.marginPercent < editingTreatment.targetMarginPercent ? "rose" : "emerald"} />
            </div>

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

function DynamicDisposableSection({ treatment, updateTreatment }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void }) {
  const items = treatment.disposableItems ?? treatment.disposableCosts ?? [];
  const updateItem = (id: string, patch: Partial<TreatmentCostItem>) => updateTreatment({ ...treatment, disposableItems: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0d4b3a]">Disposable Cost per Customer</p>
        <ActionButton variant="ghost" onClick={() => updateTreatment({ ...treatment, disposableItems: [...items, { id: generateId("cost"), name: "", amount: 0 }] })}>
          <Plus className="h-4 w-4" /> Tambah item disposable
        </ActionButton>
      </div>
      {items.map((item) => (
        <div key={item.id} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_160px_44px]">
          <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Nama item" className={inputClass()} />
          <input type="number" value={item.amount} onChange={(event) => updateItem(item.id, { amount: Number(event.target.value) })} placeholder="Biaya" className={inputClass()} />
          <button type="button" onClick={() => updateTreatment({ ...treatment, disposableItems: items.filter((row) => row.id !== item.id) })} className="min-h-10 rounded-lg border border-[#e1aaa0] text-[#a33a2d]">
            <Trash2 className="mx-auto h-4 w-4" />
          </button>
        </div>
      ))}
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

function DynamicMaterialSection({ treatment, updateTreatment }: { treatment: Treatment; updateTreatment: (treatment: Treatment) => void }) {
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
        <div key={item.id} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_90px_140px_140px_44px]">
          <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Nama material" className={inputClass()} />
          <input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} placeholder="Qty" className={inputClass()} />
          <input type="number" value={item.unitCost} onChange={(event) => updateItem(item.id, { unitCost: Number(event.target.value) })} placeholder="Unit cost" className={inputClass()} />
          <div className="flex min-h-10 items-center rounded-lg border border-[#eadfce] bg-[#fffaf2] px-3 text-sm font-semibold text-[#0d4b3a]">{rupiah(item.quantity * item.unitCost)}</div>
          <button type="button" onClick={() => updateTreatment({ ...treatment, materialItems: items.filter((row) => row.id !== item.id) })} className="min-h-10 rounded-lg border border-[#e1aaa0] text-[#a33a2d]">
            <Trash2 className="mx-auto h-4 w-4" />
          </button>
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
        <div key={item.id} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_44px]">
          <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Nama alat" className={inputClass()} />
          <input type="number" value={item.amount} onChange={(event) => updateItem(item.id, { amount: Number(event.target.value) })} placeholder="Biaya" className={inputClass()} />
          <input value={item.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} placeholder="Notes optional" className={inputClass()} />
          <button type="button" onClick={() => updateTreatment({ ...treatment, machineItems: items.filter((row) => row.id !== item.id) })} className="min-h-10 rounded-lg border border-[#e1aaa0] text-[#a33a2d]">
            <Trash2 className="mx-auto h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function CommissionEditor({ rules, onChange }: { rules: CommissionRule[]; onChange: (rules: CommissionRule[]) => void }) {
  const updateRule = (id: string, patch: Partial<CommissionRule>) => onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0d4b3a]">Aturan Komisi Treatment</p>
        <ActionButton variant="ghost" onClick={() => onChange([...rules, emptyRule()])}>
          <Plus className="h-4 w-4" /> Tambah penerima komisi
        </ActionButton>
      </div>
      {rules.map((rule) => (
        <div key={rule.id} className="grid min-w-0 gap-2 rounded-lg border border-[#eadfce] bg-white p-3">
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-3">
            <SelectField label="Role" value={rule.role} onChange={(value) => updateRule(rule.id, { role: value as StaffRole })}>
              {[...roles, "other" as StaffRole].map((role) => <option key={role}>{role}</option>)}
            </SelectField>
            <Field label="Nama staff optional" value={rule.staffName ?? ""} onChange={(value) => updateRule(rule.id, { staffName: value })} />
            <Field label="Jumlah orang" type="number" value={rule.quantity} onChange={(value) => updateRule(rule.id, { quantity: Math.max(Number(value), 1) })} />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-4">
            <SelectField label="Tipe komisi" value={rule.type} onChange={(value) => updateRule(rule.id, { type: value as CommissionType })}>
              {commissionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </SelectField>
            <Field label="Nilai komisi" type="number" value={rule.value} onChange={(value) => updateRule(rule.id, { value: Number(value) })} />
            <SelectField label="Berlaku untuk" value={rule.appliesTo} onChange={(value) => updateRule(rule.id, { appliesTo: value as CommissionAppliesTo })}>
              {appliesToOptions.map((type) => <option key={type}>{type}</option>)}
            </SelectField>
            <Field label="Catatan" value={rule.notes ?? ""} onChange={(value) => updateRule(rule.id, { notes: value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" onClick={() => onChange([...rules, { ...rule, id: generateId("comm") }])}><Copy className="h-4 w-4" /> Duplikasi</ActionButton>
            <ActionButton variant="danger" onClick={() => onChange(rules.filter((item) => item.id !== rule.id))}><Trash2 className="h-4 w-4" /> Hapus</ActionButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommissionBreakdown({ rules }: { rules: { rule: CommissionRule; amount: number }[] }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-[#eadfce]">
      <table className="w-full min-w-[680px] text-sm">
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
}: {
  data: StorageSchema;
  persist: (next: StorageSchema) => void;
  editingConsumable: ConsumableItem;
  setEditingConsumable: (item: ConsumableItem) => void;
}) {
  const draft = normalizeConsumable(editingConsumable);
  const lowStockCount = (data.consumables ?? []).filter((item) => item.minimumStock > 0 && item.availableQuantity <= item.minimumStock).length;
  const inventoryValue = (data.consumables ?? []).reduce((sum, item) => sum + item.availableQuantity * item.costPerSmallestUnit, 0);

  const saveConsumable = () => {
    if (!draft.name.trim()) return;
    const exists = data.consumables.some((item) => item.id === draft.id);
    persist({
      ...data,
      consumables: exists ? data.consumables.map((item) => (item.id === draft.id ? draft : item)) : [draft, ...data.consumables],
    });
    setEditingConsumable(emptyConsumable());
  };
  const deleteConsumable = (id: string) => {
    if (window.confirm("Hapus bahan ini dari master?")) persist({ ...data, consumables: data.consumables.filter((item) => item.id !== id) });
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      <Card>
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Master Bahan</h3>
        <p className="mt-2 text-sm leading-6 text-[#756b5d]">
          Contoh: Sabun 1 liter = 1000 ml. Jika 1 pasien memakai 5 ml, sistem otomatis menghitung HPP per pasien.
        </p>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama bahan" value={draft.name} onChange={(value) => setEditingConsumable({ ...draft, name: value })} />
            <SelectField label="Kategori" value={draft.category} onChange={(value) => setEditingConsumable({ ...draft, category: value as ConsumableCategory })}>
              {consumableCategories.map((category) => <option key={category}>{category}</option>)}
            </SelectField>
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
            <Field label="Notes" value={draft.notes ?? ""} onChange={(value) => setEditingConsumable({ ...draft, notes: value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Biaya per unit" value={rupiah(draft.costPerSmallestUnit)} />
            <StatCard label="Stok tersedia" value={`${draft.availableQuantity} ${draft.smallestUnit}`} />
            <StatCard label="Nilai stok" value={rupiah(draft.availableQuantity * draft.costPerSmallestUnit)} tone="gold" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={saveConsumable}><Save className="h-4 w-4" /> Simpan bahan</ActionButton>
            <ActionButton variant="ghost" onClick={() => setEditingConsumable(emptyConsumable())}><Plus className="h-4 w-4" /> Baru</ActionButton>
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Jumlah master bahan" value={`${data.consumables.length} bahan`} />
          <StatCard label="Bahan low stock" value={`${lowStockCount} bahan`} tone={lowStockCount ? "rose" : "emerald"} />
          <StatCard label="Estimasi nilai stok bahan" value={rupiah(inventoryValue)} tone="gold" />
        </div>
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-[#0d4b3a]">Daftar Master Bahan</h3>
            <ActionButton variant="secondary" onClick={() => consumableStockReport(data.consumables)}><FileDown className="h-4 w-4" /> PDF</ActionButton>
          </div>
          {data.consumables.length === 0 ? <EmptyState text="Belum ada master bahan." /> : (
            <>
              <div className="grid gap-3 md:hidden">
                {data.consumables.map((item) => {
                  const low = item.minimumStock > 0 && item.availableQuantity <= item.minimumStock;
                  return (
                    <div key={`cons-mobile-${item.id}`} className="rounded-lg border border-[#eadfce] bg-[#fffaf2] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0d4b3a]">{item.name}</p>
                          <p className="text-xs text-[#7a7265]">{item.category} - {item.supplier || "Tanpa supplier"}</p>
                        </div>
                        {low && <span className="rounded-full bg-[#fff2ef] px-2 py-1 text-xs font-semibold text-[#a33a2d]">Low stock</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <MiniMetric label="Harga beli" value={rupiah(item.purchasePrice)} />
                        <MiniMetric label="Isi" value={`${item.totalSmallestUnit} ${item.smallestUnit}`} />
                        <MiniMetric label="Biaya per unit" value={rupiah(item.costPerSmallestUnit)} />
                        <MiniMetric label="Stok tersedia" value={`${item.availableQuantity} ${item.smallestUnit}`} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <ActionButton variant="ghost" onClick={() => setEditingConsumable(item)}>Edit</ActionButton>
                        <ActionButton variant="danger" onClick={() => deleteConsumable(item.id)}><Trash2 className="h-4 w-4" /></ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden max-w-full overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-[#f7efdf] text-left text-[#0d4b3a]">
                    <tr>{["Nama bahan", "Harga beli", "Isi", "Unit terkecil", "Biaya/unit", "Stok tersedia", "Low stock", "Aksi"].map((head) => <th key={head} className="p-3">{head}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.consumables.map((item) => {
                      const low = item.minimumStock > 0 && item.availableQuantity <= item.minimumStock;
                      return (
                        <tr key={item.id} className="border-b border-[#efe4d2]">
                          <td className="p-3"><p className="font-semibold text-[#0d4b3a]">{item.name}</p><p className="text-xs text-[#7a7265]">{item.supplier || "-"}</p></td>
                          <td className="p-3">{rupiah(item.purchasePrice)}</td>
                          <td className="p-3">{item.totalSmallestUnit} {item.smallestUnit}</td>
                          <td className="p-3">{item.smallestUnit}</td>
                          <td className="p-3">{rupiah(item.costPerSmallestUnit)}</td>
                          <td className="p-3">{item.availableQuantity} {item.smallestUnit}</td>
                          <td className="p-3">{low ? "Low stock" : "Aman"}</td>
                          <td className="p-3"><div className="flex gap-2"><ActionButton variant="ghost" onClick={() => setEditingConsumable(item)}>Edit</ActionButton><ActionButton variant="danger" onClick={() => deleteConsumable(item.id)}><Trash2 className="h-4 w-4" /></ActionButton></div></td>
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
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_100px_130px_130px_44px]">
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
              <button type="button" onClick={() => updateItems(pkg.items.filter((row) => row.id !== item.id))} className="min-h-11 rounded-lg border border-[#e1aaa0] text-[#a33a2d]"><Trash2 className="mx-auto h-4 w-4" /></button>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_130px_minmax(0,1fr)_44px]">
              <input value={item.manualName ?? ""} onChange={(event) => updateItem(item.id, { manualName: event.target.value, consumableName: event.target.value })} className={inputClass()} placeholder="Nama item manual" />
              <input type="number" value={item.manualCost ?? 0} onChange={(event) => updateItem(item.id, { manualCost: Number(event.target.value), totalCost: Number(event.target.value) })} className={inputClass()} placeholder="Default cost" />
              <select value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value as ConsumableUnit })} className={inputClass()}>{consumableUnits.map((unit) => <option key={unit}>{unit}</option>)}</select>
              <input value={item.notes ?? ""} onChange={(event) => updateItem(item.id, { notes: event.target.value })} className={inputClass()} placeholder="Notes optional" />
              <button type="button" onClick={() => updateItems(pkg.items.filter((row) => row.id !== item.id))} className="min-h-11 rounded-lg border border-[#e1aaa0] text-[#a33a2d]"><Trash2 className="mx-auto h-4 w-4" /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductPage({ data, persist, editingProduct, setEditingProduct }: { data: StorageSchema; persist: (next: StorageSchema) => void; editingProduct: Product; setEditingProduct: (product: Product) => void }) {
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
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
      <Card>
        <h3 className="text-lg font-semibold text-[#0d4b3a]">Produk / Retail</h3>
        <div className="mt-4 grid min-w-0 gap-4">
          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            <Field label="Nama produk" value={productDraft.name} onChange={(value) => setEditingProduct({ ...productDraft, name: value })} />
            <Field label="Kategori" value={productDraft.category} onChange={(value) => setEditingProduct({ ...productDraft, category: value })} />
            <Field label="Supplier" value={productDraft.supplier} onChange={(value) => setEditingProduct({ ...productDraft, supplier: value })} />
          </div>
          <div className="grid min-w-0 gap-3 rounded-lg border border-[#eadfce] bg-[#fffaf2] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#0d4b3a]">Buying tier</p>
              <ActionButton variant="ghost" onClick={() => setEditingProduct({ ...productDraft, buyingTiers: [...productDraft.buyingTiers, { id: generateId("tier"), quantity: 20, unitCost: 0 }] })}>
                <Plus className="h-4 w-4" /> Custom tier
              </ActionButton>
            </div>
            {productDraft.buyingTiers.map((tier) => (
              <div key={tier.id} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[120px_minmax(0,1fr)_80px_44px]">
                <input type="number" value={tier.quantity} onChange={(event) => setEditingProduct({ ...productDraft, buyingTiers: productDraft.buyingTiers.map((item) => item.id === tier.id ? { ...item, quantity: Number(event.target.value) } : item) })} className={inputClass()} />
                <input type="number" value={tier.unitCost} onChange={(event) => setEditingProduct({ ...productDraft, buyingTiers: productDraft.buyingTiers.map((item) => item.id === tier.id ? { ...item, unitCost: Number(event.target.value) } : item) })} className={inputClass()} />
                <label className="flex items-center justify-center gap-2 rounded-lg border border-[#ded2bf] bg-white text-sm"><input type="radio" checked={productDraft.selectedTierId === tier.id} onChange={() => setEditingProduct({ ...productDraft, selectedTierId: tier.id })} /> Pakai</label>
                <button type="button" onClick={() => setEditingProduct({ ...productDraft, buyingTiers: productDraft.buyingTiers.filter((item) => item.id !== tier.id) })} className="min-h-10 rounded-lg border border-[#e1aaa0] text-[#a33a2d]"><Trash2 className="mx-auto h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-4">
            <Field label="Harga Normal / Non-VIP" type="number" value={productDraft.normalPrice} onChange={(value) => setEditingProduct({ ...productDraft, normalPrice: Number(value) })} />
            <Field label="Harga VIP" type="number" value={productDraft.vipPrice} onChange={(value) => setEditingProduct({ ...productDraft, vipPrice: Number(value) })} />
            <Field label="Harga Promo" type="number" value={productDraft.promoPrice} onChange={(value) => setEditingProduct({ ...productDraft, promoPrice: Number(value) })} />
            <Field label="Stok optional" type="number" value={productDraft.stockQuantity ?? 0} onChange={(value) => setEditingProduct({ ...productDraft, stockQuantity: Number(value) })} />
          </div>
          <CommissionEditor rules={productDraft.commissionRules ?? []} onChange={(rules) => setEditingProduct({ ...productDraft, commissionRules: rules, commissionRule: rules[0] ?? productDraft.commissionRule })} />
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={saveProduct}><Save className="h-4 w-4" /> Simpan produk</ActionButton>
            <ActionButton variant="ghost" onClick={() => setEditingProduct(emptyProduct())}><Plus className="h-4 w-4" /> Baru</ActionButton>
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-[#0d4b3a]">Simulasi Produk</h3>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="Tier harga" value={productMode} onChange={(value) => setProductMode(value as PriceMode)}>
                {["Normal", "VIP", "Promo", "Manual"].map((mode) => <option key={mode}>{mode}</option>)}
              </SelectField>
              <Field label="Harga jual manual" type="number" value={productSellingPrice} onChange={(value) => setProductManualPrice(Number(value))} />
              <Field label="Quantity sold" type="number" value={quantitySold} onChange={(value) => setQuantitySold(Math.max(Number(value), 1))} />
              <StatCard label="Modal tier dipakai" value={`Buy ${selectedTier(productDraft)?.quantity ?? 1}: ${rupiah(productLive.unitCost)}`} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ActionButton variant="ghost" onClick={() => setEditingProduct(product)}>Edit</ActionButton>
                <ActionButton variant="danger" onClick={() => window.confirm("Hapus produk ini?") && persist({ ...data, products: data.products.filter((item) => item.id !== product.id) })}><Trash2 className="h-4 w-4" /></ActionButton>
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
                  <td className="p-3"><div className="flex gap-2"><ActionButton variant="ghost" onClick={() => setEditingProduct(product)}>Edit</ActionButton><ActionButton variant="danger" onClick={() => window.confirm("Hapus produk ini?") && persist({ ...data, products: data.products.filter((item) => item.id !== product.id) })}><Trash2 className="h-4 w-4" /></ActionButton></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
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

function ReportsPage({ data, selectedSimulationId }: { data: StorageSchema; selectedSimulationId: string }) {
  const selectedSimulation = data.simulations.find((item) => item.id === selectedSimulationId) ?? data.simulations[0];
  const reports = [
    { title: "Treatment HPP Report", body: "Ringkasan direct HPP, overhead durasi, harga rekomendasi, profit dan margin.", action: () => treatmentHppReport(data.treatments, data.fixedCosts) },
    { title: "Price Simulation Report", body: "PDF dari simulasi harga terakhir atau simulasi yang dipilih.", action: () => selectedSimulation && simulationReport(selectedSimulation) },
    { title: "Commission Report by date range", body: "Log komisi lengkap dengan total sales, total komisi, status pembayaran, dan net profit.", action: () => commissionReport(data.commissionLogs, "Semua tanggal") },
    { title: "Product Profit Report", body: "Profit produk retail berdasarkan tier modal, harga normal, VIP, promo, dan komisi.", action: () => productProfitReport(data.products) },
    { title: "Master Bahan & Stok", body: "Daftar bahan internal, biaya per unit terkecil, stok tersedia, nilai stok, dan low stock.", action: () => consumableStockReport(data.consumables) },
    { title: "Master Paket HPP", body: "Template paket bahan treatment, item list, qty, unit, dan total HPP paket.", action: () => hppPackageReport(data.hppPackages) },
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
