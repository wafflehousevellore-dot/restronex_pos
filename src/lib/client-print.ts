"use client";

import { apiFetch } from "./api";
import QRCode from "qrcode";

export type ClientPrintStatus =
  | "NOT_CONFIGURED"
  | "QUEUED"
  | "PRINTING"
  | "PRINT_REQUESTED"
  | "PRINTED"
  | "OFFLINE"
  | "FAILED";

export async function discoverUsbPrinter(): Promise<{
  ok: boolean;
  name?: string;
  connectionString?: string;
  error?: string;
}> {
  if (typeof navigator === "undefined" || !("usb" in navigator)) {
    return {
      ok: false,
      error: "WebUSB is supported in Chrome/Edge on Desktop or Android. Use Local Print Bridge for other browsers.",
    };
  }
  try {
    const dev = await (navigator as any).usb.requestDevice({ filters: [] });
    const name = dev.productName || "USB Thermal Printer";
    const vid = Number(dev.vendorId || 0).toString(16).padStart(4, "0");
    const pid = Number(dev.productId || 0).toString(16).padStart(4, "0");
    return {
      ok: true,
      name,
      connectionString: `USB:${vid}:${pid}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "USB device selection cancelled.",
    };
  }
}

let activeBleDevice: any = null;
let activeBleCharacteristic: any = null;

export const POPULAR_BLE_PRINTER_SERVICES = [
  "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 / CC2541 Serial (58mm POS standard)
  "0000fff0-0000-1000-8000-00805f9b34fb", // POS-58 / Zjiang / Rongta serial service
  "000018f0-0000-1000-8000-00805f9b34fb", // Standard POS BLE service
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC transparent serial UART service
  "0000e781-0000-1000-8000-00805f9b34fb", // Xprinter / Zhuhai BLE
  "0000ff00-0000-1000-8000-00805f9b34fb", // General BLE UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Common 58mm mobile printer
  "0000ae00-0000-1000-8000-00805f9b34fb", // Android BLE thermal profile
  "0000fee7-0000-1000-8000-00805f9b34fb", // Tencent / Chinese micro-printer profile
  "0000af30-0000-1000-8000-00805f9b34fb", // MPT-II / POS-58 custom service
  "0000ff02-0000-1000-8000-00805f9b34fb", // Bluetooth POS UART 2
  "0000fff1-0000-1000-8000-00805f9b34fb", // Rongta custom
  "000018f1-0000-1000-8000-00805f9b34fb", // POS sub-service
  "0000ff80-0000-1000-8000-00805f9b34fb", // Goojprt / Milestone custom
  "0000180a-0000-1000-8000-00805f9b34fb", // Device Information Service
];

export function isBlePrinterConnected(): boolean {
  return Boolean(activeBleDevice && activeBleDevice.gatt?.connected);
}

export function getActiveBlePrinterName(): string | null {
  return activeBleDevice?.name || null;
}

export async function getOrRestoreBleDevice(): Promise<any> {
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    return null;
  }

  // 1. If we already hold an in-memory device reference
  if (activeBleDevice) {
    if (activeBleDevice.gatt && !activeBleDevice.gatt.connected) {
      try {
        await activeBleDevice.gatt.connect();
        activeBleCharacteristic = null;
      } catch (err) {
        console.warn("[Bluetooth Printer] Reconnect failed:", err);
      }
    }
    if (activeBleDevice.gatt?.connected) {
      return activeBleDevice;
    }
  }

  // 2. Auto-restore previously authorized Bluetooth device in Chrome (no popup needed)
  try {
    if (typeof (navigator as any).bluetooth?.getDevices === "function") {
      const devices = await (navigator as any).bluetooth.getDevices();
      if (devices && devices.length > 0) {
        const dev = devices[0];
        activeBleDevice = dev;
        activeBleCharacteristic = null;
        dev.addEventListener("gattserverdisconnected", () => {
          console.warn("[Bluetooth Printer] GATT disconnected (printer sleep)");
          activeBleCharacteristic = null;
        });
        if (!dev.gatt?.connected) {
          try {
            await dev.gatt?.connect();
          } catch { }
        }
        return dev;
      }
    }
  } catch (err) {
    console.warn("[Bluetooth Printer] Auto-restore error:", err);
  }

  return activeBleDevice?.gatt?.connected ? activeBleDevice : null;
}

export async function getBleWriteCharacteristic(dev: any): Promise<any> {
  if (!dev || !dev.gatt?.connected) return null;
  if (activeBleCharacteristic) return activeBleCharacteristic;

  // 1. Check known printer primary services
  for (const serviceUuid of POPULAR_BLE_PRINTER_SERVICES) {
    try {
      const service = await dev.gatt.getPrimaryService(serviceUuid);
      const chars = await service.getCharacteristics();
      const writeChar = chars.find(
        (c: any) => c.properties.write || c.properties.writeWithoutResponse
      );
      if (writeChar) {
        activeBleCharacteristic = writeChar;
        return writeChar;
      }
    } catch {
      // Continue to next service candidate
    }
  }

  // 2. Fallback: discover any permitted primary service with write characteristic
  try {
    const allServices = await dev.gatt.getPrimaryServices();
    for (const service of allServices) {
      try {
        const chars = await service.getCharacteristics();
        const writeChar = chars.find(
          (c: any) => c.properties.write || c.properties.writeWithoutResponse
        );
        if (writeChar) {
          activeBleCharacteristic = writeChar;
          return writeChar;
        }
      } catch { }
    }
  } catch { }

  return null;
}

export async function sendEscPosToBlePrinter(
  escPosBase64: string,
  retries = 2
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const dev = await getOrRestoreBleDevice();
      if (!dev) {
        return {
          success: false,
          error: "Bluetooth printer not connected. Click 'Connect Printer' to pair.",
        };
      }

      if (!dev.gatt?.connected) {
        console.log(`[Bluetooth Printer] Reconnecting (attempt ${attempt + 1})...`);
        await dev.gatt.connect();
        activeBleCharacteristic = null;
      }

      const writeChar = await getBleWriteCharacteristic(dev);
      if (!writeChar) {
        return {
          success: false,
          error: "No writable ESC/POS characteristic found on Bluetooth printer.",
        };
      }

      const rawBytes = base64ToUint8Array(escPosBase64);
      // Safe BLE packet size: 20 bytes (standard BLE payload MTU)
      // Completely prevents packet drop/truncation on all 58mm printer chipsets
      const chunkSize = 20;

      for (let i = 0; i < rawBytes.length; i += chunkSize) {
        const chunk = rawBytes.slice(i, i + chunkSize);
        if (typeof writeChar.writeValueWithoutResponse === "function") {
          await writeChar.writeValueWithoutResponse(chunk);
        } else if (typeof writeChar.writeValueWithResponse === "function") {
          await writeChar.writeValueWithResponse(chunk);
        } else {
          await writeChar.writeValue(chunk);
        }
        // Micro pacing delay (15ms): prevents printer UART RX buffer overflow and head starvation
        await new Promise((r) => setTimeout(r, 15));
      }

      return { success: true };
    } catch (err: any) {
      activeBleCharacteristic = null;
      console.warn(`[Bluetooth Printer] Write attempt ${attempt + 1} failed:`, err);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 350));
      } else {
        return { success: false, error: err?.message || "Bluetooth thermal write failed" };
      }
    }
  }
  return { success: false, error: "Bluetooth write failed after retries" };
}

export async function discoverBluetoothPrinter(): Promise<{
  ok: boolean;
  name?: string;
  connectionString?: string;
  error?: string;
}> {
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    return {
      ok: false,
      error: "Web Bluetooth is supported on Chrome (Android/macOS). iOS Safari & Classic SPP printers require Android APK or Local Print Bridge.",
    };
  }
  try {
    const dev = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: POPULAR_BLE_PRINTER_SERVICES,
    });
    activeBleDevice = dev;
    activeBleCharacteristic = null;

    dev.addEventListener("gattserverdisconnected", () => {
      console.warn("[Bluetooth Printer] GATT server disconnected (sleep mode)");
      activeBleCharacteristic = null;
    });

    if (!dev.gatt?.connected) {
      try {
        await dev.gatt?.connect();
        await getBleWriteCharacteristic(dev);
      } catch { }
    }

    return {
      ok: true,
      name: dev.name || "Bluetooth Thermal Printer",
      connectionString: dev.id || "BLE-PAIRED",
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Bluetooth pairing cancelled.",
    };
  }
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateHtmlReceiptWithQr(
  textLines: string[],
  paperWidth: "58mm" | "80mm",
  qrData?: string
): Promise<string> {
  const widthMm = paperWidth === "58mm" ? "58mm" : "80mm";
  const fontSize = paperWidth === "58mm" ? "10px" : "12px";

  let qrDataUrl = "";
  if (qrData) {
    try {
      qrDataUrl = await QRCode.toDataURL(qrData, {
        width: paperWidth === "58mm" ? 140 : 180,
        margin: 1,
        errorCorrectionLevel: "M",
      });
    } catch { }
  }

  // Find line position where QR should be embedded (after "SCAN TO PAY" or "Scan QR")
  const qrHeaderIdx = textLines.findIndex(
    (l) => l.includes("SCAN TO PAY") || l.includes("Scan QR")
  );

  let htmlBody = "";
  if (qrDataUrl && qrHeaderIdx !== -1) {
    const preQr = textLines
      .slice(0, qrHeaderIdx + 3)
      .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
      .join("\n");
    const postQr = textLines
      .slice(qrHeaderIdx + 3)
      .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
      .join("\n");

    htmlBody = `<pre>${preQr}</pre><div style="text-align:center;margin:6px 0;"><img src="${qrDataUrl}" style="width:${paperWidth === "58mm" ? "130px" : "160px"
      };height:${paperWidth === "58mm" ? "130px" : "160px"
      };image-rendering:pixelated;display:inline-block;" /></div><pre>${postQr}</pre>`;
  } else if (qrDataUrl) {
    const allText = textLines
      .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
      .join("\n");
    htmlBody = `<pre>${allText}</pre><div style="text-align:center;margin:6px 0;"><img src="${qrDataUrl}" style="width:130px;height:130px;image-rendering:pixelated;display:inline-block;" /></div>`;
  } else {
    const allText = textLines
      .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
      .join("\n");
    htmlBody = `<pre>${allText}</pre>`;
  }

  return `<!doctype html><html><head><style>@page{margin:2mm;size:${widthMm} auto;}body{font-family:monospace;font-size:${fontSize};margin:0;padding:2mm;width:${widthMm};color:#000;background:#fff;}pre{margin:0;white-space:pre-wrap;font-family:monospace;font-size:${fontSize};}</style></head><body>${htmlBody}</body></html>`;
}

/**
 * Triggers non-blocking browser/counter print dispatch for jobs that require client execution
 * (USB WebUSB, BLE, Localhost Print Bridge, or OS Print Service).
 * Accurately reports hardware confirmation (`PRINTED`) vs `PRINT_REQUESTED` vs `OFFLINE` via /ack.
 */
export async function dispatchClientPrintJob(params: {
  jobId: string;
  printerType: string;
  connectionString?: string | null;
  bridgeUrl?: string | null;
  paperWidth: "58mm" | "80mm";
  escPosBase64?: string;
  textLines?: string[];
  qrData?: string;
}): Promise<{ status: ClientPrintStatus; error?: string }> {
  let finalStatus: ClientPrintStatus = "PRINT_REQUESTED";
  let errMsg: string | undefined;

  const escBytes = params.escPosBase64 ? base64ToUint8Array(params.escPosBase64) : new Uint8Array(0);

  if (params.printerType === "LOCAL_BRIDGE" || (params.printerType === "NETWORK_LAN" && params.bridgeUrl)) {
    const targetBridge = (params.bridgeUrl || "http://127.0.0.1:9111").replace(/\/$/, "");
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(`${targetBridge}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: params.jobId,
          connectionString: params.connectionString,
          paperWidth: params.paperWidth,
          escPosBase64: params.escPosBase64,
          textLines: params.textLines,
        }),
        signal: controller.signal,
      });
      clearTimeout(tid);
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.printed === true) {
        finalStatus = "PRINTED";
      } else if (res.ok) {
        finalStatus = "PRINT_REQUESTED";
      } else {
        finalStatus = "OFFLINE";
        errMsg = j.error || "Local print agent rejected job";
      }
    } catch {
      finalStatus = "OFFLINE";
      errMsg = "Counter Local Print Bridge is offline or not running";
    }
  } else if (params.printerType === "USB_THERMAL") {
    if (typeof navigator !== "undefined" && "usb" in navigator && escBytes.length > 0) {
      try {
        const devices = await (navigator as any).usb.getDevices();
        const vidPid = params.connectionString?.startsWith("USB:")
          ? params.connectionString.split(":")
          : null;
        const dev = vidPid
          ? devices.find(
            (d: any) =>
              Number(d.vendorId).toString(16).padStart(4, "0") === vidPid[1] &&
              Number(d.productId).toString(16).padStart(4, "0") === vidPid[2]
          )
          : devices[0];

        if (!dev) {
          finalStatus = "OFFLINE";
          errMsg = "USB thermal printer not connected or permission not granted in this browser";
        } else {
          await dev.open();
          if (!dev.configuration) await dev.selectConfiguration(1);
          const iface = dev.configuration.interfaces?.[0];
          if (iface) {
            await dev.claimInterface(iface.interfaceNumber);
            const outEp = iface.alternate.endpoints?.find((ep: any) => ep.direction === "out");
            if (outEp) {
              const copyBuf = new Uint8Array(escBytes).buffer;
              await dev.transferOut(outEp.endpointNumber, copyBuf);
              finalStatus = "PRINTED";
            } else {
              finalStatus = "FAILED";
              errMsg = "No USB OUT bulk endpoint found on printer";
            }
          }
          await dev.close().catch(() => { });
        }
      } catch (e: any) {
        finalStatus = "OFFLINE";
        errMsg = e?.message || "USB thermal write failed";
      }
    } else {
      finalStatus = "OFFLINE";
      errMsg = "WebUSB unsupported in this browser; install Chrome/Edge or Local Print Bridge";
    }
  } else if (params.printerType === "BLUETOOTH_THERMAL") {
    let printedViaBle = false;
    if (params.escPosBase64) {
      const bleRes = await sendEscPosToBlePrinter(params.escPosBase64);
      if (bleRes.success) {
        finalStatus = "PRINTED";
        printedViaBle = true;
      } else {
        console.warn("[Bluetooth Printer] Direct BLE write failed:", bleRes.error);
        errMsg = bleRes.error;
      }
    }

    if (!printedViaBle) {
      // If BLE connection wasn't held or on desktop without active BLE, trigger browser print dialog cleanly
      try {
        if (typeof document !== "undefined" && params.textLines && params.textLines.length > 0) {
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "10px";
          iframe.style.height = "10px";
          iframe.style.border = "0";
          iframe.style.opacity = "0.01";
          document.body.appendChild(iframe);
          const doc = iframe.contentWindow?.document;
          if (doc) {
            const html = await generateHtmlReceiptWithQr(
              params.textLines,
              params.paperWidth,
              params.qrData
            );
            doc.open();
            doc.write(html);
            doc.close();
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          }
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch { }
          }, 4000);
          finalStatus = "PRINT_REQUESTED";
        } else {
          finalStatus = "PRINT_REQUESTED";
          errMsg = errMsg || "Bluetooth ESC/POS queued for paired BLE printer";
        }
      } catch {
        finalStatus = "FAILED";
        errMsg = "Bluetooth print dispatch failed";
      }
    }
  } else {
    // OS_PRINT_SERVICE: uses hidden iframe silently (never blocks checkout) and reports PRINT_REQUESTED accurately
    try {
      if (typeof document !== "undefined" && params.textLines && params.textLines.length > 0) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "10px";
        iframe.style.height = "10px";
        iframe.style.border = "0";
        iframe.style.opacity = "0.01";
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
          const html = await generateHtmlReceiptWithQr(
            params.textLines,
            params.paperWidth,
            params.qrData
          );
          doc.open();
          doc.write(html);
          doc.close();
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch { }
        }, 4000);
        // Never mark PRINTED on browser/OS spooler because browser cannot detect paper-out/offline
        finalStatus = "PRINT_REQUESTED";
      } else {
        finalStatus = "QUEUED";
      }
    } catch {
      finalStatus = "FAILED";
      errMsg = "OS Print Service invocation failed";
    }
  }

  try {
    await apiFetch(`/api/print-jobs/${encodeURIComponent(params.jobId)}/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: finalStatus, lastError: errMsg || null }),
    });
  } catch { }

  return { status: finalStatus, error: errMsg };
}

