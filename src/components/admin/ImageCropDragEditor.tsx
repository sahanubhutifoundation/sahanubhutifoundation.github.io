import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { computeCoverCropStyle } from '../../utils/cropMath';

export interface ImageCropData {
  cropZoom: number;
  cropX: number; // normalized percentage -100 to +100
  cropY: number; // normalized percentage -100 to +100
  imageFit?: 'cover' | 'contain';
}

interface ImageCropDragEditorProps {
  imageUrl: string;
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  imageFit?: 'cover' | 'contain';
  shape?: 'circle' | 'rounded' | 'square';
  isLogo?: boolean;
  onChange: (data: ImageCropData) => void;
  className?: string;
}

export const ImageCropDragEditor: React.FC<ImageCropDragEditorProps> = ({
  imageUrl,
  cropZoom = 1,
  cropX = 0,
  cropY = 0,
  imageFit = 'cover',
  shape = 'rounded',
  isLogo = false,
  onChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalDim, setNaturalDim] = useState<{ width: number; height: number }>({
    width: 1,
    height: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startCropX: number;
    startCropY: number;
  } | null>(null);

  // Load natural dimensions
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setNaturalDim({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const aspect = naturalDim.width / naturalDim.height;
  const zoom = Math.max(isLogo ? 0.5 : 1.0, Math.min(cropZoom, 3.0));

  // Compute cover crop style for the 240px workspace
  const VIEWPORT_PX = 240;
  const cropResult = computeCoverCropStyle(aspect, zoom, cropX, cropY);

  // Visual frame shape classes
  const shapeClass =
    shape === 'square'
      ? 'rounded-xs'
      : shape === 'rounded'
      ? 'rounded-2xl'
      : 'rounded-full';

  // Handle pointer down (both mouse click and touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startCropX: cropX,
      startCropY: cropY,
    };
  };

  // Handle pointer move: tracks pointer in exact pixels, clamped to bounds
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStartRef.current) return;
      e.preventDefault();

      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;

      const maxX_px = (cropResult.maxX_pct / 100) * VIEWPORT_PX;
      const maxY_px = (cropResult.maxY_pct / 100) * VIEWPORT_PX;

      const deltaCropX = maxX_px > 0 ? (deltaX / maxX_px) * 100 : 0;
      const deltaCropY = maxY_px > 0 ? (deltaY / maxY_px) * 100 : 0;

      const newCropX = Math.round(
        Math.max(-100, Math.min(100, dragStartRef.current.startCropX + deltaCropX))
      );
      const newCropY = Math.round(
        Math.max(-100, Math.min(100, dragStartRef.current.startCropY + deltaCropY))
      );

      onChange({
        cropZoom: zoom,
        cropX: newCropX,
        cropY: newCropY,
        imageFit,
      });
    },
    [isDragging, cropResult.maxX_pct, cropResult.maxY_pct, zoom, imageFit, onChange]
  );

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Wheel to zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const minZ = isLogo ? 0.5 : 1.0;
    const newZoom = Math.max(minZ, Math.min(3.0, parseFloat((zoom + delta).toFixed(2))));
    onChange({
      cropZoom: newZoom,
      cropX,
      cropY,
      imageFit,
    });
  };

  const handleZoomChange = (newVal: number) => {
    const minZ = isLogo ? 0.5 : 1.0;
    const clampedZoom = Math.max(minZ, Math.min(3.0, parseFloat(newVal.toFixed(2))));
    onChange({
      cropZoom: clampedZoom,
      cropX,
      cropY,
      imageFit,
    });
  };

  const nudge = (dx: number, dy: number) => {
    const newX = Math.round(Math.max(-100, Math.min(100, cropX + dx)));
    const newY = Math.round(Math.max(-100, Math.min(100, cropY + dy)));
    onChange({
      cropZoom: zoom,
      cropX: newX,
      cropY: newY,
      imageFit,
    });
  };

  const handleReset = () => {
    onChange({
      cropZoom: 1.0,
      cropX: 0,
      cropY: 0,
      imageFit: 'cover',
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Visual Workspace & Live Previews */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
        {/* Interactive Drag Canvas */}
        <div className="flex flex-col items-center">
          <div className="text-[11px] font-bold text-[#5C665F] mb-1.5 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-[#2D5A41]" />
            <span>মাউস বা স্পর্শ দিয়ে টেনে পজিশন করুন (Click & Drag Photo)</span>
          </div>

          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className={`w-[240px] h-[240px] ${shapeClass} relative border-2 border-dashed ${
              isDragging ? 'border-[#2D5A41] shadow-md ring-2 ring-[#2D5A41]/20' : 'border-[#2D5A41]/60'
            } overflow-hidden select-none bg-[#F7F5F0] flex items-center justify-center cursor-grab active:cursor-grabbing transition-all`}
            style={{ touchAction: 'none' }}
            title="ছবি চেপে ধরে উপরে-নিচে বা ডানে-বামে ড্র্যাগ করে মুখমণ্ডল ঠিক করুন"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Crop Canvas"
                draggable={false}
                style={cropResult.style}
              />
            ) : (
              <span className="text-xs text-[#A8B3AA]">ছবি নির্বাচন করুন</span>
            )}

            {/* Subtle Crosshair Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
              <div className="w-full h-px bg-[#2D5A41]" />
              <div className="h-full w-px bg-[#2D5A41] absolute" />
            </div>

            {/* Hint overlay on idle */}
            {!isDragging && (
              <div className="absolute bottom-2 px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] pointer-events-none font-medium backdrop-blur-xs flex items-center gap-1">
                <Move className="w-2.5 h-2.5" />
                <span>টেনে সরান / Drag</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono text-[#5C665F] bg-[#F7F5F0] px-2 py-0.5 rounded-md border border-[#EBE8E0]">
              X: {cropX}% | Y: {cropY}% | Zoom: {zoom.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-[#2D5A41] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>রিসেট</span>
            </button>
          </div>
        </div>

        {/* Live Public Output Previews */}
        <div className="flex flex-col items-center md:items-start border-t md:border-t-0 md:border-l border-[#EBE8E0] pt-4 md:pt-0 md:pl-6 space-y-3">
          <span className="text-[11px] font-bold text-[#5C665F]">পাবলিক সাইটে যেমন দেখাবে (Live Preview):</span>

          <div className="flex items-center gap-4">
            {/* Medium size card preview */}
            <div className="text-center">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 ${shapeClass} bg-[#F7F5F0] border-2 border-[#2D5A41] overflow-hidden relative shadow-xs`}
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Preview Medium"
                    draggable={false}
                    style={cropResult.style}
                  />
                )}
              </div>
              <span className="text-[10px] text-[#7A877E] mt-1 block">কার্ড ভিউ</span>
            </div>

            {/* Small icon preview */}
            <div className="text-center">
              <div
                className={`w-12 h-12 ${shapeClass} bg-[#F7F5F0] border-2 border-[#2D5A41] overflow-hidden relative shadow-xs`}
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Preview Small"
                    draggable={false}
                    style={cropResult.style}
                  />
                )}
              </div>
              <span className="text-[10px] text-[#7A877E] mt-1 block">ছোট ভিউ</span>
            </div>
          </div>

          {/* Quick Direction Nudge Controls */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-[#7A877E] block mb-1">সূক্ষ্ম পজিশন সমন্বয় (Nudge):</span>
            <div className="grid grid-cols-3 gap-1 w-24">
              <div />
              <button
                type="button"
                onClick={() => nudge(0, -10)}
                disabled={cropResult.maxY_pct === 0}
                className="p-1 rounded-md bg-[#F7F5F0] hover:bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center border border-[#EBE8E0] disabled:opacity-40 cursor-pointer"
                title="উপরে সরান"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => nudge(-10, 0)}
                disabled={cropResult.maxX_pct === 0}
                className="p-1 rounded-md bg-[#F7F5F0] hover:bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center border border-[#EBE8E0] disabled:opacity-40 cursor-pointer"
                title="বামে সরান"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange({ cropZoom: zoom, cropX: 0, cropY: 0, imageFit })}
                className="p-1 rounded-md bg-[#F7F5F0] hover:bg-[#E8EFEA] text-[9px] font-bold text-[#2D5A41] flex items-center justify-center border border-[#EBE8E0] cursor-pointer"
                title="মাঝখানে রিসেট"
              >
                •
              </button>
              <button
                type="button"
                onClick={() => nudge(10, 0)}
                disabled={cropResult.maxX_pct === 0}
                className="p-1 rounded-md bg-[#F7F5F0] hover:bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center border border-[#EBE8E0] disabled:opacity-40 cursor-pointer"
                title="ডানে সরান"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => nudge(0, 10)}
                disabled={cropResult.maxY_pct === 0}
                className="p-1 rounded-md bg-[#F7F5F0] hover:bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center border border-[#EBE8E0] disabled:opacity-40 cursor-pointer"
                title="নিচে সরান"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div />
            </div>
          </div>
        </div>
      </div>

      {/* Control Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#EBE8E0]">
        {/* Zoom Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#2D3630]">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-[#2D5A41]" />
              <span>জুম স্কেল (Zoom Scale)</span>
            </span>
            <span className="font-mono text-[#2D5A41] font-bold">{zoom.toFixed(1)}x</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.1)}
              className="p-1 rounded bg-[#F7F5F0] hover:bg-[#E8EFEA] text-[#2D5A41] border border-[#EBE8E0] cursor-pointer"
              title="জুম আউট"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={isLogo ? '0.5' : '1.0'}
              max="3.0"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-[#2D5A41] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.1)}
              className="p-1 rounded bg-[#F7F5F0] hover:bg-[#E8EFEA] text-[#2D5A41] border border-[#EBE8E0] cursor-pointer"
              title="জুম ইন"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pan Sliders */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#2D3630] mb-1">
            <span>পজিশন স্লাইডার (Pan X / Y)</span>
            <span className="font-mono text-[11px] text-[#7A877E]">{cropX}%, {cropY}%</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-[#7A877E] block mb-0.5">Horizontal (X):</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                disabled={cropResult.maxX_pct === 0}
                value={cropX}
                onChange={(e) =>
                  onChange({
                    cropZoom: zoom,
                    cropX: parseInt(e.target.value, 10),
                    cropY,
                    imageFit,
                  })
                }
                title="Horizontal Pan"
                className="w-full accent-[#2D5A41] cursor-pointer disabled:opacity-40"
              />
            </div>
            <div>
              <span className="text-[10px] text-[#7A877E] block mb-0.5">Vertical (Y):</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                disabled={cropResult.maxY_pct === 0}
                value={cropY}
                onChange={(e) =>
                  onChange({
                    cropZoom: zoom,
                    cropX,
                    cropY: parseInt(e.target.value, 10),
                    imageFit,
                  })
                }
                title="Vertical Pan"
                className="w-full accent-[#2D5A41] cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
