import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { acElectricityCost, deviceElectricityCost, fixedCostBreakdown, fixedCostTotals, productResult, rupiah, staffCostTotal, treatmentResult } from "./calculations";
import type { CommissionLog, ConsumableItem, FixedCostSettings, HppPackageTemplate, Product, SimulationRecord, StockOpname, StockOpnameItem, Treatment } from "./types";

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

export function formatCurrency(value: number) {
  return rupiah(value || 0);
}

export function formatDate(value?: string | Date) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID");
}

export function safeText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function addPdfHeader(doc: jsPDF, reportTitle: string, orientation: "portrait" | "landscape" = "portrait", lines: string[] = []) {
  const width = orientation === "landscape" ? 297 : 210;
  doc.setTextColor(13, 75, 58);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("HERA CLINIC", 12, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("HPP & Commission Calculator", 12, 18);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(reportTitle, 12, 28);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(46, 45, 40);
  doc.text(`Generated date: ${formatDate()}`, 12, 34);
  lines.forEach((line, index) => doc.text(line, 12, 40 + index * 5));
  doc.setDrawColor(216, 182, 95);
  doc.line(12, 22, width - 12, 22);
}

function addPageNumber(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(110, 105, 96);
    doc.text(`Page ${page} of ${pageCount}`, width - 28, height - 8);
  }
}

function addPdfFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const height = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(110, 105, 96);
    doc.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 12, height - 8);
  }
  addPageNumber(doc);
}

function stockStatus(item: ConsumableItem) {
  const stock = Number(item.currentStock ?? item.availableQuantity ?? 0);
  if (stock <= 0) return "Habis";
  if ((item.minimumStock ?? 0) > 0 && stock <= item.minimumStock) return "Low Stock";
  return "Aman";
}

function masterBahanRows(materials: ConsumableItem[], blankRows = 0) {
  const rows = materials.map((item, index) => [
    index + 1,
    safeText(item.name),
    safeText(item.category),
    safeText(item.supplier),
    formatCurrency(item.purchasePrice),
    `${item.purchaseQuantity} ${item.purchaseUnit} / ${item.totalSmallestUnit} ${item.smallestUnit}`,
    safeText(item.stockUnit ?? item.smallestUnit),
    formatCurrency(item.costPerSmallestUnit),
    `${item.currentStock ?? item.availableQuantity ?? 0}`,
    `${item.minimumStock ?? 0}`,
    "",
    "",
    "",
  ]);
  if (rows.length === 0) {
    return Array.from({ length: blankRows }, (_, index) => [index + 1, "", "", "", "", "", "", "", "", "", "", "", ""]);
  }
  return rows;
}

export function exportMasterBahanPdf(materials: ConsumableItem[]) {
  if (materials.length === 0) {
    exportBlankStockOpnamePdf(materials);
    return;
  }
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const lowStock = materials.filter((item) => stockStatus(item) === "Low Stock").length;
  const emptyStock = materials.filter((item) => stockStatus(item) === "Habis").length;
  const inventoryValue = materials.reduce((sum, item) => sum + Number(item.currentStock ?? item.availableQuantity ?? 0) * item.costPerSmallestUnit, 0);
  addPdfHeader(doc, "DAFTAR MASTER BAHAN & STOK", "landscape", ["Report: Daftar Master Bahan & Stok"]);
  autoTable(doc, {
    startY: 45,
    body: [[
      `Jumlah master bahan: ${materials.length}`,
      `Bahan low stock: ${lowStock}`,
      `Bahan habis: ${emptyStock}`,
      `Estimasi nilai stok: ${formatCurrency(inventoryValue)}`,
    ]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, textColor: [46, 45, 40] },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { fontStyle: "bold" }, 2: { fontStyle: "bold" }, 3: { fontStyle: "bold" } },
  });
  autoTable(doc, {
    startY: ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 55) + 5,
    head: [["No", "Nama bahan", "Kategori", "Supplier", "Harga beli", "Isi pembelian", "Unit terkecil", "Biaya/unit", "Stok sistem", "Stok minimum", "Stok fisik", "Selisih", "Catatan"]],
    body: masterBahanRows(materials),
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.6, overflow: "linebreak", valign: "middle", lineColor: [190, 184, 174], lineWidth: 0.1 },
    headStyles: { fillColor: [241, 234, 220], textColor: [13, 75, 58], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [253, 250, 244] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      4: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { cellWidth: 18 },
      11: { cellWidth: 16 },
      12: { cellWidth: 26 },
    },
  });
  addPdfFooter(doc);
  doc.save(`master-bahan-stok-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportBlankStockOpnamePdf(materials: ConsumableItem[] = []) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  addPdfHeader(doc, "FORMAT STOCK OPNAME BAHAN", "landscape", [
    "Tanggal cek: ____________________",
    "Petugas cek: ____________________    Lokasi: ____________________",
  ]);
  const rows = materials.length
    ? materials.map((item, index) => [
        index + 1,
        item.name,
        item.category,
        item.supplier ?? "-",
        item.stockUnit ?? item.smallestUnit,
        `${item.currentStock ?? item.availableQuantity ?? 0}`,
        "",
        "",
        "",
      ])
    : Array.from({ length: 20 }, (_, index) => [index + 1, "", "", "", "", "", "", "", ""]);
  autoTable(doc, {
    startY: 52,
    head: [["No", "Nama bahan", "Kategori", "Supplier", "Satuan", "Stok sistem", "Stok fisik", "Selisih", "Catatan"]],
    body: rows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.2, minCellHeight: 8, overflow: "linebreak", valign: "middle", lineColor: [160, 160, 160], lineWidth: 0.1 },
    headStyles: { fillColor: [241, 234, 220], textColor: [13, 75, 58], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      6: { cellWidth: 24 },
      7: { cellWidth: 22 },
      8: { cellWidth: 44 },
    },
  });
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 170;
  doc.setFontSize(9);
  doc.text("Diperiksa oleh: ____________________", 20, Math.min(finalY + 18, 195));
  doc.text("Disetujui oleh: ____________________", 160, Math.min(finalY + 18, 195));
  addPdfFooter(doc);
  doc.save(`format-stock-opname-kosong-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportStockOpnameResultPdf(opname: StockOpname, materials: ConsumableItem[] = []) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  addPdfHeader(doc, "HASIL STOCK OPNAME", "landscape", [
    `Tanggal: ${safeText(opname.date)}    Petugas: ${safeText(opname.checkedBy)}    Lokasi: ${safeText(opname.location)}    Status: ${safeText(opname.status)}`,
  ]);
  const count = (status: StockOpnameItem["status"]) => opname.items.filter((item) => item.status === status).length;
  const valueDiff = opname.items.reduce((sum, item) => {
    const material = materials.find((candidate) => candidate.id === item.materialId);
    return sum + (item.difference || 0) * (material?.costPerSmallestUnit ?? 0);
  }, 0);
  autoTable(doc, {
    startY: 45,
    body: [[
      `Total item: ${opname.items.length}`,
      `Sesuai: ${count("Sesuai")}`,
      `Selisih kurang: ${count("Selisih kurang")}`,
      `Selisih lebih: ${count("Selisih lebih")}`,
      `Belum diisi: ${count("Belum diisi")}`,
      `Estimasi nilai selisih: ${formatCurrency(valueDiff)}`,
    ]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
  });
  autoTable(doc, {
    startY: ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 55) + 5,
    head: [["No", "Nama bahan", "Kategori", "Stok sistem", "Stok fisik", "Selisih", "Unit", "Status", "Catatan"]],
    body: opname.items.map((item, index) => [
      index + 1,
      item.materialNameSnapshot,
      item.categorySnapshot,
      item.systemStock,
      item.physicalStock ?? "",
      item.physicalStock == null ? "" : item.difference,
      item.unit,
      item.status,
      item.notes ?? "",
    ]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak", valign: "middle", lineColor: [190, 184, 174], lineWidth: 0.1 },
    headStyles: { fillColor: [241, 234, 220], textColor: [13, 75, 58], fontStyle: "bold" },
  });
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 170;
  doc.setFontSize(9);
  doc.text("Checked by: ____________________", 20, Math.min(finalY + 18, 195));
  doc.text("Supervisor/Admin: ____________________", 160, Math.min(finalY + 18, 195));
  addPdfFooter(doc);
  doc.save(`hasil-stock-opname-${new Date().toISOString().slice(0, 10)}.pdf`);
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
  exportMasterBahanPdf(consumables);
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
