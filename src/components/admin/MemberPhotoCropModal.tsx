import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Crop, AlertTriangle } from 'lucide-react';
import { ImageCropDragEditor, ImageCropData } from './ImageCropDragEditor';
import { mediaService } from '../../services/mediaService';

interface MemberPhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  draftFile?: File | null;
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  imageFit?: 'cover' | 'contain';
  shape?: 'circle' | 'rounded' | 'square';
  onConfirm: (data: {
    photoUrl: string;
    cropZoom: number;
    cropX: number;
    cropY: number;
    imageFit?: 'cover' | 'contain';
  }) => Promise<void> | void;
  onCancel: () => void;
}

export const MemberPhotoCropModal: React.FC<MemberPhotoCropModalProps> = ({
  isOpen,
  imageSrc,
  draftFile,
  cropZoom = 1,
  cropX = 0,
  cropY = 0,
  imageFit = 'cover',
  shape = 'rounded',
  onConfirm,
  onCancel,
}) => {
  const [currentCrop, setCurrentCrop] = useState<ImageCropData>({
    cropZoom,
    cropX,
    cropY,
    imageFit,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentCrop({
        cropZoom: cropZoom || 1,
        cropX: cropX || 0,
        cropY: cropY || 0,
        imageFit: imageFit || 'cover',
      });
      setErrorMsg(null);
      setIsUploading(false);
    }
  }, [isOpen, cropZoom, cropX, cropY, imageFit]);

  if (!isOpen || !imageSrc) return null;

  const handleConfirm = async () => {
    try {
      setIsUploading(true);
      setErrorMsg(null);

      let finalUrl = imageSrc;

      // If this is a newly selected local file, commit it to production storage now
      if (draftFile) {
        const uploadRes = await mediaService.uploadFile(draftFile, {
          bucket: 'members',
        });
        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || 'ছবি আপলোড করতে ব্যর্থ হয়েছে।');
        }
        finalUrl = uploadRes.url;
      }

      await onConfirm({
        photoUrl: finalUrl,
        cropZoom: currentCrop.cropZoom,
        cropX: currentCrop.cropX,
        cropY: currentCrop.cropY,
        imageFit: currentCrop.imageFit,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'ছবি সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-2xl bg-white border border-[#2D5A41]/40 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EBE8E0]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#2D5A41]/10 text-[#2D5A41]">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D3630]">ছবি ক্রপ ও পজিশন সমন্বয় (Crop & Position)</h3>
              <p className="text-[11px] text-[#7A877E]">
                মাউস দিয়ে টেনে বা জুম করে সদস্যের মুখমণ্ডল ফ্রেমের ভেতরে নিখুঁতভাবে বসান
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="p-1 rounded-lg text-[#7A877E] hover:text-[#2D3630] hover:bg-[#F7F5F0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Interactive Crop Drag Viewport & Previews */}
        <ImageCropDragEditor
          imageUrl={imageSrc}
          cropZoom={currentCrop.cropZoom}
          cropX={currentCrop.cropX}
          cropY={currentCrop.cropY}
          imageFit={currentCrop.imageFit}
          shape={shape}
          onChange={(newCrop) => setCurrentCrop(newCrop)}
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#EBE8E0]">
          <span className="text-[11px] text-[#7A877E]">
            {draftFile ? 'বাতিল করলে ড্রাফট ছবি মুছে যাবে, পূর্বের ছবি অপরিবর্তিত থাকবে।' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0] font-semibold cursor-pointer disabled:opacity-50"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isUploading}
              className="px-5 py-2 rounded-lg bg-[#2D5A41] text-white font-semibold hover:bg-[#234733] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ছবি ব্যবহার করুন (Confirm Crop)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
