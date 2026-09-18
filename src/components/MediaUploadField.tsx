import React, { useRef, useState, useEffect } from 'react';
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
  Link as LinkIcon,
  ClipboardPaste,
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
  bucket?: 'branding' | 'members' | 'gallery' | 'activities' | 'notices' | 'receipts' | string;
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
  bucket = 'gallery',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setIsUploading(true);

    try {
      const res = await mediaService.uploadFile(file, {
        isVideo,
        maxSizeBytes,
        bucket,
        previousUrl: value,
      });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Clipboard paste (Ctrl+V) handler
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processFile(file);
          return;
        }
      }
    }
  };

  const handleConfirmRemove = () => {
    if (value) {
      mediaService.deleteMedia(value, bucket).catch(console.warn);
    }
    onChange('');
    setFileName(null);
    setErrorMsg(null);
    setShowDeleteConfirm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    if (urlDraft.trim()) {
      onChange(urlDraft.trim());
      setShowUrlInput(false);
      setUrlDraft('');
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
    <div
      ref={containerRef}
      onPaste={handlePaste}
      tabIndex={0}
      className={`space-y-2 outline-none ${className}`}
    >
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#2D3630]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-[#2D5A41] hover:underline flex items-center gap-1 font-medium"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? 'আপলোড মোড' : 'সরাসরি লিংক দিন'}</span>
          </button>
          {hasMedia && (
            <span className="text-[10px] text-[#2D5A41] font-semibold flex items-center gap-1 bg-[#E8EFEA] px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-[#2D5A41]" />
              মিডিয়া সক্রিয়
            </span>
          )}
        </div>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-2 p-2 bg-[#F7F5F0] rounded-xl border border-[#EBE8E0]">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#D9D6CC] bg-white text-xs text-[#2D3630] focus:outline-none focus:border-[#2D5A41]"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 py-1.5 rounded-lg bg-[#2D5A41] text-white text-xs font-semibold hover:bg-[#234733]"
          >
            প্রয়োগ করুন
          </button>
        </div>
      )}

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
              {fileName || (isVideo ? 'ভিডিও ফাইল' : 'সংরক্ষিত ছবি')}
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#2D5A41] bg-[#E8EFEA]/60 ring-2 ring-[#2D5A41]/30'
              : isUploading
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
                {isVideo ? 'ভিডিও আপলোড করতে ক্লিক করুন বা টেনে আনুন' : 'ছবি আপলোড করতে ক্লিক করুন, ড্র্যাগ করুন বা Ctrl+V পেস্ট করুন'}
              </div>
              <p className="text-[11px] text-[#7A877E]">
                {helperText ||
                  (isVideo
                    ? 'MP4 বা WebM ফাইল (সর্বোচ্চ ৩৫ MB)'
                    : 'JPG, PNG, WebP বা SVG ফাইল (সর্বোচ্চ ১০ MB) — কপি করা ছবি এখানে সরাসরি পেস্ট (Ctrl+V) করতে পারেন')}
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
