import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Key,
  Camera,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  CameraOff,
} from "lucide-react";
import jsQR from "jsqr";

interface TotpSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (secret: string) => void;
  currentSecret?: string;
}

const TotpSetupModal: React.FC<TotpSetupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSecret,
}) => {
  const [mode, setMode] = useState<"manual" | "camera" | "upload">("manual");
  const [secret, setSecret] = useState(currentSecret || "");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const extractTotpSecret = (data: string): string | null => {
    try {
      const url = new URL(data);
      if (url.protocol === "otpauth:") {
        const secret = url.searchParams.get("secret");
        if (secret) return secret.replace(/\s/g, "").toUpperCase();
      }
    } catch {
      const cleaned = data.replace(/\s/g, "").toUpperCase();
      if (/^[A-Z2-7]+$/.test(cleaned)) return cleaned;
    }
    return null;
  };

  // Check camera availability
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setHasCamera(videoDevices.length > 0);
      } catch {
        setHasCamera(false);
      }
    };

    if (isOpen) {
      checkCamera();
    }
  }, [isOpen]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError("");
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setIsScanning(false);

      if (err.name === "NotAllowedError") {
        setCameraError(
          "Camera permission denied. Please allow camera access or use file upload."
        );
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found. Please use file upload instead.");
        setHasCamera(false);
      } else {
        setCameraError(
          "Failed to access camera. Please use file upload instead."
        );
      }
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  // Scan video frame for QR code
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      const extractedSecret = extractTotpSecret(code.data);
      if (extractedSecret) {
        setSecret(extractedSecret);
        setMode("manual");
        setError("");
        stopCamera();
      }
    }
  }, [isScanning, stopCamera]);

  // Start scanning loop when camera is active
  useEffect(() => {
    if (mode === "camera" && isScanning && videoRef.current) {
      scanIntervalRef.current = window.setInterval(scanFrame, 200);
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [mode, isScanning, scanFrame]);

  // Cleanup on close/unmount
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode("manual");
      setCameraError("");
      setError("");
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  const handleSave = () => {
    const cleaned = secret.replace(/\s/g, "").toUpperCase();
    if (!cleaned) {
      setError("Please enter a TOTP secret");
      return;
    }
    if (!/^[A-Z2-7]+$/.test(cleaned)) {
      setError("Invalid Base32 secret format");
      return;
    }
    onSave(cleaned);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            const extractedSecret = extractTotpSecret(code.data);
            if (extractedSecret) {
              setSecret(extractedSecret);
              setMode("manual");
              setError("");
            } else {
              setError("Could not extract TOTP secret from QR code");
            }
          } else {
            setError("No QR code found in image");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleStartCamera = () => {
    setMode("camera");
    setError("");
    setCameraError("");
    startCamera(); // Call directly
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Key size={20} className="text-primary-500" /> Setup 2FA (TOTP)
          </h3>
          <button onClick={handleClose}>
            <X size={20} className="text-gray-500 hover:text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode("manual");
                stopCamera();
              }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                mode === "manual"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <Key size={14} className="inline mr-1.5" /> Enter Key
            </button>
            {hasCamera ? (
              <button
                onClick={handleStartCamera}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  mode === "camera"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Camera size={14} className="inline mr-1.5" /> Scan QR
              </button>
            ) : null}
            <button
              onClick={() => {
                setMode("upload");
                stopCamera();
                setError("");
              }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                mode === "upload"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <Upload size={14} className="inline mr-1.5" /> Upload
            </button>
          </div>

          {/* Manual Entry Mode */}
          {mode === "manual" && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                TOTP Secret Key
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 pr-10 text-white font-mono text-sm focus:border-primary-500 outline-none"
                  value={secret}
                  onChange={(e) => {
                    setSecret(e.target.value);
                    setError("");
                  }}
                  placeholder="JBSWY3DPEHPK3PXP"
                  autoFocus
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Enter the secret key from your authenticator app
              </p>
            </div>
          )}

          {/* Camera Scan Mode */}
          {mode === "camera" && (
            <div className="space-y-3">
              <div className="relative w-full aspect-video bg-gray-950 rounded-xl overflow-hidden border border-gray-800">
                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <CameraOff size={32} className="text-red-400 mb-2" />
                    <p className="text-sm text-red-400">{cameraError}</p>
                    <button
                      onClick={() => setMode("upload")}
                      className="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Use File Upload
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-primary-500 rounded-lg relative">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-400 rounded-tl-lg -translate-x-0.5 -translate-y-0.5"></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-400 rounded-tr-lg translate-x-0.5 -translate-y-0.5"></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-400 rounded-bl-lg -translate-x-0.5 translate-y-0.5"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-400 rounded-br-lg translate-x-0.5 translate-y-0.5"></div>
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-0 right-0 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-full text-xs text-white">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Scanning for QR code...
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-xs text-gray-500 text-center">
                Point your camera at the QR code from your authenticator setup
              </p>
            </div>
          )}

          {/* File Upload Mode */}
          {mode === "upload" && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-56 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-900/50 transition-all bg-gray-950 group"
              >
                <div className="w-16 h-16 rounded-full bg-primary-900/20 flex items-center justify-center mb-3 group-hover:bg-primary-900/30 transition-colors">
                  <Upload size={32} className="text-primary-400" />
                </div>
                <p className="text-sm text-gray-300 font-medium">
                  Upload QR Code Image
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Select an image from your device
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-800 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors"
          >
            Save TOTP
          </button>
        </div>
      </div>
    </div>
  );
};

export default TotpSetupModal;
