import PDFDocument from "pdfkit";
import { formatINR } from "./money";

export interface InvoicePDFItem {
  name: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
}

export interface InvoicePDFData {
  restaurantName: string;
  outletName: string;
  outletAddress?: string | null;
  outletCity?: string | null;
  outletPhone?: string | null;
  gstin?: string | null;
  fssai?: string | null;
  invoiceNumber: string;
  orderNumber: string;
  date: string; // e.g. "06 Nov 2026"
  time: string; // e.g. "06:15 PM"
  orderType: string; // "DINE_IN", "TAKEAWAY", "DELIVERY", "QR"
  tableName?: string | null;
  staffName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: InvoicePDFItem[];
  subtotalPaise: number;
  discountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  otherTaxesPaise?: number;
  totalPaise: number;
  paymentMethod: string;
  paymentStatus: "PAID" | "UNPAID" | "REFUNDED";
  transactionId?: string | null;
}

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 36,
        info: {
          Title: `Tax Invoice - ${data.invoiceNumber}`,
          Author: data.restaurantName || "RestroNex Restaurant OS",
          Subject: `Invoice ${data.invoiceNumber} for Order ${data.orderNumber}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const primaryColor = "#16845B";
      const textColor = "#172B25";
      const mutedColor = "#718078";
      const borderColor = "#E5EBE7";
      const lightBg = "#F8FAF9";

      // 1. Top Brand Header
      doc.rect(36, 36, 523, 72).fill(primaryColor);

      doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold");
      doc.text(data.restaurantName || "RESTRONEX RESTAURANT", 50, 48, { width: 320, ellipsis: true });

      doc.fillColor("#E8F5EE").fontSize(9).font("Helvetica");
      const outletLine = [data.outletName, data.outletAddress, data.outletCity].filter(Boolean).join(", ");
      doc.text(outletLine || "Modern Dining Experience", 50, 72, { width: 340, ellipsis: true });

      const taxRegLine = [data.gstin ? `GSTIN: ${data.gstin}` : null, data.fssai ? `FSSAI: ${data.fssai}` : null].filter(Boolean).join(" • ");
      if (taxRegLine) {
        doc.text(taxRegLine, 50, 86, { width: 340, ellipsis: true });
      }

      // TAX INVOICE title on top-right
      doc.fillColor("#FFFFFF").fontSize(15).font("Helvetica-Bold");
      doc.text("TAX INVOICE", 380, 50, { width: 165, align: "right" });

      doc.fillColor("#E8F5EE").fontSize(10).font("Helvetica-Bold");
      doc.text(data.invoiceNumber, 380, 70, { width: 165, align: "right" });

      doc.fontSize(8).font("Helvetica");
      doc.text(`${data.date} • ${data.time}`, 380, 86, { width: 165, align: "right" });

      // 2. Invoice Details Grid (Two columns)
      let currentY = 120;
      doc.rect(36, currentY, 523, 85).fillAndStroke(lightBg, borderColor);

      // Left Column: Order details
      doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold");
      doc.text("BILL & TABLE DETAILS", 48, currentY + 10);

      doc.fillColor(mutedColor).fontSize(8).font("Helvetica");
      doc.text("Order ID:", 48, currentY + 26);
      doc.text("Order Type:", 48, currentY + 39);
      doc.text("Table:", 48, currentY + 52);
      doc.text("Served By:", 48, currentY + 65);

      doc.fillColor(textColor).font("Helvetica-Bold");
      doc.text(data.orderNumber, 105, currentY + 26);
      doc.text((data.orderType || "DINE_IN").replace("_", " "), 105, currentY + 39);
      doc.text(data.tableName || "Counter / Takeaway", 105, currentY + 52);
      doc.text(data.staffName || "Staff POS", 105, currentY + 65);

      // Right Column: Customer & Payment Details
      doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold");
      doc.text("CUSTOMER & PAYMENT", 310, currentY + 10);

      doc.fillColor(mutedColor).fontSize(8).font("Helvetica");
      doc.text("Customer:", 310, currentY + 26);
      doc.text("Phone:", 310, currentY + 39);
      doc.text("Payment:", 310, currentY + 52);
      doc.text("Status:", 310, currentY + 65);

      doc.fillColor(textColor).font("Helvetica-Bold");
      doc.text(data.customerName || "Walk-in Guest", 370, currentY + 26);
      doc.text(data.customerPhone || "N/A", 370, currentY + 39);
      doc.text(data.paymentMethod || "UPI / CASH", 370, currentY + 52);

      // Status Badge
      const isPaid = data.paymentStatus === "PAID";
      doc.fillColor(isPaid ? "#16845B" : "#DC2626").font("Helvetica-Bold");
      doc.text(data.paymentStatus, 370, currentY + 65);

      // 3. Itemized Table
      currentY = 220;
      doc.rect(36, currentY, 523, 22).fill("#16845B");

      doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");
      doc.text("#", 45, currentY + 7);
      doc.text("ITEM DESCRIPTION", 75, currentY + 7);
      doc.text("QTY", 330, currentY + 7, { width: 40, align: "center" });
      doc.text("UNIT PRICE", 380, currentY + 7, { width: 75, align: "right" });
      doc.text("AMOUNT (INR)", 465, currentY + 7, { width: 80, align: "right" });

      currentY += 22;
      doc.font("Helvetica").fontSize(8.5);

      data.items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? "#FFFFFF" : "#F8FAF9";
        doc.rect(36, currentY, 523, 20).fillAndStroke(rowBg, borderColor);

        doc.fillColor(mutedColor).text(String(index + 1), 45, currentY + 6);
        doc.fillColor(textColor).font("Helvetica-Bold").text(item.name, 75, currentY + 6, { width: 245, ellipsis: true });
        doc.font("Helvetica").text(String(item.quantity), 330, currentY + 6, { width: 40, align: "center" });
        doc.text(formatINR(item.unitPricePaise), 380, currentY + 6, { width: 75, align: "right" });
        doc.font("Helvetica-Bold").text(formatINR(item.totalPaise), 465, currentY + 6, { width: 80, align: "right" });

        currentY += 20;
      });

      // 4. Totals & Tax Calculation Breakdown
      currentY += 10;
      const totalsBoxY = currentY;

      // Left side: Payment Acknowledgement / Policy Note
      doc.rect(36, totalsBoxY, 260, 110).fillAndStroke(lightBg, borderColor);
      doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold");
      doc.text("PAYMENT ACKNOWLEDGEMENT", 48, totalsBoxY + 12);

      doc.fillColor(textColor).fontSize(8).font("Helvetica");
      doc.text(`Transaction Reference: ${data.transactionId || data.orderNumber}`, 48, totalsBoxY + 28);
      doc.text(`Payment Method: ${data.paymentMethod}`, 48, totalsBoxY + 42);
      doc.text(`Payment State: ${data.paymentStatus}`, 48, totalsBoxY + 56);
      doc.fillColor(mutedColor).fontSize(7.5);
      doc.text("Thank you for choosing us! Keep this tax invoice for warranty, expense claims, or dining history.", 48, totalsBoxY + 74, { width: 236 });

      // Right side: Minor-Unit Breakdown Table
      doc.rect(306, totalsBoxY, 253, 110).fillAndStroke("#FFFFFF", borderColor);

      const renderTotalRow = (label: string, value: string, yPos: number, isBold: boolean = false, isAccent: boolean = false) => {
        doc.fillColor(isAccent ? primaryColor : isBold ? textColor : mutedColor)
          .font(isBold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(isBold ? 9.5 : 8);
        doc.text(label, 318, yPos);
        doc.text(value, 465, yPos, { width: 84, align: "right" });
      };

      renderTotalRow("Subtotal:", formatINR(data.subtotalPaise), totalsBoxY + 10);
      if (data.discountPaise > 0) {
        renderTotalRow("Discount:", `- ${formatINR(data.discountPaise)}`, totalsBoxY + 24, false, true);
      } else {
        renderTotalRow("Discount:", "₹0.00", totalsBoxY + 24);
      }
      renderTotalRow("CGST (9%):", formatINR(data.cgstPaise), totalsBoxY + 38);
      renderTotalRow("SGST (9%):", formatINR(data.sgstPaise), totalsBoxY + 52);

      const otherTaxes = data.otherTaxesPaise || 0;
      renderTotalRow("Other Taxes / Cess:", formatINR(otherTaxes), totalsBoxY + 66);

      // Grand Total Highlight
      doc.rect(306, totalsBoxY + 80, 253, 30).fill(primaryColor);
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11);
      doc.text("TOTAL AMOUNT:", 318, totalsBoxY + 89);
      doc.text(formatINR(data.totalPaise), 440, totalsBoxY + 89, { width: 109, align: "right" });

      // 5. Professional Footer
      const footerY = 740;
      doc.strokeColor(borderColor).lineWidth(1).moveTo(36, footerY).lineTo(559, footerY).stroke();

      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold");
      doc.text("Thank you for choosing us! ❤️", 36, footerY + 10, { width: 523, align: "center" });

      doc.fillColor(mutedColor).fontSize(7.5).font("Helvetica");
      doc.text("This is an official computer-generated tax invoice verified by RestroNex Restaurant OS. No physical signature required.", 36, footerY + 24, { width: 523, align: "center" });
      doc.text("Powered by RestroNex – Universal Restaurant Operating System • Enterprise Multi-Tenant Billing", 36, footerY + 36, { width: 523, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
