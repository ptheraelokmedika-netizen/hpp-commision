import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { productResult, rupiah, treatmentResult } from "./calculations";
import type { CommissionLog, FixedCostSettings, Product, SimulationRecord, Treatment } from "./types";

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
