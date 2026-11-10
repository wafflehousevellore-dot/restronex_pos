"use client";

import { apiFetch } from "./api";

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
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
    });
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
          await dev.close().catch(() => {});
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
    // Web Bluetooth requires active gesture for initial connect; if unavailable from background click, queue/report honestly
    finalStatus = "PRINT_REQUESTED";
    errMsg = "Bluetooth ESC/POS requires active BLE session or Android counter app; queued for handoff";
  } else {
    // OS_PRINT_SERVICE: uses hidden iframe silently (never blocks checkout) and reports PRINT_REQUESTED accurately
    try {
      if (typeof document !== "undefined" && params.textLines && params.textLines.length > 0) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
          const widthMm = params.paperWidth === "58mm" ? "58mm" : "80mm";
          const pre = params.textLines
            .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
            .join("\n");
          doc.open();
          doc.write(
            `<!doctype html><html><head><style>@page{margin:2mm;size:${widthMm} auto;}body{font-family:monospace;font-size:${
              params.paperWidth === "58mm" ? "10px" : "12px"
            };white-space:pre;width:${widthMm};margin:0;}</style></head><body>${pre}</body></html>`
          );
          doc.close();
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
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
  } catch {}

  return { status: finalStatus, error: errMsg };
}

