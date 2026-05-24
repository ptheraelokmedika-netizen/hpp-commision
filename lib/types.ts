export type StaffRole = "dokter" | "therapist" | "beautician" | "sales" | "admin" | "other";
export type CustomerType = "Normal" | "Non VIP" | "VIP" | "Promo";
export type CommissionAppliesTo = "Normal" | "Non VIP" | "VIP" | "Promo" | "All";
export type CommissionType = "fixed" | "sellingPercentage" | "grossProfitPercentage" | "netBeforeCommissionPercentage" | "profitPercentage";
export type PaymentStatus = "Belum dibayar" | "Sudah dibayar";

export type FixedCostSettings = {
  listrik: number;
  air: number;
  internetTelepon: number;
  sewaTempat: number;
  gajiDokter: number;
  gajiTherapist: number;
  gajiBeautician: number;
  gajiAdmin: number;
  bpjsTunjangan: number;
  cleaningLaundry: number;
  maintenanceAlat: number;
  marketing: number;
  softwareSubscription: number;
  cicilanAlat: number;
  cicilanRenovasi: number;
  cicilanLain: number;
  biayaTetapLain: number;
  workingDays: number;
  operatingHours: number;
  averageCustomers: number;
};

export type TreatmentCostItem = {
  id: string;
  name: string;
  amount: number;
};

export type TreatmentMaterialItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
};

export type TreatmentMachineItem = {
  id: string;
  name: string;
  amount: number;
  notes?: string;
};

export type CommissionRule = {
  id: string;
  role: StaffRole;
  staffName?: string;
  quantity: number;
  type: CommissionType;
  value: number;
  appliesTo: CommissionAppliesTo;
  notes?: string;
  recipient?: StaffRole;
};

export type Treatment = {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  disposableCosts: TreatmentCostItem[];
  disposableItems?: TreatmentCostItem[];
  materialItems: TreatmentMaterialItem[];
  machineItems: TreatmentMachineItem[];
  productMaterialCost: number;
  machineCostAllocation: number;
  staffInvolved: StaffRole[];
  nonVipPrice: number;
  vipPrice: number;
  promoPrice: number;
  targetMarginPercent: number;
  commissionRules: CommissionRule[];
  notes?: string;
};

export type ProductBuyingTier = {
  id: string;
  quantity: number;
  unitCost: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  supplier: string;
  buyingTiers: ProductBuyingTier[];
  selectedTierId: string;
  normalPrice: number;
  vipPrice: number;
  promoPrice: number;
  commissionRule: Omit<CommissionRule, "appliesTo">;
  commissionRules?: CommissionRule[];
  stockQuantity?: number;
};

export type SimulationRecord = {
  id: string;
  date: string;
  itemType: "treatment" | "product";
  itemId: string;
  itemName: string;
  customerType: CustomerType;
  sellingPrice: number;
  quantity: number;
  staffName: string;
  staffRole: StaffRole;
  commissionMode: "default" | "manual";
  manualCommission?: number;
  directHpp: number;
  overheadAllocated: number;
  totalCost: number;
  grossProfit: number;
  totalCommission: number;
  netProfit: number;
  marginPercent: number;
  notes?: string;
};

export type CommissionLog = {
  id: string;
  date: string;
  customerName: string;
  itemName: string;
  itemType: "Treatment" | "Produk";
  customerType: CustomerType;
  sellingPrice: number;
  quantity: number;
  staffName: string;
  staffRole: StaffRole;
  commissionAmount: number;
  netProfit: number;
  paymentStatus: PaymentStatus;
  notes?: string;
};

export type StorageSchema = {
  fixedCosts: FixedCostSettings;
  treatments: Treatment[];
  products: Product[];
  simulations: SimulationRecord[];
  commissionLogs: CommissionLog[];
};
