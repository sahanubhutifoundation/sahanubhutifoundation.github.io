import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  RotateCw,
  FolderPlus,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { GalleryItem, Activity } from '../../types';
import { mediaService } from '../../services/mediaService';
import { storageService } from '../../services/storageService';

interface FileUploadState {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedItem?: GalleryItem;
}

interface GalleryBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCategories: string[];
  activities: Activity[];
  onSuccess: (newItems: GalleryItem[]) => void;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export const GalleryBulkUploadModal: React.FC<GalleryBulkUploadModalProps> = ({
  isOpen,
  onClose,
  existingCategories,
  activities,
  onSuccess,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isCreatingNewCat, setIsCreatingNewCat] = useState<boolean>(false);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activityId, setActivityId] = useState<string>('');
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Filter available categories
  const validCategories = Array.from(
    new Set(
      ['মানবিক সহায়তা', 'জরুরি সেবা', 'স্বাস্থ্য ও চিকিৎসা', 'শিক্ষা সহায়তা', 'পারিবারিক মিলনমেলা', ...existingCategories]
        .filter(Boolean)
        .filter((c) => c !== 'all')
    )
  );

  useEffect(() => {
    if (!selectedCategory && validCategories.length > 0) {
      setSelectedCategory(validCategories[0]);
    }
  }, [validCategories, selectedCategory]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
    };
  }, [files]);

  if (!isOpen) return null;

  const handleFilesSelected = (incomingFiles: FileList | File[]) => {
    const list = Array.from(incomingFiles);
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const newItems: FileUploadState[] = [];

    for (const f of list) {
      if (!validImageTypes.includes(f.type) && !f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        onShowToast?.(`"${f.name}" সমর্থিত ইমেজ ফরম্যাট নয় (শুধুমাত্র JPG, PNG, WEBP)।`, 'error');
        continue;
      }
      if (f.size > 15 * 1024 * 1024) {
        onShowToast?.(`"${f.name}" ফাইলটি অতিরিক্ত বড় (সর্বোচ্চ ১৫ MB)।`, 'error');
        continue;
      }

      // Generate a clean title from filename
      const rawName = f.name.replace(/\.[^/.]+$/, '');
      const cleanTitle = rawName.replace(/[-_]+/g, ' ').trim();

      newItems.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        title: cleanTitle || 'গ্যালারি স্থিরচিত্র',
        status: 'pending',
      });
    }

    if (newItems.length > 0) {
      setFiles((prev) => [...prev, ...newItems]);
      onShowToast?.(`${newItems.length}টি ছবি নির্বাচনের তালিকায় যুক্ত হয়েছে।`, 'success');
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleStartUpload = async () => {
    const effectiveCategory = isCreatingNewCat ? newCategoryName.trim() : selectedCategory.trim();
    if (!effectiveCategory) {
      onShowToast?.('অনুগ্রহ করে গ্যালারি বিভাগ নির্বাচন বা টাইপ করুন।', 'error');
      return;
    }

    const pendingFiles = files.filter((f) => f.status !== 'success');
    if (pendingFiles.length === 0) {
      onShowToast?.('আপলোডের জন্য কোনো নতুন ছবি বাকি নেই।', 'error');
      return;
    }

    setIsUploading(true);
    const newlyCreatedItems: GalleryItem[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of pendingFiles) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', error: undefined } : f))
      );

      try {
        // 1. Upload to persistent Supabase Storage bucket 'gallery'
        const uploadRes = await mediaService.uploadFile(item.file, {
          bucket: 'gallery',
        });

        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || 'ফাইল ক্লাউড স্টোরেজে আপলোড করা সম্ভব হয়নি।');
        }

        // 2. Create standard GalleryItem record
        const persistentUrl = uploadRes.url;
        const year = date ? date.split('-')[0] : new Date().getFullYear().toString();
        const galleryRecord: GalleryItem = {
          id: `gal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: {
            bn: item.title.trim() || 'গ্যালারি স্থিরচিত্র',
            en: '',
            ar: '',
          },
          mediaUrl: persistentUrl,
          url: persistentUrl,
          thumbnailUrl: persistentUrl,
          type: 'photo',
          category: effectiveCategory,
          year: year,
          date: date,
          activityId: activityId || undefined,
          isPublished: isPublished,
          createdAt: new Date().toISOString(),
        };

        // 3. Persist to database & storageService
        const saveRes = await storageService.saveGalleryItemAsync(galleryRecord);
        if (!saveRes.success) {
          throw new Error(saveRes.error || 'ডাটাবেজে গ্যালারি রেকর্ড সংরক্ষণ ব্যর্থ হয়েছে।');
        }

        newlyCreatedItems.push(galleryRecord);
        successCount++;

        // Update item status in UI
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: 'success', uploadedItem: galleryRecord, error: undefined }
              : f
          )
        );
      } catch (err: any) {
        failCount++;
        console.error(`Bulk upload failed for ${item.file.name}:`, err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'error', error: err.message || 'আপলোড ব্যর্থ' } : f
          )
        );
      }
    }

    setIsUploading(false);

    if (newlyCreatedItems.length > 0) {
      onSuccess(newlyCreatedItems);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
    }

    if (failCount === 0) {
      onShowToast?.(`অভিনন্দন! ${successCount}টি ছবি সফলভাবে গ্যালারিতে আপলোড ও সংরক্ষিত হয়েছে।`, 'success');
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      onShowToast?.(
        `${successCount}টি ছবি সফল হয়েছে, ${failCount}টি ছবিতে ত্রুটি দেখা দিয়েছে। ব্যর্থ ছবিগুলো পুনরায় চেষ্টা করতে পারেন।`,
        'error'
      );
    }
  };

  const totalCount = files.length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      onClick={() => !isUploading && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#2D5A41]/40 shadow-2xl p-5 sm:p-7 space-y-5 text-xs text-[#2D3630]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EBE8E0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8EFEA] border border-[#2D5A41]/20 flex items-center justify-center text-[#2D5A41]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#2D3630]">
                একাধিক ছবি এক সাথে গ্যালারিতে আপলোড (Bulk Media Upload)
              </h3>
              <p className="text-[11px] text-[#7A877E]">
                একই ক্যাটাগরিতে একাধিক ছবি নির্বাচন করে সেন্ট্রাল ক্লাউড স্টোরেজে আপলোড করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="p-1.5 text-[#7A877E] hover:text-[#2D3630] rounded-lg hover:bg-[#F7F5F0] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Batch Settings Form */}
        <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Category selection */}
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                গ্যালারি বিভাগ (Category) *
              </label>
              {!isCreatingNewCat ? (
                <div className="flex gap-1.5">
                  <select
                    disabled={isUploading}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:ring-1 focus:ring-[#2D5A41] focus:border-[#2D5A41] disabled:opacity-60"
                  >
                    {validCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => setIsCreatingNewCat(true)}
                    title="নতুন ক্যাটাগরি তৈরি করুন"
                    className="px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-white hover:bg-[#E8EFEA] text-[#2D5A41] font-bold text-xs"
                  >
                    + নতুন
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    disabled={isUploading}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="নতুন বিভাগের নাম..."
                    className="flex-1 px-3 py-2 rounded-lg border border-[#2D5A41] bg-white text-[#2D3630] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      setIsCreatingNewCat(false);
                      setNewCategoryName('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-stone-500 hover:text-stone-800 text-xs"
                  >
                    তালিকা
                  </button>
                </div>
              )}
            </div>

            {/* Date Selection */}
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                তারিখ (Date) *
              </label>
              <input
                type="date"
                disabled={isUploading}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:ring-1 focus:ring-[#2D5A41] focus:border-[#2D5A41] disabled:opacity-60"
              />
            </div>

            {/* Activity Linking */}
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                কার্যক্রম লিংক (ঐচ্ছিক)
              </label>
              <select
                disabled={isUploading}
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:ring-1 focus:ring-[#2D5A41] focus:border-[#2D5A41] disabled:opacity-60"
              >
                <option value="">কোনোটি নয় (সাধারণ গ্যালারি)</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {typeof a.title === 'string' ? a.title : a.title.bn || a.title.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#2D3630]">
              <input
                type="checkbox"
                disabled={isUploading}
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded accent-[#2D5A41]"
              />
              <span>পাবলিক গ্যালারিতে সরাসরি প্রকাশিত রাখুন (Visible on Public Gallery)</span>
            </label>

            <span className="text-[11px] text-[#7A877E]">
              বছর: {date ? date.split('-')[0] : new Date().getFullYear()}
            </span>
          </div>
        </div>

        {/* Drag & Drop File Selector Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) {
              handleFilesSelected(e.dataTransfer.files);
            }
          }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#2D5A41] bg-[#E8EFEA]/40 scale-[0.99]'
              : 'border-[#D9D6CC] bg-[#FDFCF9] hover:bg-[#F7F5F0] hover:border-[#2D5A41]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isUploading}
            onChange={(e) => {
              if (e.target.files) {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2 text-[#5C665F]">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-[#EBE8E0] flex items-center justify-center text-[#2D5A41]">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-[#2D3630]">
                একসাথে একাধিক ছবি নির্বাচন করতে ক্লিক করুন অথবা ড্রপ করুন
              </p>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                (JPG, PNG, WEBP — প্রতি ছবি সর্বোচ্চ ১৫ MB)
              </p>
            </div>
          </div>
        </div>

        {/* Selected Files List & Previews */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#EBE8E0]">
              <span className="font-bold text-xs text-[#2D3630] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2D5A41]" />
                <span>নির্বাচিত ছবিসমূহ ({files.length}টি)</span>
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                {successCount > 0 && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                    {successCount}টি সম্পন্ন
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-semibold border border-rose-200">
                    {errorCount}টি ত্রুটি
                  </span>
                )}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => {
                      files.forEach((f) => f.previewUrl.startsWith('blob:') && URL.revokeObjectURL(f.previewUrl));
                      setFiles([]);
                    }}
                    className="text-stone-500 hover:text-rose-600 underline ml-2"
                  >
                    সব মুছুন
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[36vh] overflow-y-auto p-1">
              {files.map((item, idx) => (
                <div
                  key={item.id}
                  className={`relative p-2.5 rounded-xl border flex gap-2.5 items-start transition-all bg-white shadow-2xs ${
                    item.status === 'success'
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : item.status === 'error'
                      ? 'border-rose-300 bg-rose-50/20'
                      : item.status === 'uploading'
                      ? 'border-[#2D5A41] bg-[#E8EFEA]/20'
                      : 'border-[#EBE8E0]'
                  }`}
                >
                  {/* Thumbnail Preview */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-[#EBE8E0]">
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                    {item.status === 'success' && (
                      <div className="absolute inset-0 bg-emerald-700/60 flex items-center justify-center text-white">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    )}
                    {item.status === 'error' && (
                      <div className="absolute inset-0 bg-rose-700/60 flex items-center justify-center text-white">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Title & Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      type="text"
                      disabled={isUploading || item.status === 'success'}
                      value={item.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setFiles((prev) =>
                          prev.map((f) => (f.id === item.id ? { ...f, title: newTitle } : f))
                        );
                      }}
                      placeholder="ছবির শিরোনাম..."
                      className="w-full px-2 py-1 text-xs rounded border border-[#EBE8E0] bg-[#FDFCF9] focus:ring-1 focus:ring-[#2D5A41] text-[#2D3630] font-semibold"
                    />
                    <div className="flex items-center justify-between text-[10px] text-[#7A877E]">
                      <span>{Math.round(item.file.size / 1024)} KB</span>
                      {item.status === 'success' && (
                        <span className="text-emerald-700 font-bold">সংরক্ষিত</span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-rose-600 font-bold truncate max-w-[90px]" title={item.error}>
                          {item.error || 'ব্যর্থ'}
                        </span>
                      )}
                      {item.status === 'uploading' && (
                        <span className="text-[#2D5A41] font-bold">আপলোড হচ্ছে...</span>
                      )}
                    </div>
                  </div>

                  {/* Remove Button */}
                  {!isUploading && item.status !== 'success' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(item.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                      title="তালিকা থেকে বাদ দিন"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls & Upload Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#EBE8E0]">
          <div className="text-xs text-[#7A877E]">
            {isUploading ? (
              <span className="flex items-center gap-2 text-[#2D5A41] font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ক্লাউড স্টোরেজে ছবি ও ডাটাবেজ রেকর্ড তৈরি হচ্ছে...</span>
              </span>
            ) : files.length > 0 ? (
              <span>
                মোট {files.length}টি ফাইলের মধ্যে {pendingCount + errorCount}টি আপলোডের জন্য প্রস্তুত।
              </span>
            ) : (
              <span>শুরু করতে উপরের বক্সে ছবি নির্বাচন করুন।</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0] text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              বাতিল
            </button>

            {errorCount > 0 && !isUploading && (
              <button
                type="button"
                onClick={handleStartUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>ব্যর্থ {errorCount}টি পুনরায় চেষ্টা করুন</span>
              </button>
            )}

            <button
              type="button"
              disabled={isUploading || files.length === 0 || (pendingCount === 0 && errorCount === 0)}
              onClick={handleStartUpload}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-bold shadow-xs active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>আপলোড চলমান...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    {files.length > 0
                      ? `${pendingCount + errorCount}টি ছবি আপলোড করুন`
                      : 'ছবি আপলোড করুন'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
