"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { getCroppedBlob, blobToPhotoFile } from "@/lib/crop-image";

export interface PhotoCropModalT {
  title: string;
  instructions: string;
  zoomLabel: string;
  apply: string;
  cancel: string;
  closeModal: string;
  processing: string;
  error: string;
}

interface PhotoCropModalProps {
  isOpen: boolean;
  sourceFile: File;
  onApply: (file: File) => void;
  onCancel: () => void;
  t: PhotoCropModalT;
}

export default function PhotoCropModal({
  isOpen,
  sourceFile,
  onApply,
  onCancel,
  t,
}: PhotoCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = useMemo(
    () => URL.createObjectURL(sourceFile),
    [sourceFile],
  );

  useEffect(() => {
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const handleCropComplete = (_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  };

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels);
      const file = blobToPhotoFile(blob, sourceFile.name);
      onApply(file);
    } catch {
      setError(t.error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-amber-900/20 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-900">{t.title}</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-100 disabled:opacity-60"
            aria-label={t.closeModal}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-stone-500">{t.instructions}</p>
          <div className="relative w-full h-64 bg-stone-900 rounded-lg overflow-hidden">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              minZoom={1}
              maxZoom={3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>
          <div>
            <label
              htmlFor="photoCropZoom"
              className="block text-sm font-semibold text-stone-900 mb-2"
            >
              {t.zoomLabel}
            </label>
            <input
              id="photoCropZoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-stone-100 text-stone-900 rounded-lg font-semibold hover:bg-stone-200 transition-colors disabled:opacity-60"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing || !croppedAreaPixels}
              className="flex-1 px-4 py-2 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.processing}
                </>
              ) : (
                t.apply
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
