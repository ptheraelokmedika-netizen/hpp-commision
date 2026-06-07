import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { acElectricityCost, deviceElectricityCost, fixedCostBreakdown, fixedCostTotals, productResult, rupiah, staffCostTotal, treatmentResult } from "./calculations";
import type { CommissionLog, ConsumableItem, FixedCostSettings, HppPackageTemplate, Product, SimulationRecord, Treatment } from "./types";

function title(doc: jsPDF, reportTitle: string, notes?: string) {
  doc.setFillColor(13, 75, 58);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 249, 238);
  doc.setFontSize(16);
  doc.text("Hera Clinic", 14, 13);
  doc.setFontSize(10);
  doc.text(reportTitle, 14, 21);
  doc.setTextColor(46, 45, 40);
  doc.setFontSize(9);
  doc.text(`Tanggal laporan: ${new Date().toLocaleDateString("id-ID")}`, 14, 38);
  if (notes) doc.text(`Catatan: ${notes}`, 14, 44);
}

function save(doc: jsPDF, name: string) {
  doc.save(`${name}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function treatmentHppReport(treatments: Treatment[], settings: FixedCostSettings) {
  const doc = new jsPDF();
  title(doc, "Treatment HPP Report");
  autoTable(doc, {
    startY: 48,
    head: [["Treatment", "Kategori", "HPP", "Overhead", "Harga Rekomendasi", "Profit Non VIP", "Margin"]],
    body: treatments.map((treatment) => {
      const result = treatmentResult(treatment, settings, "Non VIP");
      return [
        treatment.name,
        treatment.category,
        rupiah(result.directHpp),
        rupiah(result.overheadAllocated),
        rupiah(result.recommendedPrice),
        rupiah(result.netProfit),
        `${result.marginPercent.toFixed(1)}%`,
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 75, 58] },
  });
  const detailRows = treatments.flatMap((treatment) => {
    const rows: (string | number)[][] = [];
    (treatment.disposableItems ?? treatment.disposableCosts ?? []).forEach((item) => rows.push([treatment.name, "Disposable manual", item.name, "-", "-", rupiah(item.amount), item.notes ?? ""]));
    (treatment.consumableUsages ?? []).forEach((item) => rows.push([treatment.name, "Master Bahan", item.name, item.quantityUsed, item.unit, rupiah(item.quantityUsed * item.costPerUnit), item.sourcePackageName ? `Dari paket: ${item.sourcePackageName}` : item.notes ?? ""]));
    (treatment.materialItems ?? []).forEach((item) => rows.push([treatment.name, "Material", item.name, item.quantity, "-", rupiah(item.quantity * item.unitCost), item.notes ?? ""]));
    (treatment.machineItems ?? []).forEach((item) => rows.push([treatment.name, "Biaya alat / mesin", item.name, "-", "-", rupiah(item.amount), item.notes ?? ""]));
    (treatment.deviceElectricityCosts ?? []).forEach((item) => rows.push([treatment.name, "Device electricity", item.deviceName, item.durationMinutes, "menit", rupiah(item.costPerTreatment), item.includeInHpp ? "Masuk HPP" : "Tidak masuk HPP"]));
    (treatment.shotCartridgeCosts ?? []).forEach((item) => rows.push([treatment.name, "Shot / cartridge", item.cartridgeName, item.usedPerTreatment, item.unit, rupiah(item.costPerTreatment), item.includeInHpp ? "Masuk HPP" : "Tidak masuk HPP"]));
    (treatment.staffFeeCosts ?? []).forEach((item) => rows.push([treatment.name, "Staff fee", item.role, "-", item.type, rupiah(item.total), item.includeInHpp ? "Masuk HPP" : "Tidak masuk HPP"]));
    return rows;
  });
  if (detailRows.length > 0) {
    autoTable(doc, {
      startY: 110,
      head: [["Treatment", "Section", "Item", "Qty", "Unit", "Total HPP", "Notes"]],
      body: detailRows,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [177, 144, 66] },
    });
  }
  save(doc, "hera-treatment-hpp");
}

export function simulationReport(record: SimulationRecord) {
  const doc = new jsPDF();
  title(doc, "Price Simulation Report", record.notes);
  autoTable(doc, {
    startY: 50,
    head: [["Item", "Customer", "Harga", "Qty", "Total HPP", "Komisi", "Net Profit", "Margin"]],
    body: [
      [
        record.itemName,
        record.customerType,
        rupiah(record.sellingPrice),
        record.quantity,
        rupiah(record.totalCost),
        rupiah(record.totalCommission),
        rupiah(record.netProfit),
        `${record.marginPercent.toFixed(1)}%`,
      ],
    ],
    headStyles: { fillColor: [13, 75, 58] },
  });
  save(doc, "hera-simulasi-harga");
}

export function commissionReport(logs: CommissionLog[], notes?: string) {
  const doc = new jsPDF();
  title(doc, "Commission Report", notes);
  const sales = logs.reduce((sum, log) => sum + log.sellingPrice * log.quantity, 0);
  const commission = logs.reduce((sum, log) => sum + log.commissionAmount, 0);
  const netProfit = logs.reduce((sum, log) => sum + log.netProfit, 0);
  doc.text(`Total sales: ${rupiah(sales)}   Total komisi: ${rupiah(commission)}   Net profit: ${rupiah(netProfit)}`, 14, 48);
  autoTable(doc, {
    startY: 56,
    head: [["Tanggal", "Customer", "Item", "Staff", "Role", "Harga", "Qty", "Komisi", "Status"]],
    body: logs.map((log) => [
      log.date,
      log.customerName,
      log.itemName,
      log.staffName,
      log.staffRole,
      rupiah(log.sellingPrice),
      log.quantity,
      rupiah(log.commissionAmount),
      log.paymentStatus,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 75, 58] },
  });
  save(doc, "hera-komisi");
}

export function productProfitReport(products: Product[]) {
  const doc = new jsPDF();
  title(doc, "Product Profit Report");
  autoTable(doc, {
    startY: 48,
    head: [["Produk", "Kategori", "Supplier", "Modal", "Harga Normal", "Profit", "Komisi", "Margin"]],
    body: products.map((product) => {
      const result = productResult(product, "Non VIP");
      return [
        product.name,
        product.category,
        product.supplier,
        rupiah(result.unitCost),
        rupiah(result.sellingPrice),
        rupiah(result.netProfit),
        rupiah(result.totalCommission),
        `${result.marginPercent.toFixed(1)}%`,
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 75, 58] },
  });
  save(doc, "hera-produk-profit");
}

export function consumableStockReport(consumables: ConsumableItem[]) {
  const doc = new jsPDF();
  title(doc, "Master Bahan & Stok");
  autoTable(doc, {
    startY: 48,
    head: [["Nama bahan", "Supplier", "Harga beli", "Unit terkecil", "Biaya/unit", "Stok tersedia", "Nilai stok", "Status"]],
    body: consumables.map((item) => {
      const stockValue = item.availableQuantity * item.costPerSmallestUnit;
      const low = item.minimumStock > 0 && item.availableQuantity <= item.minimumStock;
      return [
        item.name,
        item.supplier ?? "-",
        rupiah(item.purchasePrice),
        item.smallestUnit,
        rupiah(item.costPerSmallestUnit),
        `${item.availableQuantity} ${item.smallestUnit}`,
        rupiah(stockValue),
        low ? "Low stock" : "Aman",
      ];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 75, 58] },
  });
  save(doc, "hera-master-bahan-stok");
}

export function hppPackageReport(packages: HppPackageTemplate[]) {
  const doc = new jsPDF();
  title(doc, "Master Paket HPP");
  autoTable(doc, {
    startY: 48,
    head: [["Nama paket", "Kategori", "Item", "Qty", "Unit", "Cost/unit", "Total", "Notes"]],
    body: packages.flatMap((pkg) =>
      pkg.items.map((item) => [
        pkg.name,
        pkg.category,
        item.mode === "master" ? item.consumableName : item.manualName ?? item.consumableName,
        item.qtyDefault,
        item.unit,
        rupiah(item.costPerUnit),
        rupiah(item.totalCost),
        item.notes ?? pkg.description ?? "-",
      ]),
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 75, 58] },
  });
  save(doc, "hera-master-paket-hpp");
}

export function fixedCostReport(settings: FixedCostSettings) {
  const doc = new jsPDF();
  const breakdown = fixedCostBreakdown(settings);
  const totals = fixedCostTotals(settings);
  title(doc, "Fixed Cost & Electricity Report");
  autoTable(doc, {
    startY: 48,
    head: [["Ringkasan", "Nilai"]],
    body: [
      ["Fixed cost included in HPP", rupiah(breakdown.totalWithoutInstallments)],
      ["Cashflow-only cost", rupiah(breakdown.cashflowOnlyTotal)],
      ["Excluded cost", rupiah(breakdown.excludedTotal)],
      ["Staff salary total", rupiah(totals.payrollTotal)],
      ["AC monthly cost", rupiah(totals.electricity.acMonthly)],
      ["Device monthly cost", rupiah(totals.electricity.deviceMonthly)],
      ["Total electricity estimate", rupiah(totals.electricity.totalMonthly)],
      ["Estimated customer/month", `${settings.averageCustomers}`],
      ["Operational days", `${settings.workingDays}`],
      ["Working hours/day", `${settings.operatingHours}`],
    ],
    headStyles: { fillColor: [13, 75, 58] },
  });
  autoTable(doc, {
    startY: 115,
    head: [["Role", "Jumlah", "Gaji/orang", "Tunjangan/orang", "Mode", "Total"]],
    body: (settings.staffCosts ?? []).map((staff) => [
      staff.role,
      staff.count,
      rupiah(staff.salaryPerPerson),
      rupiah(staff.allowancePerPerson),
      staff.mode,
      rupiah(staffCostTotal(staff)),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 75, 58] },
  });
  autoTable(doc, {
    startY: 170,
    head: [["Alat", "kWh/use", "Rp/use", "Rp/month", "Linked treatment"]],
    body: (settings.electricitySettings?.devices ?? []).map((device) => {
      const cost = deviceElectricityCost(device);
      return [device.name, cost.kwhPerUse.toFixed(3), rupiah(cost.costPerUse), rupiah(cost.monthlyCost), device.linkedTreatmentId ?? "-"];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 75, 58] },
  });
  autoTable(doc, {
    startY: 220,
    head: [["AC", "Mode", "kWh/month", "Rp/month"]],
    body: (settings.electricitySettings?.acItems ?? []).map((ac) => {
      const cost = acElectricityCost(ac);
      return [ac.name, ac.mode, cost.monthlyKwh.toFixed(2), rupiah(cost.monthlyCost)];
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 75, 58] },
  });
  save(doc, "hera-fixed-cost-electricity");
}
