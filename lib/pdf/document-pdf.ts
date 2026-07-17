import "server-only";
import PDFDocument from "pdfkit";
import { SwissQRBill } from "swissqrbill/pdf";
import { calculateQRReferenceChecksum, isIBANValid, isQRIBAN } from "swissqrbill/utils";

import { computeTotals } from "@/lib/totals";
import { formatAmountPlain } from "@/lib/money";

const M = 50;

export type PdfInput = {
  kind: "FAC" | "DEV";
  number: string;
  issueDate: Date;
  dueDate?: Date | null;
  validUntil?: Date | null;
  currency: "CHF" | "EUR";
  depositPercent?: number | null;
  paymentTermsDays?: number;
  company: {
    name: string;
    address?: string | null;
    zip?: string | null;
    city?: string | null;
    iban?: string | null;
    vatNumber?: string | null;
  };
  client: { name: string; address?: string | null; zip?: string | null; city?: string | null; country?: string | null } | null;
  lineItems: { label: string; description?: string | null; quantity: number; unitPrice: number; vatRate: number }[];
  // Studio plan can drop the "Propulsé par Facty" footer (PROMPT 10 §3).
  removeBranding?: boolean;
};

const fmtDate = (d?: Date | null) => (d ? new Intl.DateTimeFormat("fr-CH").format(d) : "—");

function qrReference(seed: string): string {
  const base = (seed.replace(/\D/g, "") || "0").padStart(26, "0").slice(-26);
  return base + calculateQRReferenceChecksum(base);
}

export async function generateDocumentPdf(input: PdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: M });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageW = doc.page.width;
  const contentW = pageW - M * 2;
  const right = pageW - M;
  const isInvoice = input.kind === "FAC";
  const cur = input.currency;
  const totals = computeTotals(input.lineItems, input.depositPercent);
  const ink = "#0d0d0d";
  const mute = "#6b6b6b";

  // --- Header ---
  doc.font("Helvetica-Bold").fontSize(15).fillColor(ink).text(input.company.name, M, M);
  const compMeta = [input.company.address, [input.company.zip, input.company.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join("\n");
  if (compMeta) doc.font("Helvetica").fontSize(9).fillColor(mute).text(compMeta, M, M + 20);

  doc.font("Helvetica-Bold").fontSize(20).fillColor(ink).text(isInvoice ? "FACTURE" : "DEVIS", M, M, {
    width: contentW,
    align: "right",
  });
  const meta = [
    input.number,
    `Date : ${fmtDate(input.issueDate)}`,
    isInvoice ? `Échéance : ${fmtDate(input.dueDate)}` : `Valable jusqu'au : ${fmtDate(input.validUntil)}`,
  ].join("\n");
  doc.font("Helvetica").fontSize(9).fillColor(mute).text(meta, M, M + 26, { width: contentW, align: "right" });
  const isDepositInvoice = isInvoice && !!input.depositPercent && totals.deposit > 0;
  if (isDepositInvoice) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Facture d'acompte", M, M + 62, {
      width: contentW,
      align: "right",
    });
  }

  // --- Client ---
  let y = M + 88;
  doc.font("Helvetica").fontSize(8).fillColor("#9b9b9b").text("ADRESSÉ À", M, y);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(ink).text(input.client?.name ?? "—", M, y + 12);
  if (input.client) {
    const cl = [input.client.address, [input.client.zip, input.client.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join("\n");
    if (cl) doc.font("Helvetica").fontSize(9).fillColor(mute).text(cl, M, y + 27);
  }

  // --- Table ---
  y += 76;
  const col = { label: M, qty: M + 250, price: M + 300, vat: M + 385, total: M + 430 };
  const w = { qty: 45, price: 80, vat: 40, total: right - (M + 430) };
  doc.font("Helvetica").fontSize(8).fillColor("#9b9b9b");
  doc.text("DÉSIGNATION", col.label, y);
  doc.text("QTÉ", col.qty, y, { width: w.qty, align: "right" });
  doc.text("PRIX HT", col.price, y, { width: w.price, align: "right" });
  doc.text("TVA", col.vat, y, { width: w.vat, align: "right" });
  doc.text("TOTAL HT", col.total, y, { width: w.total, align: "right" });
  y += 14;
  doc.moveTo(M, y).lineTo(right, y).strokeColor("#e2e2e2").lineWidth(1).stroke();
  y += 8;

  for (const li of input.lineItems) {
    if (y > doc.page.height - 220) {
      doc.addPage();
      y = M;
    }
    const lineHt = Math.round((li.quantity || 0) * li.unitPrice);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text(li.label, col.label, y, { width: 240 });
    const labelH = doc.heightOfString(li.label, { width: 240 });
    doc.font("Helvetica").fontSize(9).fillColor(ink);
    doc.text(String(li.quantity), col.qty, y, { width: w.qty, align: "right" });
    doc.text(formatAmountPlain(li.unitPrice), col.price, y, { width: w.price, align: "right" });
    doc.text(`${li.vatRate}%`, col.vat, y, { width: w.vat, align: "right" });
    doc.font("Helvetica-Bold").text(formatAmountPlain(lineHt), col.total, y, { width: w.total, align: "right" });
    let rowH = Math.max(labelH, 12);
    if (li.description) {
      doc.font("Helvetica").fontSize(8).fillColor(mute).text(li.description, col.label, y + labelH + 1, { width: 240 });
      rowH += doc.heightOfString(li.description, { width: 240 }) + 1;
    }
    y += rowH + 8;
    doc.moveTo(M, y - 4).lineTo(right, y - 4).strokeColor("#f0f0f0").lineWidth(0.5).stroke();
  }

  // --- Totals ---
  y += 8;
  const tx = right - 200;
  const totalRow = (label: string, value: string, bold = false, color = ink) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9).fillColor(color);
    doc.text(label, tx, y, { width: 120 });
    doc.text(`${formatAmountPlain(Number(value))} ${cur}`, tx + 120, y, { width: 80, align: "right" });
    y += bold ? 18 : 14;
  };
  totalRow("Total HT", String(totals.ht));
  for (const v of totals.vatByRate) totalRow(`TVA ${v.rate}%`, String(v.amount), false, mute);
  doc.moveTo(tx, y).lineTo(right, y).strokeColor("#e2e2e2").lineWidth(1).stroke();
  y += 6;
  totalRow("Total TTC", String(totals.ttc), true);

  if (input.depositPercent && totals.deposit > 0) {
    y += 6;
    const solde = totals.ttc - totals.deposit;
    if (isDepositInvoice) {
      // Deposit invoice recap (§2): the QR-facture bills the deposit amount.
      doc.font("Helvetica").fontSize(9).fillColor(mute);
      doc.text(`Total de la mission : ${formatAmountPlain(totals.ttc)} ${cur}`, M, y, { width: contentW, align: "right" });
      y += 13;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(ink);
      doc.text(
        `Cette facture d'acompte (${input.depositPercent}%) : ${formatAmountPlain(totals.deposit)} ${cur}`,
        M,
        y,
        { width: contentW, align: "right" },
      );
      y += 14;
      doc.font("Helvetica").fontSize(9).fillColor(mute);
      doc.text(`Solde restant : ${formatAmountPlain(solde)} ${cur}`, M, y, { width: contentW, align: "right" });
      y += 16;
    } else {
      doc.font("Helvetica").fontSize(9).fillColor(mute);
      doc.text(
        `Acompte à la commande (${input.depositPercent}%) : ${formatAmountPlain(totals.deposit)} ${cur}  —  ` +
          `Solde à la livraison : ${formatAmountPlain(solde)} ${cur}`,
        M,
        y,
        { width: contentW, align: "right" },
      );
      y += 16;
    }
  }

  // --- Payment terms / legal ---
  y += 18;
  doc.font("Helvetica").fontSize(9).fillColor(mute);
  if (isInvoice) {
    doc.text(
      `Conditions de paiement : ${input.paymentTermsDays ?? 30} jours net.` +
        (input.company.iban ? ` IBAN : ${input.company.iban}` : ""),
      M,
      y,
      { width: contentW },
    );
  } else {
    doc.text("Ce devis est valable 30 jours. Merci de votre confiance.", M, y, { width: contentW });
  }
  if (input.company.vatNumber) {
    doc.text(`N° TVA : ${input.company.vatNumber}`, M, y + 14, { width: contentW });
  }

  // --- Footer ---
  if (!input.removeBranding) {
    doc.font("Helvetica").fontSize(8).fillColor("#b8b8b8").text("Propulsé par Facty", M, doc.page.height - 70, {
      width: contentW,
      align: "center",
    });
  }

  // --- Swiss QR-bill (CHF invoices with a valid IBAN) ---
  const iban = input.company.iban ?? "";
  if (isInvoice && cur === "CHF" && iban && isIBANValid(iban)) {
    const data: {
      currency: "CHF";
      amount: number;
      creditor: { account: string; name: string; address: string; zip: string | number; city: string; country: string };
      reference?: string;
      debtor?: { name: string; address: string; zip: string | number; city: string; country: string };
    } = {
      currency: "CHF",
      amount: (isDepositInvoice ? totals.deposit : totals.ttc) / 100,
      creditor: {
        account: iban,
        name: input.company.name,
        address: input.company.address || "—",
        zip: input.company.zip || "0000",
        city: input.company.city || "—",
        country: "CH",
      },
    };
    if (isQRIBAN(iban)) data.reference = qrReference(input.number);
    if (input.client?.address && input.client.city && input.client.zip) {
      data.debtor = {
        name: input.client.name,
        address: input.client.address,
        zip: input.client.zip,
        city: input.client.city,
        country: input.client.country || "CH",
      };
    }
    try {
      new SwissQRBill(data, { language: "FR" }).attachTo(doc);
    } catch {
      // Invalid QR data — ship the invoice without the payment slip rather than failing.
    }
  }

  doc.end();
  return done;
}
