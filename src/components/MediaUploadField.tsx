import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Video,
  X,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ZoomIn,
} from 'lucide-react';
import { mediaService } from '../services/mediaService';

interface MediaUploadFieldProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  isVideo?: boolean;
  accept?: string;
  helperText?: string;
  maxSizeBytes?: number;
  className?: string;
  required?: boolean;
  shape?: 'circle' | 'rounded' | 'square';
  previewAspect?: 'square' | 'video' | 'wide' | 'auto';
  objectPosition?: string;
}

export const MediaUploadField: React.FC<MediaUploadFieldProps> = ({
  label,
  value,
  onChange,
  isVideo = false,
  accept = isVideo
    ? 'video/mp4,video/webm,video/ogg'
    : 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml',
  helperText,
  maxSizeBytes,
  className = '',
  required = false,
  shape = 'rounded',
  previewAspect = isVideo ? 'video' : 'auto',
  objectPosition = 'center',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const res = await mediaService.uploadFile(file, { isVideo, maxSizeBytes });
      if (res.success && res.url) {
        setFileName(file.name);
        onChange(res.url);
      } else {
        setErrorMsg(res.error || 'ফাইল আপলোড ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setErrorMsg('ফাইল প্রক্রিয়াকরণ ত্রুটি।');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmRemove = () => {
    onChange('');
    setFileName(null);
    setErrorMsg(null);
    setShowDeleteConfirm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasMedia = Boolean(value && value.trim().length > 0);

  // Shape classes for the preview thumbnail
  const shapeClass =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'square'
      ? 'rounded-none'
      : 'rounded-xl';

  const aspectClass =
    previewAspect === 'square'
      ? 'aspect-square'
      : previewAspect === 'video'
      ? 'aspect-video'
      : previewAspect === 'wide'
      ? 'aspect-[21/9]'
      : 'aspect-auto max-h-56';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#2D3630]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hasMedia && (
          <span className="text-[10px] text-[#2D5A41] font-semibold flex items-center gap-1 bg-[#E8EFEA] px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3 text-[#2D5A41]" />
            মিডিয়া সক্রিয় (লাইভ প্রিভিউ)
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id={`upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
      />

      {hasMedia ? (
        <div className="p-3.5 rounded-2xl border border-[#EBE8E0] bg-[#FDFCF9] space-y-3 shadow-2xs">
          {/* Main Visual Preview Area */}
          <div className="relative rounded-xl overflow-hidden bg-[#F1EDE4] border border-[#EBE8E0] flex items-center justify-center">
            {isVideo ? (
              <video
                src={value}
                controls
                className="w-full max-h-64 object-contain rounded-lg"
              >
                আপনার ব্রাউজার ভিডিও প্লেব্যাক সমর্থন করে না।
              </video>
            ) : (
              <div className={`w-full ${aspectClass} flex items-center justify-center p-1 overflow-hidden`}>
                <img
                  src={value}
                  alt="Live Preview"
                  className={`w-full h-full object-cover ${shapeClass} transition-all duration-200`}
                  style={{ objectPosition }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EBE8E0]">
            <div className="text-[11px] text-[#5C665F] truncate max-w-[200px] sm:max-w-xs font-mono">
              {fileName || (isVideo ? 'ভিডিও মিডিয়া ফাইল' : 'সংরক্ষিত ছবি')}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white hover:bg-[#F7F5F0] text-[#2D3630] text-xs font-semibold shadow-2xs transition-colors"
                title="নতুন ফাইল দিয়ে পরিবর্তন করুন"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5C665F]" />
                <span>পরিবর্তন করুন</span>
              </button>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                  title="মিডিয়াটি মুছে ফেলুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>মুছে ফেলুন</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1 p-1 bg-rose-50 border border-rose-300 rounded-lg text-xs animate-in fade-in">
                  <span className="text-[11px] text-rose-700 px-1 font-semibold">মুছবেন?</span>
                  <button
                    type="button"
                    onClick={handleConfirmRemove}
                    className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700"
                  >
                    হ্যাঁ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-0.5 rounded bg-white text-[#5C665F] border border-gray-300 text-[11px] hover:bg-gray-100"
                  >
                    না
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isUploading
              ? 'border-[#2D5A41]/40 bg-[#E8EFEA]/30 cursor-wait'
              : 'border-[#D9D6CC] hover:border-[#2D5A41] bg-[#FDFCF9] hover:bg-[#F7F5F0]'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-3 space-y-2 text-[#2D5A41]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">ফাইল আপলোড হচ্ছে ও প্রিভিউ তৈরি হচ্ছে...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 text-[#5C665F]">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#EBE8E0] flex items-center justify-center text-[#2D5A41] shadow-2xs">
                {isVideo ? <Video className="w-5 h-5" /> : <UploadCloud className="w-5 h-5 text-[#2D5A41]" />}
              </div>
              <div className="text-xs font-bold text-[#2D3630]">
                {isVideo ? 'ভিডিও আপলোড করতে ক্লিক করুন' : 'ছবি আপলোড করতে ক্লিক করুন'}
              </div>
              <p className="text-[11px] text-[#7A877E]">
                {helperText ||
                  (isVideo
                    ? 'MP4 বা WebM ফাইল (সর্বোচ্চ ৩৫ MB)'
                    : 'JPG, PNG, WebP বা SVG ফাইল (সর্বোচ্চ ১০ MB)')}
              </p>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] text-rose-600 font-medium animate-in fade-in flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </p>
      )}
    </div>
  );
};
