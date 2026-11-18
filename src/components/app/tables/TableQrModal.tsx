"use client";

import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Utensils 
} from "lucide-react";

interface TableQrModalProps {
  table: any | null;
  outletName?: string;
  tenantName?: string;
  onClose: () => void;
}

export function TableQrModal({
  table,
  outletName,
  tenantName,
  onClose,
}: TableQrModalProps) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!table) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://restronex.app";
  const qrUrl = `${origin}/order/table/${table.qrToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintTent = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Table ${table.number} QR Standee - ${outletName || "RestroNex"}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 90vh;
              margin: 0;
              background: #fff;
              color: #172B25;
            }
            .tent-card {
              width: 320px;
              border: 3px solid #172B25;
              border-radius: 24px;
              padding: 24px 20px;
              text-align: center;
              box-shadow: none;
            }
            .brand {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #16845B;
            }
            .outlet {
              font-size: 11px;
              color: #718078;
              margin-bottom: 16px;
            }
            .table-badge {
              display: inline-block;
              background: #172B25;
              color: #fff;
              font-size: 20px;
              font-weight: 900;
              padding: 6px 20px;
              border-radius: 9999px;
              margin-bottom: 16px;
            }
            .qr-box {
              padding: 16px;
              background: #F4F6F5;
              border-radius: 18px;
              display: inline-block;
              margin-bottom: 16px;
            }
            .cta-title {
              font-size: 15px;
              font-weight: 800;
              margin-bottom: 4px;
            }
            .cta-sub {
              font-size: 12px;
              color: #718078;
              margin-bottom: 16px;
              line-height: 1.4;
            }
            .powered {
              font-size: 10px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-top: 1px dashed #ddd;
              padding-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="tent-card">
            <div class="brand">${tenantName || outletName || "RESTRONEX"}</div>
            <div class="outlet">${outletName || "Dine-in"} • ${table.area || "Main Hall"}</div>
            
            <div class="table-badge">TABLE ${table.number}</div>

            <div class="qr-box">
              ${printContent.querySelector("svg")?.outerHTML || ""}
            </div>

            <div class="cta-title">Scan to View Menu & Order</div>
            <div class="cta-sub">
              Point your smartphone camera to browse contactless menu, order dishes and pay directly.
            </div>

            <div class="powered">Powered by RestroNex</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#E5EBE7] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-3.5 border-b border-[#E5EBE7] flex items-center justify-between bg-[#F4F6F5]">
          <span className="text-xs font-black uppercase tracking-wider text-[#172B25]">
            Contactless Table Tent
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 text-[#718078] hover:text-[#172B25] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Standee Card View */}
        <div className="p-6 text-center space-y-4" ref={printRef}>
          {/* Restaurant & Table Info */}
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-[#16845B]">
              {tenantName || outletName || "RESTRO NEX"}
            </div>
            <div className="text-[11px] text-[#718078] mt-0.5">
              {outletName || "Dining Area"} • {table.area || "Main Hall"}
            </div>
            <div className="inline-block mt-3 px-4 py-1 rounded-full bg-[#172B25] text-white text-base font-black">
              TABLE {table.number}
            </div>
          </div>

          {/* QR Code */}
          <div className="p-4 bg-[#F4F6F5] rounded-3xl inline-block border border-[#E5EBE7] shadow-inner">
            <QRCodeSVG
              value={qrUrl}
              size={180}
              level="H"
              includeMargin={false}
              className="mx-auto"
            />
          </div>

          {/* Instructions */}
          <div>
            <h4 className="text-sm font-black text-[#172B25]">Scan to View Menu & Order</h4>
            <p className="text-xs text-[#718078] max-w-xs mx-auto mt-1">
              Point smartphone camera to explore contactless menu, order food and pay effortlessly.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-[#E5EBE7] space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintTent}
              className="flex-1 py-2 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Table Tent</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-white hover:bg-gray-100 text-[#172B25] border border-[#E5EBE7] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Copy QR Order Link"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1.5 text-center text-[11px] font-semibold text-[#718078] hover:text-[#16845B] flex items-center justify-center gap-1 transition"
          >
            <span>Preview Customer Order Screen</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
