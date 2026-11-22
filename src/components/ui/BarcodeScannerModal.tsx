"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Barcode, CheckCircle2, AlertCircle, RefreshCw, Keyboard } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Scan Inventory Barcode",
  description = "Align barcode within camera viewfinder or enter barcode manually below.",
}: BarcodeScannerModalProps) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode("");
      setErrorMsg(null);
      setPermissionGranted(false);
      setCameraActive(false);
    }
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this device or requires secure HTTPS connection.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      setPermissionGranted(true);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        startDetectionLoop();
      }
    } catch (err: any) {
      console.warn("[Barcode Scanner Camera Error]:", err);
      setErrorMsg(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera access in browser settings or use manual input below."
          : err.message || "Failed to initialize camera."
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startDetectionLoop = async () => {
    scanningRef.current = true;

    // Check if BarcodeDetector is natively supported
    const hasNativeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    let detector: any = null;

    if (hasNativeDetector) {
      try {
        // @ts-ignore
        detector = new window.BarcodeDetector({
          formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
        });
      } catch {
        detector = null;
      }
    }

    const checkFrame = async () => {
      if (!scanningRef.current || !videoRef.current) return;

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        if (detector) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (code) {
                handleDetected(code);
                return;
              }
            }
          } catch {}
        }
      }

      if (scanningRef.current) {
        requestAnimationFrame(checkFrame);
      }
    };

    requestAnimationFrame(checkFrame);
  };

  const handleDetected = (code: string) => {
    stopCamera();
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {}
    onScan(code.trim());
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#16845B] flex items-center justify-center">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#172B25]">{title}</h3>
              <p className="text-[11px] text-gray-500">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Camera View */}
        <div className="p-4 space-y-4">
          <div className="relative aspect-video rounded-2xl bg-black overflow-hidden flex items-center justify-center border border-gray-200">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                {/* Viewfinder Target Overlay */}
                <div className="absolute inset-0 border-2 border-emerald-400/60 rounded-xl m-6 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-red-500/80 animate-pulse shadow-sm" />
                </div>
                <div className="absolute bottom-2 text-[10px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full">
                  Align Barcode / QR Inside Box
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-white/90 space-y-3">
                <Camera className="w-10 h-10 mx-auto text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">Camera Access Required</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Permission is requested only when activating scanner.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold shadow-md transition flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Grant Permission &amp; Open Camera
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-gray-500" />
              Manual Barcode or SKU Entry
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan with hardware scanner or type SKU..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 text-xs font-mono px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#16845B] focus:border-transparent outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 rounded-xl bg-[#16845B] hover:bg-[#126b4a] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
