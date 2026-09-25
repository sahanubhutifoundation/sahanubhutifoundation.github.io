import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import { storageService } from '../../services/storageService';
import { fetchFundData } from '../../services/fundService';
import { ConfirmModal } from '../../components/ConfirmModal';
import { MediaUploadField } from '../../components/MediaUploadField';
import { DesignationBadge } from '../../components/DesignationBadge';
import { MemberAvatar } from '../../components/MemberAvatar';
import { ImageCropDragEditor } from '../../components/admin/ImageCropDragEditor';
import { MemberPhotoCropModal } from '../../components/admin/MemberPhotoCropModal';
import { AdminExpensesTab } from './AdminExpensesTab';
import { AdminSiteSettingsTab } from './AdminSiteSettingsTab';
import { AdminDesignationsManager } from './AdminDesignationsManager';
import { AdminSidebar, AdminSection } from './AdminSidebar';
import { CloudSyncCard } from './CloudSyncCard';
import { backupService } from '../../services/backupService';
import { BackupRestoreModal } from '../../components/admin/BackupRestoreModal';
import { ActivityCategoryManager } from '../../components/admin/ActivityCategoryManager';
import { ActivityCategoryInlineSelector } from '../../components/admin/ActivityCategoryInlineSelector';
import {
  FoundationConfig,
  Activity,
  Notice,
  Member,
  Designation,
  GalleryItem,
  ContactMessage,
  FundData,
  ExpenseRecord,
  FundVisibilitySettings,
  MultilingualText,
  YearlyFundSource,
} from '../../types';
import {
  Lock,
  LogOut,
  Home,
  Users,
  Inbox,
  FileText,
  Bell,
  ImageIcon,
  Wallet,
  Settings,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  CalendarDays,
  Star,
  Download,
  Upload,
  Key,
  Mail,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Receipt,
  Sliders,
  Save,
  Layers,
  Tag,
  Menu,
  Sparkles,
  Globe,
  PhoneCall,
  Languages,
  LayoutDashboard,
  Loader2,
  AlertCircle,
  Crop,
  UploadCloud,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [memberSubTab, setMemberSubTab] = useState<'list' | 'designations' | 'style'>('list');
  const [fundSubTab, setFundSubTab] = useState<'sheet' | 'ledger'>('sheet');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State data
  const [config, setConfig] = useState<FoundationConfig>(storageService.getConfig());
  const [members, setMembers] = useState<Member[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [visibilitySettings, setVisibilitySettings] = useState<FundVisibilitySettings>(
    storageService.getFundVisibility()
  );
  const [fundPreview, setFundPreview] = useState<FundData | null>(null);
  const [testingFund, setTestingFund] = useState(false);
  const [aboutLang, setAboutLang] = useState<'bn' | 'en' | 'ar'>('bn');
  const [activityLang, setActivityLang] = useState<'bn' | 'en' | 'ar'>('bn');
  const [noticeLang, setNoticeLang] = useState<'bn' | 'en' | 'ar'>('bn');

  // Forms / Modals state
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [editingYearSource, setEditingYearSource] = useState<Partial<YearlyFundSource> | null>(null);
  const [isNewYearSource, setIsNewYearSource] = useState(false);
  const [testingYear, setTestingYear] = useState<string | null>(null);
  const [yearTestResult, setYearTestResult] = useState<{ [year: string]: FundData }>({});
  const [memberCropModal, setMemberCropModal] = useState<{
    isOpen: boolean;
    imageSrc: string;
    draftFile: File | null;
    cropZoom: number;
    cropX: number;
    cropY: number;
  }>({
    isOpen: false,
    imageSrc: '',
    draftFile: null,
    cropZoom: 1,
    cropX: 0,
    cropY: 0,
  });
  const memberFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCropForNewFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)');
      return;
    }
    const draftUrl = URL.createObjectURL(file);
    setMemberCropModal({
      isOpen: true,
      imageSrc: draftUrl,
      draftFile: file,
      cropZoom: 1,
      cropX: 0,
      cropY: 0,
    });
  };

  const handleOpenCropForExistingPhoto = () => {
    if (!editingMember?.photoUrl) return;
    setMemberCropModal({
      isOpen: true,
      imageSrc: editingMember.photoUrl,
      draftFile: null,
      cropZoom: editingMember.cropZoom || 1,
      cropX: editingMember.cropX || 0,
      cropY: editingMember.cropY || 0,
    });
  };

  const handleCloseCropModal = () => {
    if (memberCropModal.draftFile && memberCropModal.imageSrc.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(memberCropModal.imageSrc);
      } catch {}
    }
    setMemberCropModal({
      isOpen: false,
      imageSrc: '',
      draftFile: null,
      cropZoom: 1,
      cropX: 0,
      cropY: 0,
    });
    if (memberFileInputRef.current) {
      memberFileInputRef.current.value = '';
    }
  };

  const handleConfirmMemberCrop = async (result: {
    photoUrl: string;
    cropZoom: number;
    cropX: number;
    cropY: number;
    imageFit?: 'cover' | 'contain';
  }) => {
    if (editingMember) {
      setEditingMember({
        ...editingMember,
        photoUrl: result.photoUrl,
        cropZoom: result.cropZoom,
        cropX: result.cropX,
        cropY: result.cropY,
        imageFit: result.imageFit || 'cover',
      });
    }
    handleCloseCropModal();
    showToast('ছবি সফলভাবে সংরক্ষিত হয়েছে।');
  };
  const [editingActivity, setEditingActivity] = useState<Partial<Activity> | null>(null);
  const [activitySubTab, setActivitySubTab] = useState<'list' | 'categories'>('list');
  const [editingNotice, setEditingNotice] = useState<Partial<Notice> | null>(null);
  const [editingGallery, setEditingGallery] = useState<Partial<GalleryItem> | null>(null);
  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [inboxSearch, setInboxSearch] = useState('');

  // Form refs for smooth scroll and viewport awareness
  const memberFormRef = useRef<HTMLDivElement>(null);
  const activityFormRef = useRef<HTMLDivElement>(null);
  const noticeFormRef = useRef<HTMLDivElement>(null);
  const galleryFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingMember) {
      setTimeout(() => {
        memberFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = memberFormRef.current?.querySelector('input:not([type="hidden"]), select, textarea') as HTMLElement;
        input?.focus();
      }, 60);
    }
  }, [editingMember !== null, editingMember?.id]);

  useEffect(() => {
    if (editingActivity) {
      setTimeout(() => {
        activityFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = activityFormRef.current?.querySelector('input:not([type="hidden"]), select, textarea') as HTMLElement;
        input?.focus();
      }, 60);
    }
  }, [editingActivity !== null, editingActivity?.id]);

  useEffect(() => {
    if (editingNotice) {
      setTimeout(() => {
        noticeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = noticeFormRef.current?.querySelector('input:not([type="hidden"]), select, textarea') as HTMLElement;
        input?.focus();
      }, 60);
    }
  }, [editingNotice !== null, editingNotice?.id]);

  useEffect(() => {
    if (editingGallery) {
      setTimeout(() => {
        galleryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = galleryFormRef.current?.querySelector('input:not([type="hidden"]), select, textarea') as HTMLElement;
        input?.focus();
      }, 60);
    }
  }, [editingGallery !== null, editingGallery?.id]);

  // Multilingual field helpers for Activity
  const getActivityText = (field: keyof Activity, lang: 'bn' | 'en' | 'ar'): string => {
    if (!editingActivity) return '';
    const val = editingActivity[field];
    if (val && typeof val === 'object') {
      return (val as any)[lang] || '';
    }
    return lang === 'bn' && typeof val === 'string' ? val : '';
  };

  const setActivityText = (field: keyof Activity, lang: 'bn' | 'en' | 'ar', text: string) => {
    setEditingActivity((prev) => {
      if (!prev) return null;
      const current = prev[field];
      const obj = (current && typeof current === 'object')
        ? { ...(current as any) }
        : { bn: typeof current === 'string' ? current : '', en: '', ar: '' };
      obj[lang] = text;
      const updated: any = { ...prev, [field]: obj };
      if (field === 'shortSummary') updated.summary = obj;
      if (field === 'summary') updated.shortSummary = obj;
      if (field === 'fullDescription') updated.description = obj;
      if (field === 'description') updated.fullDescription = obj;
      return updated;
    });
  };

  // Multilingual field helpers for Notice
  const getNoticeText = (field: keyof Notice, lang: 'bn' | 'en' | 'ar'): string => {
    if (!editingNotice) return '';
    const val = editingNotice[field];
    if (val && typeof val === 'object') {
      return (val as any)[lang] || '';
    }
    return lang === 'bn' && typeof val === 'string' ? val : '';
  };

  const setNoticeText = (field: keyof Notice, lang: 'bn' | 'en' | 'ar', text: string) => {
    setEditingNotice((prev) => {
      if (!prev) return null;
      const current = prev[field];
      const obj = (current && typeof current === 'object')
        ? { ...(current as any) }
        : { bn: typeof current === 'string' ? current : '', en: '', ar: '' };
      obj[lang] = text;
      return { ...prev, [field]: obj };
    });
  };

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'মুছে ফেলুন'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  };

  // Password change state
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // Fund URL input state
  const [fundUrlInput, setFundUrlInput] = useState('');

  // Status message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Small, unobtrusive operation status indicator (Requirement 10)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'checking' | 'saving' | 'success' | 'error'>('idle');
  const [syncStatusText, setSyncStatusText] = useState<string>('');

  const triggerSyncStatus = (status: 'idle' | 'checking' | 'saving' | 'success' | 'error', text?: string) => {
    setSyncStatus(status);
    if (text) setSyncStatusText(text);
    if (status === 'success') {
      setTimeout(() => setSyncStatus('idle'), 2500);
    } else if (status === 'error') {
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  useEffect(() => {
    const authed = authService.isAuthenticated();
    setIsAuthenticated(authed);
    if (authed) {
      loadAllData();
    }

    // Auto-refresh when cloud changes are pushed or synced
    const handleExternalUpdate = () => {
      if (authService.isAuthenticated()) {
        loadAllData();
      }
    };

    window.addEventListener('sf_cloud_synced', handleExternalUpdate);
    window.addEventListener('sf_data_updated', handleExternalUpdate);
    window.addEventListener('sf_config_updated', handleExternalUpdate);

    return () => {
      window.removeEventListener('sf_cloud_synced', handleExternalUpdate);
      window.removeEventListener('sf_data_updated', handleExternalUpdate);
      window.removeEventListener('sf_config_updated', handleExternalUpdate);
    };
  }, []);

  // Scroll to top on navigation/section switch
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!fundUrlInput && config.fundSourceUrl) {
      setFundUrlInput(config.fundSourceUrl);
    }
  }, [activeSection, config.fundSourceUrl]);

  const loadAllData = () => {
    const conf = storageService.getConfig();
    setConfig(conf);
    setFundUrlInput(conf.fundSourceUrl || '');
    setMembers(storageService.getMembers());
    setDesignations(storageService.getDesignations());
    setActivities(storageService.getActivities());
    setNotices(storageService.getNotices());
    setGallery(storageService.getGalleryItems());
    setMessages(storageService.getContactMessages());
    setExpenses(storageService.getExpenses());
    setVisibilitySettings(storageService.getFundVisibility());
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const valid = await authService.verifyPassword(passwordInput);
    if (valid) {
      setIsAuthenticated(true);
      setPasswordInput('');
      loadAllData();
    } else {
      setLoginError(t('adminInvalidPassword'));
    }
  };

  // Logout handler
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  // Return to home handler
  const handleReturnHome = () => {
    window.location.hash = '';
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Member operations
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name) return;

    triggerSyncStatus('saving', 'সদস্য সংরক্ষণ হচ্ছে...');
    const newMember: Member = {
      id: editingMember.id || `mem-${Date.now()}`,
      serial: Number(editingMember.serial) || members.length + 1,
      name: editingMember.name,
      gender: editingMember.gender,
      role: editingMember.role || '',
      designationId: editingMember.designationId,
      photoUrl: editingMember.photoUrl || '',
      bio: editingMember.bio || '',
      address: editingMember.address || '',
      phone: editingMember.phone || '',
      showPhone: editingMember.showPhone !== false,
      email: editingMember.email || '',
      showEmail: editingMember.showEmail !== false,
      joiningDate: editingMember.joiningDate || new Date().toISOString().split('T')[0],
      showJoiningDate: editingMember.showJoiningDate !== false,
      isActive: editingMember.isActive !== false,
      isFamilyMember: true,
      useGlobalImageShape: editingMember.useGlobalImageShape !== false,
      imageShape: editingMember.useGlobalImageShape === false ? editingMember.imageShape : undefined,
      imageFit: editingMember.imageFit || 'cover',
      imagePosition: editingMember.imagePosition,
      cropZoom: editingMember.cropZoom || 1,
      cropX: editingMember.cropX || 0,
      cropY: editingMember.cropY || 0,
      facebook: editingMember.facebook || '',
      showFacebook: editingMember.showFacebook !== false,
      instagram: editingMember.instagram || '',
      showInstagram: editingMember.showInstagram !== false,
      whatsapp: editingMember.whatsapp || '',
      showWhatsapp: editingMember.showWhatsapp !== false,
      imo: editingMember.imo || '',
      showImo: editingMember.showImo !== false,
      showSocials: editingMember.showSocials !== false,
      socialLinks: {
        facebook: editingMember.facebook || '',
        instagram: editingMember.instagram || '',
        whatsapp: editingMember.whatsapp || '',
        imo: editingMember.imo || '',
      },
      createdAt: editingMember.createdAt || new Date().toISOString(),
    };

    const res = await storageService.saveMemberAsync(newMember);
    if (res.success && res.data) {
      setMembers(res.data);
      setEditingMember(null);
      triggerSyncStatus('success', 'সদস্য সংরক্ষিত ও ভেরিফাইড');
      showToast('সদস্য তথ্য সফলভাবে সেন্ট্রাল ডাটাবেজে সংরক্ষিত হয়েছে!');
    } else {
      triggerSyncStatus('error', 'সংরক্ষণ ব্যর্থ');
      showToast(`সংরক্ষণ ব্যর্থ: ${res.error || 'সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি'}`);
    }
  };

  const handleDeleteMember = (id: string) => {
    requestConfirm('সদস্য মুছে ফেলুন', 'আপনি কি নিশ্চিতভাবে এই সদস্যকে তালিকা থেকে মুছে ফেলতে চান?', async () => {
      triggerSyncStatus('saving', 'সদস্য মুছে ফেলা হচ্ছে...');
      const res = await storageService.deleteMemberAsync(id);
      if (res.success && res.data) {
        setMembers(res.data);
        triggerSyncStatus('success', 'সদস্য মুছে ফেলা হয়েছে');
        showToast('সদস্য সেন্ট্রাল ডাটাবেজ থেকে মুছে ফেলা হয়েছে।');
      } else {
        triggerSyncStatus('error', 'মুছে ফেলা ব্যর্থ');
        showToast(`মুছে ফেলা ব্যর্থ: ${res.error || 'অপ্রত্যাশিত ত্রুটি'}`);
      }
    });
  };

  // Activity operations
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;

    const getMulti = (val: any): MultilingualText => {
      if (val && typeof val === 'object') {
        return {
          bn: typeof val.bn === 'string' ? val.bn : '',
          en: typeof val.en === 'string' ? val.en : '',
          ar: typeof val.ar === 'string' ? val.ar : '',
        };
      }
      if (typeof val === 'string') {
        return { bn: val, en: '', ar: '' };
      }
      return { bn: '', en: '', ar: '' };
    };

    const titleObj = getMulti(editingActivity.title);
    if (!titleObj.bn && !titleObj.en && !titleObj.ar) {
      showToast('অনুগ্রহ করে কার্যক্রমের শিরোনাম দিন');
      return;
    }

    triggerSyncStatus('saving', 'কার্যক্রম সংরক্ষণ হচ্ছে...');
    const titleStr = titleObj.bn || titleObj.en || titleObj.ar || 'activity';

    // Strict separation: never copy description to summary or vice-versa
    const summaryVal = getMulti(editingActivity.shortSummary || editingActivity.summary);
    const descVal = getMulti(editingActivity.fullDescription || editingActivity.description);

    const purposeVal = editingActivity.purpose ? getMulti(editingActivity.purpose) : undefined;
    const locationVal = editingActivity.location ? getMulti(editingActivity.location) : undefined;
    const beneficiariesVal = editingActivity.beneficiaries ? getMulti(editingActivity.beneficiaries) : undefined;
    const outcomesVal = editingActivity.outcomes ? getMulti(editingActivity.outcomes) : undefined;

    const newAct: Activity = {
      id: editingActivity.id || `act-${Date.now()}`,
      slug: editingActivity.slug || titleStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || `activity-${Date.now()}`,
      title: titleObj,
      summary: summaryVal,
      shortSummary: summaryVal,
      description: descVal,
      fullDescription: descVal,
      purpose: purposeVal,
      location: locationVal,
      beneficiaries: beneficiariesVal,
      outcomes: outcomesVal,
      showShortSummaryInDetail: Boolean(editingActivity.showShortSummaryInDetail),
      showOnMediaPage: Boolean(editingActivity.showOnMediaPage),
      date: editingActivity.date || new Date().toISOString().split('T')[0],
      category: editingActivity.category || 'সাধারণ',
      coverImage: editingActivity.coverImage || '',
      images: Array.isArray(editingActivity.images) ? editingActivity.images : [],
      galleryImages: Array.isArray(editingActivity.galleryImages) ? editingActivity.galleryImages : [],
      isPublished: editingActivity.isPublished !== false,
      linkedExpenseId: editingActivity.linkedExpenseId || undefined,
      financialRecord: editingActivity.financialRecord || undefined,
      createdAt: editingActivity.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await storageService.saveActivityAsync(newAct);
    if (res.success && res.data) {
      setActivities(res.data);

      // Sync activity image to gallery if showOnMediaPage is true
      if (newAct.showOnMediaPage && newAct.coverImage) {
        const existingGal = gallery.find((g) => g.activityId === newAct.id || g.id === `gal-act-${newAct.id}`);
        const actGalItem: GalleryItem = {
          id: existingGal ? existingGal.id : `gal-act-${newAct.id}`,
          type: 'photo',
          mediaUrl: newAct.coverImage,
          url: newAct.coverImage,
          thumbnailUrl: newAct.coverImage,
          title: newAct.title,
          category: newAct.category || 'কার্যক্রম',
          year: newAct.date ? newAct.date.split('-')[0] : new Date().getFullYear().toString(),
          date: newAct.date,
          activityId: newAct.id,
          isPublished: newAct.isPublished,
          createdAt: existingGal?.createdAt || newAct.createdAt || new Date().toISOString(),
        };
        const galRes = await storageService.saveGalleryItemAsync(actGalItem);
        if (galRes.success && galRes.data) {
          setGallery(galRes.data);
        }
      } else {
        // If unchecked or coverImage was removed, remove any linked media gallery item
        const existingGal = gallery.find((g) => g.activityId === newAct.id || g.id === `gal-act-${newAct.id}`);
        if (existingGal) {
          const galRes = await storageService.deleteGalleryItemAsync(existingGal.id);
          if (galRes.success && galRes.data) {
            setGallery(galRes.data);
          }
        }
      }

      setEditingActivity(null);
      triggerSyncStatus('success', 'কার্যক্রম সংরক্ষিত ও ভেরিফাইড');
      showToast('কার্যক্রম সফলভাবে সেন্ট্রাল ডাটাবেজে সংরক্ষিত হয়েছে!');
    } else {
      triggerSyncStatus('error', 'সংরক্ষণ ব্যর্থ');
      showToast(`সংরক্ষণ ব্যর্থ: ${res.error || 'সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি'}`);
    }
  };

  const handleDeleteActivity = (id: string) => {
    requestConfirm('কার্যক্রম মুছে ফেলুন', 'আপনি কি এই কার্যক্রম মুছে ফেলতে চান?', async () => {
      triggerSyncStatus('saving', 'কার্যক্রম মুছে ফেলা হচ্ছে...');
      const res = await storageService.deleteActivityAsync(id);
      if (res.success && res.data) {
        setActivities(res.data);
        // Also remove any linked gallery item
        const existingGal = gallery.find((g) => g.activityId === id || g.id === `gal-act-${id}`);
        if (existingGal) {
          const galRes = await storageService.deleteGalleryItemAsync(existingGal.id);
          if (galRes.success && galRes.data) {
            setGallery(galRes.data);
          }
        }
        triggerSyncStatus('success', 'কার্যক্রম মুছে ফেলা হয়েছে');
        showToast('কার্যক্রম মুছে ফেলা হয়েছে।');
      } else {
        triggerSyncStatus('error', 'মুছে ফেলা ব্যর্থ');
        showToast(`মুছে ফেলা ব্যর্থ: ${res.error || 'অপ্রত্যাশিত ত্রুটি'}`);
      }
    });
  };

  // Notice operations
  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice) return;

    const getMulti = (val: any): MultilingualText => {
      if (val && typeof val === 'object') {
        return {
          bn: typeof val.bn === 'string' ? val.bn : '',
          en: typeof val.en === 'string' ? val.en : '',
          ar: typeof val.ar === 'string' ? val.ar : '',
        };
      }
      if (typeof val === 'string') {
        return { bn: val, en: '', ar: '' };
      }
      return { bn: '', en: '', ar: '' };
    };

    const titleObj = getMulti(editingNotice.title);
    const bodyObj = getMulti(editingNotice.body);

    if (!titleObj.bn && !titleObj.en && !titleObj.ar) {
      showToast('অনুগ্রহ করে নোটিশের শিরোনাম দিন');
      return;
    }

    triggerSyncStatus('saving', 'নোটিশ সংরক্ষণ হচ্ছে...');

    const newNotice: Notice = {
      id: editingNotice.id || `not-${Date.now()}`,
      title: titleObj,
      body: bodyObj,
      date: editingNotice.date || new Date().toISOString().split('T')[0],
      isImportant: Boolean(editingNotice.isImportant),
      isPublished: editingNotice.isPublished !== false,
      attachmentUrl: editingNotice.attachmentUrl || '',
      createdAt: editingNotice.createdAt || new Date().toISOString(),
    };

    const res = await storageService.saveNoticeAsync(newNotice);
    if (res.success && res.data) {
      setNotices(res.data);
      setEditingNotice(null);
      triggerSyncStatus('success', 'নোটিশ সংরক্ষিত ও ভেরিফাইড');
      showToast('বিজ্ঞপ্তি সফলভাবে সেন্ট্রাল ডাটাবেজে সংরক্ষিত হয়েছে!');
    } else {
      triggerSyncStatus('error', 'সংরক্ষণ ব্যর্থ');
      showToast(`সংরক্ষণ ব্যর্থ: ${res.error || 'সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি'}`);
    }
  };

  const handleDeleteNotice = (id: string) => {
    requestConfirm('নোটিশ মুছে ফেলুন', 'আপনি কি এই নোটিশ মুছে ফেলতে চান?', async () => {
      triggerSyncStatus('saving', 'নোটিশ মুছে ফেলা হচ্ছে...');
      const res = await storageService.deleteNoticeAsync(id);
      if (res.success && res.data) {
        setNotices(res.data);
        triggerSyncStatus('success', 'নোটিশ মুছে ফেলা হয়েছে');
        showToast('বিজ্ঞপ্তি মুছে ফেলা হয়েছে।');
      } else {
        triggerSyncStatus('error', 'মুছে ফেলা ব্যর্থ');
        showToast(`মুছে ফেলা ব্যর্থ: ${res.error || 'অপ্রত্যাশিত ত্রুটি'}`);
      }
    });
  };

  // Gallery operations (Image-Only with Activity Linking)
  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGallery || (!editingGallery.url && !editingGallery.mediaUrl)) return;

    triggerSyncStatus('saving', 'মিডিয়া আইটেম সংরক্ষণ হচ্ছে...');
    const titleStr = typeof editingGallery.title === 'string' ? editingGallery.title : editingGallery.title?.bn || '';
    const imgUrl = editingGallery.url || editingGallery.mediaUrl || '';
    const newG: GalleryItem = {
      id: editingGallery.id || `gal-${Date.now()}`,
      title: typeof editingGallery.title === 'object' ? editingGallery.title : { bn: titleStr, en: titleStr, ar: titleStr },
      mediaUrl: imgUrl,
      url: imgUrl,
      type: 'photo',
      thumbnailUrl: editingGallery.thumbnailUrl || imgUrl,
      category: editingGallery.category || 'সাধারণ',
      year: editingGallery.year || (editingGallery.date ? editingGallery.date.split('-')[0] : new Date().getFullYear().toString()),
      date: editingGallery.date || (editingGallery.year ? `${editingGallery.year}-01-01` : new Date().toISOString().split('T')[0]),
      activityId: editingGallery.activityId || undefined,
      isPublished: editingGallery.isPublished !== false,
      createdAt: editingGallery.createdAt || new Date().toISOString(),
    };

    const res = await storageService.saveGalleryItemAsync(newG);
    if (res.success && res.data) {
      setGallery(res.data);
      setEditingGallery(null);
      triggerSyncStatus('success', 'মিডিয়া আইটেম সংরক্ষিত ও ভেরিফাইড');
      showToast('মিডিয়া আইটেম সফলভাবে সেন্ট্রাল ডাটাবেজে সংরক্ষিত হয়েছে!');
    } else {
      triggerSyncStatus('error', 'সংরক্ষণ ব্যর্থ');
      showToast(`সংরক্ষণ ব্যর্থ: ${res.error || 'সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি'}`);
    }
  };

  const handleDeleteGallery = (id: string) => {
    requestConfirm('গ্যালারি আইটেম মুছে ফেলুন', 'আপনি কি এই ছবিটি মুছে ফেলতে চান?', async () => {
      triggerSyncStatus('saving', 'মুছে ফেলা হচ্ছে...');
      const res = await storageService.deleteGalleryItemAsync(id);
      if (res.success && res.data) {
        setGallery(res.data);
        triggerSyncStatus('success', 'মুছে ফেলা হয়েছে');
        showToast('গ্যালারি আইটেম মুছে ফেলা হয়েছে।');
      } else {
        triggerSyncStatus('error', 'মুছে ফেলা ব্যর্থ');
        showToast(`মুছে ফেলা ব্যর্থ: ${res.error || 'অপ্রত্যাশিত ত্রুটি'}`);
      }
    });
  };

  // Message operations
  const handleToggleMessageRead = (id: string, currentStatus: boolean) => {
    const updated = storageService.updateMessageStatus(id, !currentStatus);
    setMessages(updated);
    if (activeMessage && activeMessage.id === id) {
      setActiveMessage({ ...activeMessage, isRead: !currentStatus });
    }
  };

  const handleDeleteMessage = (id: string) => {
    requestConfirm('বার্তা মুছে ফেলুন', 'আপনি কি এই বার্তাটি মুছে ফেলতে চান?', () => {
      const updated = storageService.deleteContactMessage(id);
      setMessages(updated);
      if (activeMessage?.id === id) setActiveMessage(null);
      showToast('বার্তা মুছে ফেলা হয়েছে।');
    });
  };

  // Fund connection update
  const handleSaveFundSource = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerSyncStatus('saving', 'তহবিল ডাটা সোর্স সংরক্ষণ হচ্ছে...');
    const updatedConfig = { ...config, fundSourceUrl: fundUrlInput.trim() };
    const res = await storageService.saveConfigAsync(updatedConfig);
    if (res.success && res.data) {
      setConfig(res.data);
      triggerSyncStatus('success', 'তহবিল সোর্স সংরক্ষিত');
      showToast('তহবিল ডাটা সোর্স URL সেন্ট্রাল ডাটাবেজে সংরক্ষিত হয়েছে!');
    } else {
      triggerSyncStatus('error', 'সংরক্ষণ ব্যর্থ');
      showToast(`সংরক্ষণ ব্যর্থ: ${res.error || 'সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি'}`);
    }
  };

  const handleTestFundSource = async () => {
    setTestingFund(true);
    try {
      const res = await fetchFundData(fundUrlInput.trim());
      setFundPreview(res);
      showToast(res.status === 'live' ? 'সংযোগ সফল!' : 'উৎস থেকে ডাটা পাওয়া যায়নি।');
    } catch (err) {
      console.warn('Test error:', err);
      showToast('সংযোগ পরীক্ষা ব্যর্থ হয়েছে।');
    } finally {
      setTestingFund(false);
    }
  };

  // Year Source Manager Handlers
  const handleAddYearSource = () => {
    setIsNewYearSource(true);
    setEditingYearSource({
      year: '',
      url: '',
      gid: '0',
      label: '',
      enabled: true,
      isPublic: true,
      isDefault: false,
      notes: '',
    });
  };

  const handleEditYearSource = (source: YearlyFundSource) => {
    setIsNewYearSource(false);
    setEditingYearSource({ ...source });
  };

  const handleSaveYearSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYearSource || !editingYearSource.year?.trim()) {
      showToast('আর্থিক বছর প্রদান করুন (যেমন: 2027)');
      return;
    }

    const yearKey = editingYearSource.year.trim();
    const existingList: YearlyFundSource[] =
      config.yearlyFundSources && config.yearlyFundSources.length > 0
        ? [...config.yearlyFundSources]
        : [
            {
              year: '2026',
              url: config.fundSourceUrl,
              gid: '0',
              label: '২০২৬ আর্থিক বছর (চলতি)',
              enabled: true,
              isPublic: true,
              isDefault: true,
            },
            {
              year: '2025',
              url: '',
              label: '২০২৫ আর্থিক বছর',
              enabled: true,
              isPublic: true,
            },
            {
              year: '2024',
              url: '',
              label: '২০২৪ আর্থিক বছর',
              enabled: true,
              isPublic: true,
            },
          ];

    let updatedList: YearlyFundSource[];
    const isDefault = Boolean(editingYearSource.isDefault);

    if (isNewYearSource) {
      if (existingList.some((s) => s.year === yearKey)) {
        showToast(`${yearKey} সালের জন্য ইতোমধ্যে একটি সোর্স কনফিগার করা রয়েছে!`);
        return;
      }
      const newSource: YearlyFundSource = {
        year: yearKey,
        url: editingYearSource.url?.trim() || '',
        gid: editingYearSource.gid?.trim() || '0',
        label: editingYearSource.label?.trim() || `${yearKey} আর্থিক বছর`,
        enabled: editingYearSource.enabled !== false,
        isPublic: editingYearSource.isPublic !== false,
        isDefault,
        notes: editingYearSource.notes?.trim() || '',
      };
      updatedList = isDefault
        ? [...existingList.map((s) => ({ ...s, isDefault: false })), newSource]
        : [...existingList, newSource];
    } else {
      updatedList = existingList.map((s) => {
        if (s.year === yearKey) {
          return {
            ...s,
            url: editingYearSource.url?.trim() || '',
            gid: editingYearSource.gid?.trim() || '0',
            label: editingYearSource.label?.trim() || `${yearKey} আর্থিক বছর`,
            enabled: editingYearSource.enabled !== false,
            isPublic: editingYearSource.isPublic !== false,
            isDefault,
            notes: editingYearSource.notes?.trim() || '',
          };
        }
        return isDefault ? { ...s, isDefault: false } : s;
      });
    }

    // Sort descending by year
    updatedList.sort((a, b) => b.year.localeCompare(a.year));

    // Update config and sync fundSourceUrl if default
    const updatedConfig: FoundationConfig = {
      ...config,
      yearlyFundSources: updatedList,
    };
    if (isDefault && editingYearSource.url?.trim()) {
      updatedConfig.fundSourceUrl = editingYearSource.url.trim();
    }

    setConfig(updatedConfig);
    storageService.saveConfig(updatedConfig);
    setEditingYearSource(null);
    showToast(`${yearKey} আর্থিক বছরের সোর্স সফলভাবে সংরক্ষিত হয়েছে!`);
  };

  const handleToggleYearSource = (year: string) => {
    const list = config.yearlyFundSources || [];
    const updatedList = list.map((s) => (s.year === year ? { ...s, enabled: !s.enabled } : s));
    const updatedConfig = { ...config, yearlyFundSources: updatedList };
    setConfig(updatedConfig);
    storageService.saveConfig(updatedConfig);
    showToast(`${year} সালের সোর্স স্ট্যাটাস পরিবর্তন করা হয়েছে!`);
  };

  const handleSetDefaultYear = (year: string) => {
    const list = config.yearlyFundSources || [];
    const target = list.find((s) => s.year === year);
    const updatedList = list.map((s) => ({ ...s, isDefault: s.year === year }));
    const updatedConfig: FoundationConfig = {
      ...config,
      yearlyFundSources: updatedList,
      fundSourceUrl: target?.url || config.fundSourceUrl,
    };
    setConfig(updatedConfig);
    storageService.saveConfig(updatedConfig);
    showToast(`${year} সালকে সক্রিয় ডিফল্ট হিসেবে নির্ধারণ করা হয়েছে!`);
  };

  const handleDeleteYearSource = (year: string) => {
    const list = config.yearlyFundSources || [];
    if (list.length <= 1) {
      showToast('অন্তত একটি আর্থিক বছর কনফিগারেশন থাকা আবশ্যক।');
      return;
    }
    requestConfirm(
      'আর্থিক বছর ডিলিট নিশ্চিতকরণ',
      `আপনি কি নিশ্চিত যে "${year}" আর্থিক বছরের গুগল শিট সোর্স মুছে ফেলতে চান? এটি শুধুমাত্র কনফিগারেশন তালিকা থেকে সরাবে।`,
      () => {
        const updatedList = list.filter((s) => s.year !== year);
        if (updatedList.length > 0 && !updatedList.some((s) => s.isDefault)) {
          updatedList[0].isDefault = true;
        }
        const updatedConfig = { ...config, yearlyFundSources: updatedList };
        setConfig(updatedConfig);
        storageService.saveConfig(updatedConfig);
        showToast(`${year} সালের সোর্স সফলভাবে মুছে ফেলা হয়েছে!`);
      }
    );
  };

  const handleTestSpecificYearSource = async (source: YearlyFundSource) => {
    if (!source.url || !source.url.trim()) {
      showToast(`${source.year} সালের জন্য কোনো গুগল শিট লিংক দেওয়া হয়নি।`);
      return;
    }
    setTestingYear(source.year);
    try {
      const res = await fetchFundData(source.url.trim(), true, source.year, source.gid);
      setYearTestResult((prev) => ({ ...prev, [source.year]: res }));
      if (res.status === 'live') {
        showToast(`${source.year} সালের গুগল শিট সংযোগ সফল! (মোট আদায়: ৳ ${res.amountReceived.toLocaleString()})`);
      } else {
        showToast(`${source.year} সালের শিট থেকে ডাটা পাওয়া যায়নি। পারমিশন যাচাই করুন।`);
      }
    } catch (e) {
      console.warn('Test year error:', e);
      showToast(`${source.year} সালের সংযোগ পরীক্ষা ব্যর্থ হয়েছে।`);
    } finally {
      setTestingYear(null);
    }
  };

  // Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (!currPass) {
      setPassMsg({ text: 'বর্তমান পাসওয়ার্ড প্রদান করুন।', isError: true });
      return;
    }
    if (!newPass || newPass.length < 6) {
      setPassMsg({ text: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', isError: true });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ text: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।', isError: true });
      return;
    }

    const res = await authService.changePassword(currPass, newPass);
    if (res.success) {
      setPassMsg({ text: res.message, isError: false });
      setCurrPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setPassMsg({ text: res.message, isError: true });
    }
  };

  // Data backup export
  const handleExportBackup = () => {
    backupService.exportFullBackup(true);
    showToast('সম্পূর্ণ ডাটাবেজ ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!');
  };

  // Data backup restore
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = storageService.importAllData(content);
        if (success) {
          loadAllData();
          showToast('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!');
        } else {
          showToast('ব্যাকআপ ফাইলটি ত্রুটিযুক্ত ছিল।');
        }
      }
    };
    reader.readAsText(file);
  };

  // Unread messages count
  const unreadCount = messages.filter((m) => !m.isRead).length;

  // IF NOT AUTHENTICATED -> SHOW ELEGANT LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#E8EFEA] border border-[#2D5A41]/20 mx-auto flex items-center justify-center text-[#2D5A41] shadow-2xs">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-[#2D3630]">{t('adminLoginTitle')}</h1>
            <p className="text-xs text-[#5C665F]">
              সহানুভূতি ফাউন্ডেশনের প্রশাসনিক ড্যাশবোর্ডে প্রবেশের পাসওয়ার্ড প্রদান করুন
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2D3630] mb-1">
                {t('adminPasswordLabel')}
              </label>
              <div className="relative">
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-sm text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#7A877E] hover:text-[#2D3630] transition-colors"
                  title={showLoginPass ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                >
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] shadow-2xs transition-all active:scale-98"
            >
              {t('adminLoginBtn')}
            </button>

            <button
              type="button"
              onClick={handleReturnHome}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#2D5A41] bg-[#E8EFEA] hover:bg-[#D9E5DC] border border-[#2D5A41]/20 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>{t('returnHomeBtn')}</span>
            </button>
          </form>

          <div className="text-center text-[11px] text-[#A4B3A8] pt-2 border-t border-[#EBE8E0]">
            নিরাপদ এনক্রিপ্টেশন • সেশন মেমোরি ব্যবস্থা
          </div>
        </div>
      </div>
    );
  }

  // IF AUTHENTICATED -> SHOW COMPLETE ADMIN DASHBOARD WITH RESPONSIVE SIDEBAR
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-[#2D3630] text-white text-xs font-semibold shadow-xl border border-[#3E4942] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#82CCA3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Mobile Top App Bar (< lg) */}
      <div className="lg:hidden flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#EBE8E0] shadow-xs mb-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] text-[#2D3630] hover:bg-[#EBE8E0] transition-colors"
            title="মেনু ড্রয়ার খুলুন"
          >
            <Menu className="w-5 h-5 text-[#2D5A41]" />
          </button>
          <div>
            <h1 className="text-xs font-bold text-[#2D3630] leading-tight">
              {config.nameBn}
            </h1>
            <span className="text-[10px] text-[#2D5A41] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A41] animate-pulse" />
              অ্যাডমিন কন্ট্রোল
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveSection('inbox')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold"
            >
              <Inbox className="w-3 h-3" />
              <span>{unreadCount} নতুন</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200"
            title="লগআউট"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Responsive Sidebar (Desktop persistent, Mobile drawer) */}
        <AdminSidebar
          activeSection={activeSection}
          onSelectSection={(sec) => setActiveSection(sec)}
          unreadCount={unreadCount}
          membersCount={members.length}
          activitiesCount={activities.length}
          noticesCount={notices.length}
          galleryCount={gallery.length}
          onLogout={handleLogout}
          onExportBackup={handleExportBackup}
          onReturnHome={handleReturnHome}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full space-y-6">

          {/* Unobtrusive Operation & Sync Indicator (Requirement 10) */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-xl border border-[#EBE8E0] shadow-2xs text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#5C665F]">সিস্টেম স্ট্যাটাস:</span>
              {syncStatus === 'checking' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                  <span>{syncStatusText || 'যাচাই করা হচ্ছে...'}</span>
                </span>
              )}
              {syncStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                  <span>{syncStatusText || 'সংরক্ষণ হচ্ছে...'}</span>
                </span>
              )}
              {syncStatus === 'success' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 animate-in fade-in">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{syncStatusText || 'সফলভাবে সংরক্ষিত'}</span>
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>{syncStatusText || 'ত্রুটি ঘটেছে'}</span>
                </span>
              )}
              {syncStatus === 'idle' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F7F5F0] text-[#5C665F] border border-[#EBE8E0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>সক্রিয় ও প্রস্তুত</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                triggerSyncStatus('checking', 'ডাটা সিঙ্ক যাচাই...');
                const res = await storageService.syncFromCloud();
                if (res.success) {
                  loadAllData();
                  triggerSyncStatus('success', 'সিঙ্ক সম্পন্ন');
                } else {
                  triggerSyncStatus('idle');
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] text-[#5C665F] hover:text-[#2D3630] font-medium transition-colors"
              title="ম্যানুয়াল ডাটা রিফ্রেশ"
            >
              <RefreshCw className="w-3 h-3 text-[#2D5A41]" />
              <span className="hidden sm:inline">রিফ্রেশ</span>
            </button>
          </div>

      {/* SECTION 1: OVERVIEW STATS & DASHBOARD */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Dashboard Header Banner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#2D5A41] animate-pulse" />
                <span className="text-xs font-bold text-[#2D5A41] uppercase tracking-wider">
                  অ্যাডমিন ড্যাশবোর্ড
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#2D3630] mt-1">
                {config.nameBn}
              </h1>
              <p className="text-xs text-[#5C665F]">
                ফাউন্ডেশনের ওয়েবসাইট ও কনটেন্ট ম্যানেজমেন্ট ড্যাশবোর্ড
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReturnHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2D5A41]/30 bg-[#E8EFEA] text-xs font-semibold text-[#2D5A41] hover:bg-[#D9E5DC] transition-colors"
                title="মূল ওয়েবসাইট দেখুন"
              >
                <Home className="w-3.5 h-3.5" />
                <span>ওয়েবসাইট</span>
              </button>

              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EBE8E0] text-xs font-semibold text-[#5C665F] hover:bg-[#F7F5F0] transition-colors"
                title="ডাটাবেজ ব্যাকআপ"
              >
                <Download className="w-3.5 h-3.5 text-[#7A877E]" />
                <span>ব্যাকআপ</span>
              </button>
            </div>
          </div>

          {/* Prominent Inbox Alert Banner if Unread Messages Exist */}
          {unreadCount > 0 ? (
            <div
              onClick={() => setActiveSection('inbox')}
              className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-2xs flex items-center justify-between gap-4 cursor-pointer hover:bg-amber-500/15 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Inbox className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
                    <span>যোগাযোগ ইনবক্সে {unreadCount} টি নতুন অপঠিত বার্তা এসেছে!</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      জরুরি
                    </span>
                  </h4>
                  <p className="text-xs text-[#5C665F] mt-0.5">
                    ভিজিটরদের পাঠানো বার্তা পড়তে এবং উত্তর দিতে এখানে ক্লিক করুন।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-amber-900 group-hover:translate-x-1 transition-transform shrink-0">
                <span>ইনবক্স খুলুন</span>
                <span className="text-base font-normal">→</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setActiveSection('inbox')}
              className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-[#2D5A41]/40 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] text-[#2D5A41] flex items-center justify-center shrink-0 border border-[#EBE8E0]">
                  <Inbox className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#2D3630]">
                  যোগাযোগ ইনবক্স: মোট {messages.length} টি বার্তা সংরক্ষিত রয়েছে
                </span>
              </div>
              <span className="text-xs font-semibold text-[#2D5A41] group-hover:underline flex items-center gap-1">
                ইনবক্স দেখুন →
              </span>
            </div>
          )}

          {/* Cloud Database (Supabase) Synchronization & Migration Card */}
          <CloudSyncCard
            onRefreshLocalState={loadAllData}
            onShowToast={showToast}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => {
                setActiveSection('members');
                setMemberSubTab('list');
              }}
              className="p-5 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs cursor-pointer hover:border-[#2D5A41]/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7A877E]">মোট সদস্য</span>
                <Users className="w-4 h-4 text-[#7A877E] group-hover:text-[#2D5A41] transition-colors" />
              </div>
              <div className="text-2xl font-bold text-[#2D3630] mt-1 font-mono">
                {members.length}
              </div>
              <span className="text-[11px] text-[#2D5A41] mt-1 block">
                {members.filter((m) => m.isActive).length} জন সক্রিয় সদস্য
              </span>
            </div>

            <div
              onClick={() => setActiveSection('activities')}
              className="p-5 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs cursor-pointer hover:border-[#2D5A41]/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7A877E]">কার্যক্রম ও উদ্যোগ</span>
                <FileText className="w-4 h-4 text-[#7A877E] group-hover:text-[#2D5A41] transition-colors" />
              </div>
              <div className="text-2xl font-bold text-[#2D3630] mt-1 font-mono">
                {activities.length}
              </div>
              <span className="text-[11px] text-[#7A877E] mt-1 block">
                {activities.filter((a) => a.isPublished).length} টি প্রকাশিত
              </span>
            </div>

            <div
              onClick={() => setActiveSection('notices')}
              className="p-5 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs cursor-pointer hover:border-[#2D5A41]/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7A877E]">বিজ্ঞপ্তি ও নোটিশ</span>
                <Bell className="w-4 h-4 text-[#7A877E] group-hover:text-[#2D5A41] transition-colors" />
              </div>
              <div className="text-2xl font-bold text-[#2D3630] mt-1 font-mono">
                {notices.length}
              </div>
              <span className="text-[11px] text-[#7A877E] mt-1 block">
                {notices.filter((n) => n.isPublished).length} টি বিজ্ঞাপিত
              </span>
            </div>

            <div
              onClick={() => setActiveSection('inbox')}
              className="p-5 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs cursor-pointer hover:border-[#2D5A41]/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7A877E]">যোগাযোগ ইনবক্স</span>
                <Inbox className="w-4 h-4 text-[#7A877E] group-hover:text-[#2D5A41] transition-colors" />
              </div>
              <div className="text-2xl font-bold text-[#2D5A41] mt-1 font-mono">
                {unreadCount}
              </div>
              <span className="text-[11px] text-[#7A877E] mt-1 block">
                মোট বার্তা: {messages.length} টি
              </span>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-[#2D3630]">দ্রুত পদক্ষেপ ও ম্যানেজমেন্ট শর্টকাট</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingMember({ serial: members.length + 1, isActive: true });
                  setActiveSection('members');
                  setMemberSubTab('list');
                }}
                className="p-3 rounded-xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 hover:bg-[#F7F5F0] text-xs font-bold text-[#2D3630] flex flex-col items-center gap-2 text-center transition-all"
              >
                <Plus className="w-5 h-5 text-[#2D5A41]" />
                <span>নতুন সদস্য যুক্ত</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingActivity({ isPublished: true });
                  setActiveSection('activities');
                }}
                className="p-3 rounded-xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 hover:bg-[#F7F5F0] text-xs font-bold text-[#2D3630] flex flex-col items-center gap-2 text-center transition-all"
              >
                <FileText className="w-5 h-5 text-[#2D5A41]" />
                <span>নতুন কার্যক্রম যুক্ত</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingNotice({ isPublished: true, isImportant: false });
                  setActiveSection('notices');
                }}
                className="p-3 rounded-xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 hover:bg-[#F7F5F0] text-xs font-bold text-[#2D3630] flex flex-col items-center gap-2 text-center transition-all"
              >
                <Bell className="w-5 h-5 text-[#2D5A41]" />
                <span>নতুন নোটিশ লিখুন</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('fund');
                  setFundSubTab('sheet');
                }}
                className="p-3 rounded-xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 hover:bg-[#F7F5F0] text-xs font-bold text-[#2D3630] flex flex-col items-center gap-2 text-center transition-all"
              >
                <Wallet className="w-5 h-5 text-[#2D5A41]" />
                <span>তহবিল উৎস ও শিট</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('foundation')}
                className="p-3 rounded-xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 hover:bg-[#F7F5F0] text-xs font-bold text-[#2D3630] flex flex-col items-center gap-2 text-center transition-all"
              >
                <Globe className="w-5 h-5 text-[#2D5A41]" />
                <span>ব্র্যান্ড ও লোগো CMS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('homepage')}
                className="p-3 rounded-xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 hover:bg-[#F7F5F0] text-xs font-bold text-[#2D3630] flex flex-col items-center gap-2 text-center transition-all"
              >
                <Sparkles className="w-5 h-5 text-[#2D5A41]" />
                <span>হোমপেজ হিরো ও বাটন</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('about')}
                className="p-3 rounded-xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 hover:bg-[#F7F5F0] text-xs font-bold text-[#2D3630] flex flex-col items-center gap-2 text-center transition-all"
              >
                <Edit2 className="w-5 h-5 text-[#2D5A41]" />
                <span>আমাদের সম্পর্কে CMS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('contact')}
                className="p-3 rounded-xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 hover:bg-[#F7F5F0] text-xs font-bold text-[#2D3630] flex flex-col items-center gap-2 text-center transition-all"
              >
                <PhoneCall className="w-5 h-5 text-[#2D5A41]" />
                <span>যোগাযোগ ও সোশ্যাল</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: CONTACT INBOX */}
      {activeSection === 'inbox' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2D3630]">
              যোগাযোগ ইনবক্স ({messages.length})
            </h2>
          </div>

          {messages.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Message List (5 cols) */}
              <div className="lg:col-span-5 space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setActiveMessage(msg);
                      if (!msg.isRead) handleToggleMessageRead(msg.id, false);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs ${
                      activeMessage?.id === msg.id
                        ? 'bg-[#E8EFEA] border-[#2D5A41]/40 shadow-xs'
                        : msg.isRead
                        ? 'bg-white border-[#EBE8E0] hover:bg-[#F7F5F0]'
                        : 'bg-[#F7F5F0] border-[#D4CEBF] font-semibold hover:bg-[#EBE8E0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#2D3630]">{msg.senderName}</span>
                      <span className="text-[10px] text-[#A4B3A8]">
                        {new Date(msg.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {msg.subject && (
                      <div className="text-[#5C665F] font-medium line-clamp-1">
                        {msg.subject}
                      </div>
                    )}
                    <p className="text-[#7A877E] line-clamp-1 mt-0.5">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Message Detail View (7 cols) */}
              <div className="lg:col-span-7">
                {activeMessage ? (
                  <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-4">
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EBE8E0]">
                      <div>
                        <h3 className="text-base font-bold text-[#2D3630]">
                          {activeMessage.subject || 'কোনো বিষয় নেই'}
                        </h3>
                        <div className="text-xs text-[#5C665F] mt-1 space-y-0.5">
                          <div>
                            প্রেরক: <strong className="text-[#2D3630]">{activeMessage.senderName}</strong>
                          </div>
                          <div>
                            ইমেইল: <a href={`mailto:${activeMessage.senderEmail}`} className="text-[#2D5A41] hover:underline">{activeMessage.senderEmail}</a>
                          </div>
                          {activeMessage.senderPhone && (
                            <div>ফোন: {activeMessage.senderPhone}</div>
                          )}
                          <div>
                            তারিখ: {new Date(activeMessage.submittedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleMessageRead(activeMessage.id, activeMessage.isRead)}
                          className="p-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0]"
                          title={activeMessage.isRead ? 'অপঠিত হিসেবে চিহ্নিত করুন' : 'পঠিত হিসেবে চিহ্নিত করুন'}
                        >
                          {activeMessage.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(activeMessage.id)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-[#2D3630] whitespace-pre-line leading-relaxed min-h-[140px] p-4 bg-[#F7F5F0] rounded-xl">
                      {activeMessage.message}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <a
                        href={`mailto:${activeMessage.senderEmail}?subject=Re: ${encodeURIComponent(activeMessage.subject || 'সহানুভূতি ফাউন্ডেশন থেকে যোগাযোগ')}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>ইমেইলে উত্তর দিন</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl bg-white border border-[#EBE8E0] text-[#A4B3A8] text-xs">
                    বিস্তারিত দেখতে বাম পাশ থেকে একটি বার্তা নির্বাচন করুন।
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-white border border-[#EBE8E0] text-[#7A877E] text-xs">
              ইনবক্সে বর্তমানে কোনো বার্তা নেই।
            </div>
          )}
        </div>
      )}

      {/* SECTION: MEMBERS & DESIGNATIONS */}
      {activeSection === 'members' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex overflow-x-auto gap-2 p-1.5 bg-[#F7F5F0] rounded-2xl border border-[#EBE8E0]">
            <button
              type="button"
              onClick={() => setMemberSubTab('list')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                memberSubTab === 'list'
                  ? 'bg-white text-[#2D5A41] shadow-xs border border-[#EBE8E0]'
                  : 'text-[#5C665F] hover:text-[#2D3630]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>সদস্য তালিকা ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMemberSubTab('designations')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                memberSubTab === 'designations'
                  ? 'bg-white text-[#2D5A41] shadow-xs border border-[#EBE8E0]'
                  : 'text-[#5C665F] hover:text-[#2D3630]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>পদবী ব্যবস্থাপনা ({designations.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMemberSubTab('style')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                memberSubTab === 'style'
                  ? 'bg-white text-[#2D5A41] shadow-xs border border-[#EBE8E0]'
                  : 'text-[#5C665F] hover:text-[#2D3630]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>কার্ড প্রদর্শন শৈলী</span>
            </button>
          </div>

          {memberSubTab === 'designations' && (
            <AdminDesignationsManager
              members={members}
              designations={designations}
              onDesignationsUpdated={(list) => setDesignations(list)}
              showToast={showToast}
              requestConfirm={requestConfirm}
            />
          )}

          {memberSubTab === 'style' && (
            <AdminSiteSettingsTab
              config={config}
              onConfigChange={(updated) => {
                setConfig(updated);
                storageService.saveConfig(updated);
              }}
              onShowToast={showToast}
              currentSection="members"
              hideSubNav={true}
            />
          )}

          {memberSubTab === 'list' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#2D3630]">
                    সদস্য তালিকা ও স্বয়ংক্রিয় ক্রমবণ্টন ({members.length})
                  </h2>
                  <p className="text-xs text-[#5C665F]">
                    যেকারো ক্রমিক নম্বর পরিবর্তন করলে পরবর্তী ক্রমগুলো স্বয়ংক্রিয়ভাবে নিচে নেমে যাবে।
                  </p>
                </div>
                <button
                  onClick={() =>
                    setEditingMember({
                      serial: members.length + 1,
                      isActive: true,
                      useGlobalImageShape: true,
                      imageShape: undefined,
                      imageFit: 'cover',
                      cropZoom: 1,
                      cropX: 0,
                      cropY: 0,
                      showSocials: true,
                      showFacebook: true,
                      showInstagram: true,
                      showWhatsapp: true,
                      showImo: true,
                      showPhone: true,
                      showEmail: true,
                      showJoiningDate: true,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold self-start sm:self-center shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন সদস্য যুক্ত করুন</span>
                </button>
              </div>

          {/* Member Edit / Add Form Centered Viewport Modal */}
          {editingMember && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) setEditingMember(null);
              }}
            >
              <div
                id="member-edit-form"
                ref={memberFormRef}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (items) {
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.startsWith('image/')) {
                        const file = items[i].getAsFile();
                        if (file) {
                          e.preventDefault();
                          handleOpenCropForNewFile(file);
                          break;
                        }
                      }
                    }
                  }
                }}
                className="bg-white rounded-2xl border border-[#2D5A41]/40 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE8E0] bg-[#FDFCF9] shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-[#2D3630]">
                      {editingMember.id ? 'সদস্যের তথ্য সম্পাদনা' : 'নতুন সদস্য ফরম'}
                    </h3>
                    <p className="text-[11px] text-[#7A877E]">
                      সকল তথ্য, ছবি ক্রপ ও যোগাযোগ মাধ্যম নির্ধারণ করে সংরক্ষণ করুন
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingMember(null)}
                    className="p-1.5 text-[#7A877E] hover:text-[#2D3630] rounded-lg hover:bg-[#EBE8E0]/60 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <form onSubmit={handleSaveMember} id="member-modal-form" className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-[#2D3630] mb-1">
                        ক্রমিক নম্বর (Serial No) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editingMember.serial || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, serial: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                      <span className="text-[10px] text-[#A4B3A8]">
                        পূর্ববর্তী কাউকে এই নম্বরে দিলে বাকিরা নিচে শিফট হবে
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-[#2D3630] mb-1">
                        সদস্যের পূর্ণ নাম <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingMember.name || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>

                    <div className="sm:col-span-2 p-3 rounded-xl bg-[#F7F5F0]/70 border border-[#EBE8E0] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="block font-bold text-[#2D3630]">
                          পদবী নির্বাচন ও ব্যাজ প্রিভিউ (Designation & Badge)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMember(null);
                            setActiveSection('members');
                            setMemberSubTab('designations');
                          }}
                          className="text-[11px] font-semibold text-[#2D5A41] hover:underline self-start sm:self-auto"
                        >
                          + পদবী তালিকা ম্যানেজ করুন
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[11px] text-[#5C665F] mb-1">
                            তালিকা থেকে পূর্বনির্ধারিত পদবী বাছুন:
                          </span>
                          <select
                            value={editingMember.designationId || ''}
                            onChange={(e) => {
                              const desId = e.target.value;
                              const selected = designations.find((d) => d.id === desId);
                              setEditingMember({
                                ...editingMember,
                                designationId: desId || undefined,
                                role: selected ? selected.name.bn : editingMember.role,
                              });
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          >
                            <option value="">— কোনোটিই নয় / কাস্টম পদবী —</option>
                            {designations
                              .filter((d) => d.isEnabled !== false)
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name.bn} ({d.name.en})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <span className="block text-[11px] text-[#5C665F] mb-1">
                            পদবীর নাম (বাংলায় প্রদর্শন):
                          </span>
                          <input
                            type="text"
                            placeholder="যেমন: প্রতিষ্ঠাতা সদস্য / প্রধান উপদেষ্টা"
                            value={editingMember.role || ''}
                            onChange={(e) =>
                              setEditingMember({ ...editingMember, role: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>
                      </div>

                      {/* Live Badge Preview */}
                      <div className="pt-2 border-t border-[#EBE8E0] flex items-center justify-between gap-3 text-xs">
                        <span className="text-[#7A877E] text-[11px]">
                          কার্ডে ব্যাজটি যেভাবে দেখাবে:
                        </span>
                        <div>
                          {(() => {
                            const des = editingMember.designationId
                              ? designations.find((d) => d.id === editingMember.designationId)
                              : designations.find(
                                  (d) =>
                                    d.name.bn === editingMember.role ||
                                    d.name.en.toLowerCase() === (editingMember.role || '').toLowerCase() ||
                                    d.name.ar === editingMember.role
                                );

                            return (
                              <DesignationBadge
                                designation={des}
                                roleFallback={editingMember.role || 'পদবী'}
                                size="md"
                              />
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Member Profile Photo & Dedicated Two-Phase Crop */}
                    <div className="sm:col-span-2 p-4 bg-[#FDFCF9] rounded-xl border border-[#EBE8E0] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#EBE8E0]">
                        <div>
                          <h4 className="text-xs font-bold text-[#2D3630]">
                            সদস্যের ছবি ও ক্রপ ব্যবস্থাপনা (Profile Photo & Crop)
                          </h4>
                          <p className="text-[11px] text-[#7A877E]">
                            পোর্ট্রেট ছবি নির্বাচন করুন, মাউস টেনে মুখমণ্ডল নিখুঁতভাবে বসান এবং কনফার্ম করুন
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-[#5C665F] shrink-0">
                            ফ্রেমের আকৃতি:
                          </label>
                          <select
                            value={
                              editingMember.useGlobalImageShape === false && editingMember.imageShape
                                ? editingMember.imageShape
                                : ''
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) {
                                setEditingMember({
                                  ...editingMember,
                                  useGlobalImageShape: true,
                                  imageShape: undefined,
                                });
                              } else {
                                setEditingMember({
                                  ...editingMember,
                                  useGlobalImageShape: false,
                                  imageShape: val as any,
                                });
                              }
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] font-semibold focus:outline-hidden focus:border-[#2D5A41]"
                          >
                            <option value="">গ্লোবাল ডিফল্ট ব্যবহার করুন (Use Global Default)</option>
                            <option value="circle">বৃত্তাকার (Circular)</option>
                            <option value="rounded">রাউন্ডেড স্কয়ার (Rounded Square)</option>
                            <option value="square">স্কয়ার ফ্রেম (Square Frame)</option>
                          </select>
                        </div>
                      </div>

                      {/* Hidden File Picker Input */}
                      <input
                        type="file"
                        ref={memberFileInputRef}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleOpenCropForNewFile(file);
                          }
                        }}
                      />

                      {editingMember.photoUrl ? (
                        <div className="flex flex-col sm:flex-row items-center gap-5 p-3 rounded-xl bg-white border border-[#EBE8E0]">
                          {/* Live Avatar Preview */}
                          <MemberAvatar
                            member={editingMember as Member}
                            config={config}
                            size="xl"
                            className="shadow-md"
                          />

                          <div className="flex-1 space-y-2 text-center sm:text-left">
                            <div className="text-xs font-bold text-[#2D3630]">
                              সংরক্ষিত পোর্ট্রেট ছবি
                            </div>
                            <div className="text-[11px] text-[#7A877E]">
                              জুম: {(editingMember.cropZoom || 1).toFixed(1)}x | প্যান: X={editingMember.cropX || 0}%, Y={editingMember.cropY || 0}%
                            </div>
                            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                              <button
                                type="button"
                                onClick={handleOpenCropForExistingPhoto}
                                className="px-3 py-1.5 rounded-lg bg-[#2D5A41] text-white hover:bg-[#234733] font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Crop className="w-3.5 h-3.5" />
                                <span>ক্রপ ও পজিশন সমন্বয় করুন</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => memberFileInputRef.current?.click()}
                                className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] text-[#2D3630] hover:bg-[#F7F5F0] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-[#5C665F]" />
                                <span>ছবি পরিবর্তন করুন</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingMember({
                                    ...editingMember,
                                    photoUrl: undefined,
                                    cropX: 0,
                                    cropY: 0,
                                    cropZoom: 1,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>মুছে ফেলুন</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Empty Upload Dropzone with Clipboard Paste support */
                        <div
                          onClick={() => memberFileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              handleOpenCropForNewFile(file);
                            }
                          }}
                          tabIndex={0}
                          className="p-6 rounded-xl bg-white border-2 border-dashed border-[#2D5A41]/40 hover:border-[#2D5A41] transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer group focus:outline-hidden focus:ring-2 focus:ring-[#2D5A41]/20"
                        >
                          <div className="w-12 h-12 rounded-full bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center group-hover:scale-105 transition-transform">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#2D3630] group-hover:text-[#2D5A41] transition-colors">
                              সদস্যের ছবি নির্বাচন করতে ক্লিক করুন বা ফাইল টেনে আনুন
                            </span>
                            <p className="text-[11px] text-[#7A877E] mt-0.5">
                              বা কিবোর্ড থেকে সরাসরি <span className="font-semibold text-[#2D5A41]">Ctrl+V</span> পেস্ট করুন (JPG, PNG, WebP)
                            </p>
                          </div>
                          <span className="text-[10px] text-[#A8B3AA]">
                            ছবি নির্বাচনের পর ক্রপ ও ড্র্যাগ উইন্ডো উন্মুক্ত হবে; আপনি কনফার্ম করলেই কেবল চূড়ান্ত রূপ পাবে
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Social Media & Contact Links */}
                    <div className="sm:col-span-2 p-4 bg-[#FDFCF9] rounded-xl border border-[#EBE8E0] space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
                        <div>
                          <h4 className="text-xs font-bold text-[#2D3630]">
                            সোশ্যাল মিডিয়া ও ডিরেক্ট যোগাযোগ বাটন (Social & Contact Links)
                          </h4>
                          <p className="text-[11px] text-[#7A877E]">
                            পাবলিক কার্ডে কেবল লিঙ্ক পূরণকৃত ও টিক দেওয়া বাটনগুলো প্রদর্শিত হবে
                          </p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingMember.showSocials !== false}
                            onChange={(e) =>
                              setEditingMember({
                                ...editingMember,
                                showSocials: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded accent-[#2D5A41]"
                          />
                          <span className="text-xs font-semibold text-[#2D3630]">সোশ্যাল বাটন সেকশন সক্রিয়</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Facebook */}
                        <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#5C665F]">ফেসবুক (Facebook)</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#2D5A41] font-semibold">
                              <input
                                type="checkbox"
                                checked={editingMember.showFacebook !== false}
                                onChange={(e) => setEditingMember({ ...editingMember, showFacebook: e.target.checked })}
                                className="rounded accent-[#2D5A41] w-3.5 h-3.5"
                              />
                              <span>প্রদর্শন করুন</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder="https://facebook.com/username"
                            value={editingMember.facebook || editingMember.socialLinks?.facebook || ''}
                            onChange={(e) =>
                              setEditingMember({
                                ...editingMember,
                                facebook: e.target.value,
                                socialLinks: { ...(editingMember.socialLinks || {}), facebook: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>

                        {/* WhatsApp */}
                        <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#5C665F]">হোয়াটসঅ্যাপ (WhatsApp)</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#2D5A41] font-semibold">
                              <input
                                type="checkbox"
                                checked={editingMember.showWhatsapp !== false}
                                onChange={(e) => setEditingMember({ ...editingMember, showWhatsapp: e.target.checked })}
                                className="rounded accent-[#2D5A41] w-3.5 h-3.5"
                              />
                              <span>প্রদর্শন করুন</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder="+88018xxxxxxxx"
                            value={editingMember.whatsapp || editingMember.socialLinks?.whatsapp || ''}
                            onChange={(e) =>
                              setEditingMember({
                                ...editingMember,
                                whatsapp: e.target.value,
                                socialLinks: { ...(editingMember.socialLinks || {}), whatsapp: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>

                        {/* IMO */}
                        <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#5C665F]">ইমো (IMO)</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#2D5A41] font-semibold">
                              <input
                                type="checkbox"
                                checked={editingMember.showImo !== false}
                                onChange={(e) => setEditingMember({ ...editingMember, showImo: e.target.checked })}
                                className="rounded accent-[#2D5A41] w-3.5 h-3.5"
                              />
                              <span>প্রদর্শন করুন</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder="+88018xxxxxxxx"
                            value={editingMember.imo || editingMember.socialLinks?.imo || ''}
                            onChange={(e) =>
                              setEditingMember({
                                ...editingMember,
                                imo: e.target.value,
                                socialLinks: { ...(editingMember.socialLinks || {}), imo: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>

                        {/* Instagram */}
                        <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#5C665F]">ইনস্টাগ্রাম (Instagram)</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#2D5A41] font-semibold">
                              <input
                                type="checkbox"
                                checked={editingMember.showInstagram !== false}
                                onChange={(e) => setEditingMember({ ...editingMember, showInstagram: e.target.checked })}
                                className="rounded accent-[#2D5A41] w-3.5 h-3.5"
                              />
                              <span>প্রদর্শন করুন</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder="https://instagram.com/username"
                            value={editingMember.instagram || editingMember.socialLinks?.instagram || ''}
                            onChange={(e) =>
                              setEditingMember({
                                ...editingMember,
                                instagram: e.target.value,
                                socialLinks: { ...(editingMember.socialLinks || {}), instagram: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>

                        {/* Direct Phone */}
                        <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#5C665F]">সরাসরি ফোন নম্বর (Direct Call)</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#2D5A41] font-semibold">
                              <input
                                type="checkbox"
                                checked={editingMember.showPhone !== false}
                                onChange={(e) => setEditingMember({ ...editingMember, showPhone: e.target.checked })}
                                className="rounded accent-[#2D5A41] w-3.5 h-3.5"
                              />
                              <span>কার্ডে কল বাটন</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder="+88018xxxxxxxx"
                            value={editingMember.phone || ''}
                            onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>

                        {/* Direct Email */}
                        <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#5C665F]">ইমেইল ঠিকানা (Direct Email)</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#2D5A41] font-semibold">
                              <input
                                type="checkbox"
                                checked={editingMember.showEmail !== false}
                                onChange={(e) => setEditingMember({ ...editingMember, showEmail: e.target.checked })}
                                className="rounded accent-[#2D5A41] w-3.5 h-3.5"
                              />
                              <span>কার্ডে ইমেইল বাটন</span>
                            </label>
                          </div>
                          <input
                            type="email"
                            placeholder="member@example.com"
                            value={editingMember.email || ''}
                            onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-[#2D3630] mb-1">ঠিকানা / বর্তমান অবস্থান</label>
                      <input
                        type="text"
                        placeholder="যেমন: মৌলভী বাড়ি, শর্শদী, ফেনী"
                        value={editingMember.address || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, address: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-[#2D3630] mb-1">সংক্ষিপ্ত পরিচিতি / মন্তব্য</label>
                      <textarea
                        rows={2}
                        value={editingMember.bio || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, bio: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-[#FDFCF9] rounded-xl border border-[#EBE8E0]">
                      <div>
                        <label className="block font-bold text-[#2D3630] mb-1">সদস্য হওয়ার তারিখ (Joining Date)</label>
                        <input
                          type="date"
                          value={editingMember.joiningDate || ''}
                          onChange={(e) => setEditingMember({ ...editingMember, joiningDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                        />
                        <span className="text-[10px] text-[#7A877E]">ঐচ্ছিক — কার্ডে বা বিস্তারিত পেজে প্রদর্শিত হবে</span>
                      </div>

                      <div className="flex flex-col justify-center space-y-2 pt-1 sm:pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingMember.showJoiningDate !== false}
                            onChange={(e) => setEditingMember({ ...editingMember, showJoiningDate: e.target.checked })}
                            className="w-4 h-4 rounded accent-[#2D5A41]"
                          />
                          <span className="font-semibold text-[#2D3630] text-xs">কার্ডে যোগদানের তারিখ প্রদর্শন করুন</span>
                        </label>
                        <span className="text-[10px] text-[#7A877E]">বন্ধ থাকলে কার্ডে তারিখ লুকানো থাকবে</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        id="isActiveMem"
                        checked={editingMember.isActive !== false}
                        onChange={(e) => setEditingMember({ ...editingMember, isActive: e.target.checked })}
                        className="rounded accent-[#2D5A41]"
                      />
                      <label htmlFor="isActiveMem" className="font-semibold text-[#2D3630]">
                        ওয়েবসাইটে সক্রিয় হিসেবে প্রদর্শন করুন
                      </label>
                    </div>
                  </form>
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#EBE8E0] bg-[#FDFCF9] shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-4 py-2 rounded-lg border border-[#EBE8E0] text-[#5C665F] font-semibold hover:bg-[#F7F5F0]"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    form="member-modal-form"
                    className="px-5 py-2 rounded-lg bg-[#2D5A41] text-white font-semibold hover:bg-[#234733] shadow-2xs"
                  >
                    {editingMember.id ? 'আপডেট সংরক্ষণ করুন' : 'সদস্য যুক্ত করুন'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Member Photo Crop & Adjust Modal */}
          <MemberPhotoCropModal
            isOpen={memberCropModal.isOpen}
            imageSrc={memberCropModal.imageSrc}
            draftFile={memberCropModal.draftFile}
            cropZoom={memberCropModal.cropZoom}
            cropX={memberCropModal.cropX}
            cropY={memberCropModal.cropY}
            shape={
              editingMember?.useGlobalImageShape === false && editingMember?.imageShape
                ? editingMember.imageShape
                : (config.memberImageShape || 'circle')
            }
            onConfirm={handleConfirmMemberCrop}
            onCancel={handleCloseCropModal}
          />

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-[#EBE8E0] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead className="bg-[#F7F5F0] text-[#5C665F] font-semibold border-b border-[#EBE8E0]">
                  <tr>
                    <th className="py-2.5 px-3">ক্রম</th>
                    <th className="py-2.5 px-3">নাম</th>
                    <th className="py-2.5 px-3">পদবী / ভূমিকা</th>
                    <th className="py-2.5 px-3">যোগাযোগ</th>
                    <th className="py-2.5 px-3 text-center">অবস্থা</th>
                    <th className="py-2.5 px-3 text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE8E0]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F7F5F0]">
                    <td className="py-3 px-3 font-mono font-bold text-[#2D5A41]">
                      #{m.serial}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#2D3630]">
                      {m.name}
                    </td>
                    <td className="py-3 px-3">
                      {(() => {
                        const des = m.designationId
                          ? designations.find((d) => d.id === m.designationId)
                          : designations.find(
                              (d) =>
                                d.name.bn === m.role ||
                                d.name.en.toLowerCase() === (m.role || '').toLowerCase() ||
                                d.name.ar === m.role
                            );

                        return (
                          <div className="flex flex-col items-start gap-1">
                            {des ? (
                              <DesignationBadge designation={des} size="sm" />
                            ) : m.role ? (
                              <span className="text-[#5C665F] font-medium">{m.role}</span>
                            ) : (
                              <span className="text-[#A4B3A8]">—</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3 text-[#7A877E]">{m.phone || m.email || m.address || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.isActive ? 'bg-[#E8EFEA] text-[#2D5A41]' : 'bg-[#F7F5F0] text-[#7A877E]'
                        }`}
                      >
                        {m.isActive ? 'সক্রিয়' : 'লুকানো'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() =>
                          setEditingMember({
                            ...m,
                            useGlobalImageShape:
                              m.useGlobalImageShape != null
                                ? m.useGlobalImageShape
                                : m.imageShape
                                ? false
                                : true,
                            imageShape: m.imageShape || undefined,
                            imageFit: m.imageFit || 'cover',
                            cropZoom: m.cropZoom || 1,
                            cropX: m.cropX || 0,
                            cropY: m.cropY || 0,
                            showFacebook: m.showFacebook !== false,
                            showInstagram: m.showInstagram !== false,
                            showWhatsapp: m.showWhatsapp !== false,
                            showImo: m.showImo !== false,
                            showPhone: m.showPhone !== false,
                            showEmail: m.showEmail !== false,
                            showSocials: m.showSocials !== false,
                            showJoiningDate: m.showJoiningDate !== false,
                          })
                        }
                        className="p-1 rounded text-[#5C665F] hover:text-[#2D5A41] hover:bg-[#F7F5F0]"
                        title="সম্পাদনা"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(m.id)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {/* SECTION: ACTIVITIES EDITOR */}
      {activeSection === 'activities' && (
        <div className="space-y-6">
          {/* Subtabs for Activities List vs Category Management */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBE8E0]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivitySubTab('list')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activitySubTab === 'list'
                    ? 'bg-[#2D5A41] text-white shadow-2xs'
                    : 'bg-white text-[#5C665F] border border-[#EBE8E0] hover:bg-[#F7F5F0]'
                }`}
              >
                কার্যক্রম তালিকা ({activities.length})
              </button>
              <button
                type="button"
                onClick={() => setActivitySubTab('categories')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activitySubTab === 'categories'
                    ? 'bg-[#2D5A41] text-white shadow-2xs'
                    : 'bg-white text-[#5C665F] border border-[#EBE8E0] hover:bg-[#F7F5F0]'
                }`}
              >
                বিভাগ ব্যবস্থাপনা (Categories)
              </button>
            </div>

            {activitySubTab === 'list' && (
              <button
                onClick={() => setEditingActivity({ isPublished: true, showShortSummaryInDetail: false })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ নতুন কার্যক্রম যুক্ত করুন</span>
              </button>
            )}
          </div>

          {/* Subtab: Categories Management */}
          {activitySubTab === 'categories' && (
            <div className="p-5 bg-white rounded-2xl border border-[#EBE8E0] shadow-3xs">
              <ActivityCategoryManager
                activities={activities}
                showToast={showToast}
              />
            </div>
          )}

          {/* Subtab: Activities List */}
          {activitySubTab === 'list' && (
            <div className="space-y-6">
              {editingActivity && (
                <div
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
                  onClick={() => setEditingActivity(null)}
                >
                  <div
                    id="activity-edit-form"
                    ref={activityFormRef}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#2D5A41]/40 shadow-2xl p-5 sm:p-7 space-y-4 text-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
                      <h3 className="text-sm font-bold text-[#2D3630]">
                        {editingActivity.id ? 'কার্যক্রম সম্পাদনা' : 'নতুন কার্যক্রম তৈরি'}
                      </h3>
                      <button onClick={() => setEditingActivity(null)} className="p-1 text-[#7A877E] hover:text-[#2D3630]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveActivity} className="space-y-4">
                      {/* Multilingual Tab Switcher */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#2D3630] mr-1">সম্পাদনার ভাষা:</span>
                          {(['bn', 'en', 'ar'] as const).map((langKey) => (
                            <button
                              key={langKey}
                              type="button"
                              onClick={() => setActivityLang(langKey)}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                activityLang === langKey
                                  ? 'bg-[#2D5A41] text-white shadow-2xs'
                                  : 'bg-white text-[#5C665F] hover:text-[#2D3630] border border-[#EBE8E0]'
                              }`}
                            >
                              {langKey === 'bn' ? 'বাংলা (BN)' : langKey === 'en' ? 'English (EN)' : 'العربية (AR)'}
                            </button>
                          ))}
                        </div>
                        <span className="text-[11px] text-[#7A877E] font-medium">
                          {activityLang === 'bn'
                            ? 'বাংলা কনটেন্ট এডিট হচ্ছে (ডিফল্ট)'
                            : activityLang === 'en'
                            ? 'Editing English translation'
                            : 'تحرير المحتوى باللغة العربية'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-[#2D3630]">
                            কার্যক্রমের শিরোনাম ({activityLang.toUpperCase()}) {activityLang === 'bn' ? '*' : '(ঐচ্ছিক)'}
                          </label>
                          {activityLang !== 'bn' && (
                            <span className="text-[11px] text-[#7A877E]">
                              বাংলা শিরোনাম: {getActivityText('title', 'bn') || 'খালি'}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          required={activityLang === 'bn'}
                          dir={activityLang === 'ar' ? 'rtl' : 'ltr'}
                          value={getActivityText('title', activityLang)}
                          onChange={(e) => setActivityText('title', activityLang, e.target.value)}
                          placeholder={
                            activityLang === 'bn'
                              ? 'যেমন: জরুরি ওষুধ ও চিকিৎসা সহায়তা কর্মসূচি'
                              : activityLang === 'en'
                              ? 'e.g. Emergency Medical & Healthcare Support Program'
                              : 'مثال: برنامج المساعدات الطبية والرعاية الصحية الطارئة'
                          }
                          className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#2D3630] mb-1">তারিখ *</label>
                          <input
                            type="date"
                            value={editingActivity.date || ''}
                            onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#2D3630] mb-1">বিভাগ (Category) *</label>
                          <ActivityCategoryInlineSelector
                            value={editingActivity.category || ''}
                            onChange={(catName) => setEditingActivity({ ...editingActivity, category: catName })}
                            showToast={showToast}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <MediaUploadField
                          label="কার্যক্রমের প্রধান কভার ছবি (Cover Image)"
                          value={editingActivity.coverImage || ''}
                          onChange={(url) => setEditingActivity({ ...editingActivity, coverImage: url })}
                          helperText="কার্যক্রমের ব্যানার বা ফটো (JPG, PNG, WEBP - সর্বোচ্চ ১০ MB)"
                          bucket="activities"
                        />

                        {editingActivity.coverImage && (
                          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] cursor-pointer hover:bg-[#EFECE3] transition-colors">
                            <input
                              type="checkbox"
                              checked={Boolean(editingActivity.showOnMediaPage)}
                              onChange={(e) => setEditingActivity({ ...editingActivity, showOnMediaPage: e.target.checked })}
                              className="w-4 h-4 rounded accent-[#2D5A41] cursor-pointer"
                            />
                            <div className="select-none">
                              <span className="text-xs font-bold text-[#2D3630] block">মিডিয়া পেজে এই ছবি প্রদর্শন করুন</span>
                              <span className="text-[11px] text-[#7A877E] block">সক্রিয় থাকলে কার্যক্রমের কভার ছবিটি পাবলিক মিডিয়া / গ্যালারি পেজে প্রদর্শিত হবে এবং ভিজিটররা ক্লিক করে এই কার্যক্রমে যেতে পারবে।</span>
                            </div>
                          </label>
                        )}
                      </div>

                    {/* Strict Short Summary */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-[#2D3630]">
                          সংক্ষিপ্ত সারসংক্ষেপ / Short Summary ({activityLang.toUpperCase()})
                        </label>
                        <span className="text-[11px] text-[#7A877E]">হোমপেজ ও কার্ড প্রিভিউয়ের জন্য</span>
                      </div>
                      <textarea
                        rows={2}
                        dir={activityLang === 'ar' ? 'rtl' : 'ltr'}
                        value={getActivityText('shortSummary', activityLang)}
                        onChange={(e) => setActivityText('shortSummary', activityLang, e.target.value)}
                        placeholder={
                          activityLang === 'bn'
                            ? '১ বা ২ বাক্যে কার্ডের সংক্ষিপ্ত সারসংক্ষেপ লিখুন...'
                            : activityLang === 'en'
                            ? 'Write short summary for cards and homepage preview in 1-2 sentences...'
                            : 'اكتب ملخصاً موجزاً للبطاقات ومعاينة الصفحة الرئيسية في جملة أو جملتين...'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                      <p className="text-[11px] text-[#7A877E] mt-1">
                        * এটি হোমপেজের রেল ও কার্ডে প্রদর্শিত হবে। এটি সম্পূর্ণ বিবরণে ওভাররাইট হবে না।
                      </p>
                    </div>

                    {/* Strict Full Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-[#2D3630]">
                          সম্পূর্ণ বিস্তারিত বিবরণ / Full Editorial Story ({activityLang.toUpperCase()}) {activityLang === 'bn' ? '*' : ''}
                        </label>
                        <span className="text-[11px] text-[#7A877E]">ডিটেইল পেজের জন্য</span>
                      </div>
                      <textarea
                        rows={5}
                        required={activityLang === 'bn'}
                        dir={activityLang === 'ar' ? 'rtl' : 'ltr'}
                        value={getActivityText('fullDescription', activityLang)}
                        onChange={(e) => setActivityText('fullDescription', activityLang, e.target.value)}
                        placeholder={
                          activityLang === 'bn'
                            ? 'কার্যক্রমের সম্পূর্ণ প্রতিবেদন, প্রেক্ষাপট ও বিবরণ বিস্তারিত লিখুন...'
                            : activityLang === 'en'
                            ? 'Write comprehensive article, context, and detailed report of the activity...'
                            : 'اكتب التقرير الكامل وسياق النشاط وتفاصيله...'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>

                    {/* Structured Editorial Sections (Optional) */}
                    <div className="p-4 rounded-xl bg-[#F7F5F0]/60 border border-[#EBE8E0] space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[#2D3630] text-xs">
                          সম্পাদকীয় অতিরিক্ত বিবরণ ({activityLang.toUpperCase()}) (ঐচ্ছিক - ডিটেইল পেজের জন্য)
                        </h4>
                        <span className="text-[10px] text-[#7A877E]">
                          {activityLang === 'bn' ? 'বাংলা' : activityLang === 'en' ? 'English' : 'العربية'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-[#5C665F] mb-1">
                            উদ্দেশ্য ও লক্ষ্য / Purpose ({activityLang.toUpperCase()})
                          </label>
                          <input
                            type="text"
                            dir={activityLang === 'ar' ? 'rtl' : 'ltr'}
                            value={getActivityText('purpose', activityLang)}
                            onChange={(e) => setActivityText('purpose', activityLang, e.target.value)}
                            placeholder={
                              activityLang === 'bn'
                                ? 'যেমন: প্রান্তিক রোগীদের বিনামূল্যে ওষুধ প্রদান'
                                : activityLang === 'en'
                                ? 'e.g. Provide free medicines to vulnerable patients'
                                : 'مثال: تقديم الأدوية المجانية للمرضى المحتاجين'
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#5C665F] mb-1">
                            স্থান / এলাকা / Location ({activityLang.toUpperCase()})
                          </label>
                          <input
                            type="text"
                            dir={activityLang === 'ar' ? 'rtl' : 'ltr'}
                            value={getActivityText('location', activityLang)}
                            onChange={(e) => setActivityText('location', activityLang, e.target.value)}
                            placeholder={
                              activityLang === 'bn'
                                ? 'যেমন: লালমোহন, ভোলা'
                                : activityLang === 'en'
                                ? 'e.g. Lalmohan, Bhola'
                                : 'مثال: لالموهان، بهولا'
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#5C665F] mb-1">
                            সুবিধাভোগী / Beneficiaries ({activityLang.toUpperCase()})
                          </label>
                          <input
                            type="text"
                            dir={activityLang === 'ar' ? 'rtl' : 'ltr'}
                            value={getActivityText('beneficiaries', activityLang)}
                            onChange={(e) => setActivityText('beneficiaries', activityLang, e.target.value)}
                            placeholder={
                              activityLang === 'bn'
                                ? 'যেমন: ১২০টি পরিবার ও ৫০ জন প্রবীণ'
                                : activityLang === 'en'
                                ? 'e.g. 120 families and 50 elderly individuals'
                                : 'مثال: 120 أسرة و50 مسناً'
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#5C665F] mb-1">
                            অর্জন বা ফলাফল / Outcomes ({activityLang.toUpperCase()})
                          </label>
                          <input
                            type="text"
                            dir={activityLang === 'ar' ? 'rtl' : 'ltr'}
                            value={getActivityText('outcomes', activityLang)}
                            onChange={(e) => setActivityText('outcomes', activityLang, e.target.value)}
                            placeholder={
                              activityLang === 'bn'
                                ? 'যেমন: শতভাগ পরিবারে প্রয়োজনীয় ওষুধ সরবরাহ নিশ্চিত'
                                : activityLang === 'en'
                                ? 'e.g. Ensured essential medicine supply to 100% of targeted families'
                                : 'مثال: ضمان إيصال الأدوية الأساسية لجميع العائلات المستهدفة'
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#EBE8E0]">
                        <input
                          type="checkbox"
                          id="showShortInDetail"
                          checked={Boolean(editingActivity.showShortSummaryInDetail)}
                          onChange={(e) => setEditingActivity({ ...editingActivity, showShortSummaryInDetail: e.target.checked })}
                          className="rounded accent-[#2D5A41]"
                        />
                        <label htmlFor="showShortInDetail" className="font-semibold text-[#2D3630] cursor-pointer">
                          ডিটেইল পেজেও সংক্ষিপ্ত সারসংক্ষেপটি হাইলাইট হিসেবে প্রদর্শন করুন (ডিফল্ট: বন্ধ)
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPubAct"
                        checked={editingActivity.isPublished !== false}
                        onChange={(e) => setEditingActivity({ ...editingActivity, isPublished: e.target.checked })}
                        className="rounded accent-[#2D5A41]"
                      />
                      <label htmlFor="isPubAct" className="font-semibold text-[#2D3630] cursor-pointer">
                        প্রকাশ করুন (Published - ওয়েবসাইটে সবার জন্য দৃশ্যমান হবে)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE8E0]">
                      <button
                        type="button"
                        onClick={() => setEditingActivity(null)}
                        className="px-3.5 py-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0]"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#2D5A41] text-white font-semibold hover:bg-[#234733] shadow-2xs"
                      >
                        সংরক্ষণ করুন
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

              {/* Activities List */}
              <div className="space-y-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-xl bg-white border border-[#EBE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-xs shadow-3xs hover:border-[#D4CEBF] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {act.coverImage && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-[#F7F5F0] border border-[#EBE8E0]">
                          <img
                            src={act.coverImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#E8EFEA] text-[#2D5A41] font-semibold">
                            {act.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              act.isPublished ? 'bg-[#E8EFEA] text-[#2D5A41]' : 'bg-[#F7F5F0] text-[#7A877E]'
                            }`}
                          >
                            {act.isPublished ? 'প্রকাশিত' : 'ড্রাফট'}
                          </span>
                        </div>
                        <strong className="text-[#2D3630] text-sm block truncate">
                          {typeof act.title === 'string' ? act.title : act.title.bn}
                        </strong>
                        <div className="text-[#7A877E] mt-0.5 text-[11px] truncate">
                          {typeof act.shortSummary === 'object' && act.shortSummary !== null
                            ? act.shortSummary.bn
                            : typeof act.summary === 'object' && act.summary !== null
                            ? act.summary.bn
                            : (act.shortSummary as any) || (act.summary as any) || ''}
                        </div>
                        <div className="text-[#A4B3A8] mt-0.5 text-[10px]">তারিখ: {act.date}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EBE8E0] w-full sm:w-auto justify-end">
                      <button
                        onClick={() => setEditingActivity(act)}
                        className="p-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:text-[#2D5A41] hover:bg-[#F7F5F0]"
                        title="সম্পাদনা"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteActivity(act.id)}
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:text-rose-800"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: NOTICES EDITOR */}
      {activeSection === 'notices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#2D3630]">
                নোটিশ বোর্ড সম্পাদক ({notices.length})
              </h2>
              <p className="text-xs text-[#5C665F] mt-0.5">
                অফিসিয়াল নোটিশ ও সাধারণ বিজ্ঞপ্তি ব্যবস্থাপনা করুন।
              </p>
            </div>
            <button
              onClick={() => setEditingNotice({ isPublished: true, isImportant: false })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন নোটিশ যুক্ত করুন</span>
            </button>
          </div>

          {/* Notice Edit / Add Form Centered Viewport Modal */}
          {editingNotice && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) setEditingNotice(null);
              }}
            >
              <div
                id="notice-edit-form"
                ref={noticeFormRef}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border border-[#2D5A41]/40 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE8E0] bg-[#FDFCF9] shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-[#2D3630]">
                      {editingNotice.id ? 'নোটিশ সম্পাদনা' : 'নতুন নোটিশ তৈরি'}
                    </h3>
                    <p className="text-[11px] text-[#7A877E]">
                      নোটিশের শিরোনাম, তারিখ ও বিস্তারিত বিবরণ প্রদান করুন
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingNotice(null)}
                    className="p-1.5 text-[#7A877E] hover:text-[#2D3630] rounded-lg hover:bg-[#EBE8E0]/60 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <form onSubmit={handleSaveNotice} className="space-y-4">
                    {/* Multilingual Notice Tab Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#2D3630] mr-1">নোটিশের ভাষা:</span>
                        {(['bn', 'en', 'ar'] as const).map((langKey) => (
                          <button
                            key={langKey}
                            type="button"
                            onClick={() => setNoticeLang(langKey)}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                              noticeLang === langKey
                                ? 'bg-[#2D5A41] text-white shadow-2xs'
                                : 'bg-white text-[#5C665F] hover:text-[#2D3630] border border-[#EBE8E0]'
                            }`}
                          >
                            {langKey === 'bn' ? 'বাংলা (BN)' : langKey === 'en' ? 'English (EN)' : 'العربية (AR)'}
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] text-[#7A877E] font-medium">
                        {noticeLang === 'bn'
                          ? 'বাংলা নোটিশ (ডিফল্ট)'
                          : noticeLang === 'en'
                          ? 'English Notice'
                          : 'إعلان باللغة العربية'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-[#2D3630]">
                          নোটিশের শিরোনাম ({noticeLang.toUpperCase()}) {noticeLang === 'bn' ? '*' : '(ঐচ্ছিক)'}
                        </label>
                        {noticeLang !== 'bn' && (
                          <span className="text-[11px] text-[#7A877E]">
                            বাংলা শিরোনাম: {getNoticeText('title', 'bn') || 'খালি'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required={noticeLang === 'bn'}
                        dir={noticeLang === 'ar' ? 'rtl' : 'ltr'}
                        value={getNoticeText('title', noticeLang)}
                        onChange={(e) => setNoticeText('title', noticeLang, e.target.value)}
                        placeholder={
                          noticeLang === 'bn'
                            ? 'যেমন: আসন্ন বার্ষিক সাধারণ সভা সম্পর্কিত জরুরি বিজ্ঞপ্তি'
                            : noticeLang === 'en'
                            ? 'e.g. Urgent Notice Regarding Upcoming Annual General Meeting'
                            : 'مثال: إشعار عاجل بخصوص الاجتماع العام السنوي القادم'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#2D3630] mb-1">তারিখ</label>
                      <input
                        type="date"
                        value={editingNotice.date || ''}
                        onChange={(e) => setEditingNotice({ ...editingNotice, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-[#2D3630]">
                          নোটিশের মূল বার্তা / Content ({noticeLang.toUpperCase()}) {noticeLang === 'bn' ? '*' : ''}
                        </label>
                      </div>
                      <textarea
                        rows={4}
                        required={noticeLang === 'bn'}
                        dir={noticeLang === 'ar' ? 'rtl' : 'ltr'}
                        value={getNoticeText('body', noticeLang)}
                        onChange={(e) => setNoticeText('body', noticeLang, e.target.value)}
                        placeholder={
                          noticeLang === 'bn'
                            ? 'নোটিশের পূর্ণাঙ্গ বিবরণ লিখুন...'
                            : noticeLang === 'en'
                            ? 'Write full notice text and details...'
                            : 'اكتب نص الإعلان وتفاصيله الكاملة...'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>

                    <MediaUploadField
                      label="সংযুক্ত ফাইল বা অফিসিয়াল সার্কুলার ছবি (ঐচ্ছিক)"
                      value={editingNotice.attachmentUrl || ''}
                      onChange={(url) => setEditingNotice({ ...editingNotice, attachmentUrl: url })}
                      helperText="নোটিশের অফিসিয়াল সার্কুলার বা মেমো ছবি (JPG, PNG - সর্বোচ্চ ১০ MB)"
                      bucket="notices"
                    />

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 font-semibold text-[#2D3630]">
                        <input
                          type="checkbox"
                          checked={Boolean(editingNotice.isImportant)}
                          onChange={(e) => setEditingNotice({ ...editingNotice, isImportant: e.target.checked })}
                          className="rounded accent-[#2D5A41]"
                        />
                        <span>জরুরি নোটিশ হিসেবে প্রদর্শন করুন</span>
                      </label>

                      <label className="flex items-center gap-1.5 font-semibold text-[#2D3630]">
                        <input
                          type="checkbox"
                          checked={editingNotice.isPublished !== false}
                          onChange={(e) => setEditingNotice({ ...editingNotice, isPublished: e.target.checked })}
                          className="rounded accent-[#2D5A41]"
                        />
                        <span>প্রকাশিত রাখুন</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE8E0]">
                      <button
                        type="button"
                        onClick={() => setEditingNotice(null)}
                        className="px-3.5 py-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0]"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#2D5A41] text-white font-semibold hover:bg-[#234733]"
                      >
                        সংরক্ষণ করুন
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {notices.map((not) => (
              <div
                key={not.id}
                className="p-4 rounded-xl bg-white border border-[#EBE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {not.isImportant && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                        জরুরি
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        not.isPublished ? 'bg-[#E8EFEA] text-[#2D5A41]' : 'bg-[#F7F5F0] text-[#7A877E]'
                      }`}
                    >
                      {not.isPublished ? 'প্রকাশিত' : 'ড্রাফট'}
                    </span>
                  </div>
                  <strong className="text-[#2D3630] text-sm block truncate">
                    {typeof not.title === 'string' ? not.title : not.title.bn}
                  </strong>
                  <div className="text-[#A4B3A8] mt-0.5 text-[11px]">তারিখ: {not.date}</div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EBE8E0] w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setEditingNotice(not)}
                    className="p-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:text-[#2D5A41] hover:bg-[#F7F5F0]"
                    title="সম্পাদনা"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteNotice(not.id)}
                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:text-rose-800"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: GALLERY MANAGER */}
      {activeSection === 'gallery' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#2D3630]">
                মিডিয়া গ্যালারি ব্যবস্থাপনা ({gallery.length})
              </h2>
              <p className="text-xs text-[#5C665F] mt-0.5">
                পাবলিক গ্যালারির স্থিরচিত্রসমূহ পরিচালনা করুন। (ছবি-ভিত্তিক গ্যালারি)
              </p>
            </div>
            <button
              onClick={() => setEditingGallery({ isPublished: true, type: 'photo' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ছবি যুক্ত করুন</span>
            </button>
          </div>

          {editingGallery && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
              onClick={() => setEditingGallery(null)}
            >
              <div
                id="gallery-edit-form"
                ref={galleryFormRef}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#2D5A41]/40 shadow-2xl p-5 sm:p-7 space-y-4 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
                  <h3 className="text-sm font-bold text-[#2D3630]">
                    {editingGallery.id ? 'মিডিয়া ছবি সম্পাদনা' : 'নতুন ছবি যুক্ত করুন'}
                  </h3>
                  <button onClick={() => setEditingGallery(null)} className="p-1 text-[#7A877E] hover:text-[#2D3630] cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveGallery} className="space-y-4">
                  <MediaUploadField
                    label="ছবি ফাইল আপলোড করুন *"
                    value={editingGallery.url || editingGallery.mediaUrl || ''}
                    onChange={(url) => setEditingGallery({ ...editingGallery, url, mediaUrl: url })}
                    required
                    helperText="গ্যালারি ফটো (JPG, PNG, WEBP - সর্বোচ্চ ১০ MB)"
                    bucket="gallery"
                  />

                  <div>
                    <label className="block font-bold text-[#2D3630] mb-1">ছবির শিরোনাম / ক্যাপশন *</label>
                    <input
                      type="text"
                      required
                      value={typeof editingGallery.title === 'object' ? editingGallery.title.bn : editingGallery.title || ''}
                      onChange={(e) => setEditingGallery({ ...editingGallery, title: e.target.value as any })}
                      placeholder="যেমন: মৌলভী বাড়ি প্রাঙ্গণে সভা বা চিকিৎসা সহায়তা"
                      className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2D3630] mb-1">কার্যক্রমের সাথে লিংক করুন (ঐচ্ছিক)</label>
                    <select
                      value={editingGallery.activityId || ''}
                      onChange={(e) => {
                        const selectedActId = e.target.value;
                        const act = activities.find((a) => a.id === selectedActId);
                        if (act) {
                          setEditingGallery({
                            ...editingGallery,
                            activityId: selectedActId,
                            title: editingGallery.title || act.title,
                            date: editingGallery.date || act.date,
                            year: act.date ? act.date.split('-')[0] : editingGallery.year,
                          });
                        } else {
                          setEditingGallery({ ...editingGallery, activityId: undefined });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    >
                      <option value="">কোনোটি নয় (None - সাধারণ গ্যালারি ছবি)</option>
                      {activities.map((act) => (
                        <option key={act.id} value={act.id}>
                          {typeof act.title === 'string' ? act.title : act.title.bn || act.title.en} ({act.date})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-[#7A877E] mt-0.5 block">
                      কোনো কার্যক্রম সিলেক্ট করা থাকলে মিডিয়া পেজে কার্ডে ক্লিক করলে ভিজিটর সরাসরি সেই কার্যক্রমে পৌঁছাবে।
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#2D3630] mb-1">বিভাগ</label>
                      <input
                        type="text"
                        value={editingGallery.category || ''}
                        onChange={(e) => setEditingGallery({ ...editingGallery, category: e.target.value })}
                        placeholder="যেমন: মানবিক সহায়তা / সভা"
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#2D3630] mb-1">তারিখ</label>
                      <input
                        type="date"
                        value={editingGallery.date || ''}
                        onChange={(e) => {
                          const d = e.target.value;
                          setEditingGallery({
                            ...editingGallery,
                            date: d,
                            year: d ? d.split('-')[0] : editingGallery.year,
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#2D3630]">
                      <input
                        type="checkbox"
                        checked={editingGallery.isPublished !== false}
                        onChange={(e) => setEditingGallery({ ...editingGallery, isPublished: e.target.checked })}
                        className="w-4 h-4 rounded accent-[#2D5A41]"
                      />
                      <span>পাবলিক মিডিয়া পেজে প্রকাশিত রাখুন (Visible)</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE8E0]">
                    <button
                      type="button"
                      onClick={() => setEditingGallery(null)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0] cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#2D5A41] text-white font-semibold hover:bg-[#234733] shadow-2xs cursor-pointer"
                    >
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map((g) => {
              const titleStr = typeof g.title === 'string' ? g.title : g.title?.bn || g.title?.en || 'ছবি';
              return (
                <div
                  key={g.id}
                  className="rounded-xl overflow-hidden border border-[#EBE8E0] bg-white group shadow-3xs hover:border-[#2D5A41]/40 transition-all flex flex-col"
                >
                  <div className="relative aspect-4/3 bg-[#F7F5F0] overflow-hidden">
                    <img src={g.thumbnailUrl || g.url || g.mediaUrl} alt={titleStr} className="w-full h-full object-cover" />
                    {g.activityId && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#2D5A41]/90 text-white text-[9px] font-semibold">
                        কার্যক্রম লিংকযুক্ত
                      </span>
                    )}
                    <div className="absolute inset-0 bg-[#2D3630]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingGallery(g)}
                        className="p-1.5 rounded-lg bg-white text-[#2D3630] hover:bg-[#F7F5F0] cursor-pointer shadow-xs"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGallery(g.id)}
                        className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 flex flex-col flex-1 justify-between gap-1 text-[11px]">
                    <div className="font-semibold text-[#2D3630] line-clamp-1">{titleStr}</div>
                    <div className="text-[10px] text-[#7A877E] flex items-center justify-between">
                      <span>{g.category || 'সাধারণ'}</span>
                      <span>{g.date || g.year}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION: CONTACT INBOX */}
      {activeSection === 'inbox' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#2D3630] flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#2D5A41]" />
                <span>যোগাযোগ ইনবক্স ({messages.length})</span>
              </h2>
              <p className="text-xs text-[#5C665F] mt-1">
                সাধারণ নাগরিক ও শুভানুধ্যায়ীদের পাঠানো বার্তা, পরামর্শ ও প্রশ্নাবলি।
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {unreadCount} টি অপঠিত বার্তা
              </span>
            )}
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#7A877E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                placeholder="প্রেরক, ইমেইল বা বিষয় খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto bg-[#F7F5F0] p-1 rounded-xl border border-[#EBE8E0]">
              <button
                type="button"
                onClick={() => setInboxFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  inboxFilter === 'all'
                    ? 'bg-white text-[#2D5A41] shadow-2xs'
                    : 'text-[#5C665F] hover:text-[#2D3630]'
                }`}
              >
                সকল ({messages.length})
              </button>
              <button
                type="button"
                onClick={() => setInboxFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  inboxFilter === 'unread'
                    ? 'bg-white text-[#2D5A41] shadow-2xs'
                    : 'text-[#5C665F] hover:text-[#2D3630]'
                }`}
              >
                অপঠিত ({unreadCount})
              </button>
              <button
                type="button"
                onClick={() => setInboxFilter('read')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  inboxFilter === 'read'
                    ? 'bg-white text-[#2D5A41] shadow-2xs'
                    : 'text-[#5C665F] hover:text-[#2D3630]'
                }`}
              >
                পঠিত ({messages.length - unreadCount})
              </button>
            </div>
          </div>

          {/* Inbox Content */}
          {(() => {
            const filtered = messages.filter((m) => {
              if (inboxFilter === 'unread' && m.isRead) return false;
              if (inboxFilter === 'read' && !m.isRead) return false;
              if (inboxSearch.trim()) {
                const q = inboxSearch.toLowerCase();
                const matchName = m.name?.toLowerCase().includes(q);
                const matchEmail = m.email?.toLowerCase().includes(q);
                const matchSub = m.subject?.toLowerCase().includes(q);
                const matchBody = m.message?.toLowerCase().includes(q);
                return matchName || matchEmail || matchSub || matchBody;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-12 text-center bg-white rounded-2xl border border-[#EBE8E0] space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#F7F5F0] flex items-center justify-center mx-auto text-[#7A877E]">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#2D3630]">কোনো বার্তা পাওয়া যায়নি</h3>
                  <p className="text-xs text-[#7A877E]">
                    {inboxSearch ? 'অনুসন্ধানের সাথে কোনো বার্তা মেলেনি।' : 'ইনবক্সে বর্তমানে কোনো বার্তা নেই।'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Message List */}
                <div className={`space-y-3 ${activeMessage ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                  {filtered.map((msg) => {
                    const isSelected = activeMessage?.id === msg.id;
                    const dateFormatted = msg.submittedAt
                      ? new Date(msg.submittedAt).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '';

                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setActiveMessage(msg);
                          if (!msg.isRead) {
                            handleToggleMessageRead(msg.id, false);
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#E8EFEA]/40 border-[#2D5A41] shadow-2xs'
                            : msg.isRead
                            ? 'bg-white border-[#EBE8E0] hover:border-[#D9D6CC]'
                            : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {!msg.isRead && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="অপঠিত" />
                              )}
                              <h4 className="text-xs font-bold text-[#2D3630] truncate">{msg.name}</h4>
                            </div>
                            <p className="text-[11px] text-[#5C665F] truncate mt-0.5 font-medium">
                              {msg.subject || 'বিষয় উল্লেখ নেই'}
                            </p>
                          </div>
                          <span className="text-[10px] text-[#7A877E] whitespace-nowrap shrink-0">
                            {dateFormatted}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7A877E] line-clamp-2 mt-2 leading-relaxed">
                          {msg.message}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#EBE8E0]/60 text-[10px]">
                          <span className="text-[#5C665F] truncate">{msg.email}</span>
                          <span className="font-semibold text-[#2D5A41]">
                            {isSelected ? 'বিস্তারিত খোলা আছে' : 'পড়ুন →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Detail View */}
                {activeMessage && (
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EBE8E0] shadow-2xs p-5 sm:p-6 space-y-5">
                    <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#EBE8E0]">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[#2D3630]">
                            {activeMessage.subject || 'বিষয় উল্লেখ নেই'}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              activeMessage.isRead
                                ? 'bg-[#E8EFEA] text-[#2D5A41]'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {activeMessage.isRead ? 'পঠিত' : 'অপঠিত'}
                          </span>
                        </div>
                        <p className="text-xs text-[#7A877E] mt-1">
                          প্রেরণের সময়:{' '}
                          {activeMessage.submittedAt
                            ? new Date(activeMessage.submittedAt).toLocaleString('bn-BD', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveMessage(null)}
                        className="p-1.5 rounded-lg text-[#7A877E] hover:text-[#2D3630] hover:bg-[#F7F5F0]"
                        title="বন্ধ করুন"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Sender Info Bar */}
                    <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[#5C665F]">
                          প্রেরক: <strong className="text-[#2D3630]">{activeMessage.name}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          {activeMessage.email && (
                            <a
                              href={`mailto:${activeMessage.email}?subject=Re: ${encodeURIComponent(activeMessage.subject || 'সহানুভূতি ফাউন্ডেশন বার্তা')}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#EBE8E0] text-[#2D5A41] font-semibold text-[11px] hover:bg-[#E8EFEA] transition-colors"
                            >
                              <Mail className="w-3 h-3" />
                              <span>ইমেইল পাঠান</span>
                            </a>
                          )}
                          {activeMessage.phone && (
                            <a
                              href={`tel:${activeMessage.phone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#EBE8E0] text-[#2D3630] font-semibold text-[11px] hover:bg-[#E8EFEA] transition-colors"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>কল করুন</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-[#7A877E]">
                        <div>ইমেইল: <span className="text-[#2D3630] font-mono">{activeMessage.email}</span></div>
                        <div>ফোন: <span className="text-[#2D3630] font-mono">{activeMessage.phone || 'দেওয়া হয়নি'}</span></div>
                      </div>
                    </div>

                    {/* Full Message Body */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#2D3630]">বার্তার মূল বক্তব্য:</h4>
                      <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] text-xs text-[#2D3630] leading-relaxed whitespace-pre-wrap">
                        {activeMessage.message}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#EBE8E0]">
                      <button
                        type="button"
                        onClick={() => handleToggleMessageRead(activeMessage.id, activeMessage.isRead)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EBE8E0] text-xs font-semibold text-[#5C665F] hover:bg-[#F7F5F0] transition-colors"
                      >
                        {activeMessage.isRead ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>অপঠিত হিসেবে চিহ্নিত করুন</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>পঠিত হিসেবে চিহ্নিত করুন</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(activeMessage.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>বার্তা মুছুন</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* SECTION: FUND SOURCE & EXPENSES LEDGER */}
      {activeSection === 'fund' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex overflow-x-auto gap-2 p-1.5 bg-[#F7F5F0] rounded-2xl border border-[#EBE8E0]">
            <button
              type="button"
              onClick={() => setFundSubTab('sheet')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                fundSubTab === 'sheet'
                  ? 'bg-white text-[#2D5A41] shadow-xs border border-[#EBE8E0]'
                  : 'text-[#5C665F] hover:text-[#2D3630]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>গুগল শিট সংযোগ ও ফান্ড স্ট্যাটাস</span>
            </button>

            <button
              type="button"
              onClick={() => setFundSubTab('ledger')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                fundSubTab === 'ledger'
                  ? 'bg-white text-[#2D5A41] shadow-xs border border-[#EBE8E0]'
                  : 'text-[#5C665F] hover:text-[#2D3630]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ব্যয়ের লেজার ও দৃশ্যমানতা ({expenses.length})</span>
            </button>
          </div>

          {fundSubTab === 'ledger' && (
            <AdminExpensesTab
              expenses={expenses}
              onExpensesChange={setExpenses}
              visibilitySettings={visibilitySettings}
              onVisibilityChange={setVisibilitySettings}
              onRequestConfirm={requestConfirm}
              onShowToast={showToast}
              fundPreview={fundPreview}
            />
          )}

          {fundSubTab === 'sheet' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBE8E0]">
                  <div>
                    <h2 className="text-base font-bold text-[#2D3630] flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-[#2D5A41]" />
                      <span>{t('adminFundSourceTab')} (Google Sheet & Fund CMS)</span>
                    </h2>
                    <p className="text-xs text-[#5C665F] mt-1 leading-relaxed">
                      এখানে যেকোনো গুগল শিট, CSV অথবা Google Apps Script এন্ডপয়েন্ট লিঙ্ক পেস্ট করলে ওয়েবসাইট স্বয়ংক্রিয়ভাবে সেখান থেকে তহবিল ডাটা লোড করবে।
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFundSubTab('ledger')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2D5A41]/30 bg-[#E8EFEA] text-xs font-semibold text-[#2D5A41] hover:bg-[#D9E5DC] transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>ব্যয়ের লেজারে যান</span>
                    </button>
                    <a
                      href="/fund"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EBE8E0] text-xs font-semibold text-[#5C665F] hover:bg-[#F7F5F0] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#7A877E]" />
                      <span>লাইভ তহবিল পেজ</span>
                    </a>
                  </div>
                </div>

            {/* 1. Year Source Manager Header & List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBE8E0]">
                <div>
                  <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#2D5A41]" />
                    <span>বার্ষিক তহবিল ও গুগল শিট সোর্স ম্যানেজার (Yearly Sources Manager)</span>
                  </h3>
                  <p className="text-[11px] text-[#5C665F] mt-0.5">
                    প্রতিটি আর্থিক বছরের (যেমন: ২০২৪, ২০২৫, ২০২৬, ২০২৭...) জন্য আলাদা গুগল স্প্রেডশিট লিংক ও GID ট্যাব নির্ধারণ করুন।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddYearSource}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold shadow-2xs self-start sm:self-center transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন আর্থিক বছর যোগ করুন</span>
                </button>
              </div>

              {/* List of Configured Years */}
              <div className="grid grid-cols-1 gap-3.5">
                {(config.yearlyFundSources && config.yearlyFundSources.length > 0
                  ? config.yearlyFundSources
                  : [
                      {
                        year: '2026',
                        url: config.fundSourceUrl,
                        gid: '0',
                        label: '২০২৬ আর্থিক বছর (চলতি)',
                        enabled: true,
                        isPublic: true,
                        isDefault: true,
                      },
                      {
                        year: '2025',
                        url: '',
                        label: '২০২৫ আর্থিক বছর',
                        enabled: true,
                        isPublic: true,
                      },
                      {
                        year: '2024',
                        url: '',
                        label: '২০২৪ আর্থিক বছর',
                        enabled: true,
                        isPublic: true,
                      },
                    ]
                ).map((src) => {
                  const testRes = yearTestResult[src.year];
                  const isCurrentTesting = testingYear === src.year;

                  return (
                    <div
                      key={src.year}
                      className={`p-4 rounded-xl border transition-all ${
                        src.isDefault
                          ? 'bg-[#FDFCF9] border-[#2D5A41]/50 shadow-2xs ring-1 ring-[#2D5A41]/10'
                          : src.enabled
                          ? 'bg-white border-[#EBE8E0] hover:border-[#2D5A41]/30'
                          : 'bg-[#F7F5F0]/60 border-[#EBE8E0] opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#F0ECE1]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#2D5A41] text-white font-mono font-bold text-xs">
                            {src.year}
                          </span>
                          <span className="font-bold text-[#2D3630] text-xs">
                            {src.label || `${src.year} আর্থিক বছর`}
                          </span>

                          {src.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2D5A41] text-white text-[10px] font-bold">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              <span>ডিফল্ট / সক্রিয় বছর</span>
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              src.enabled
                                ? 'bg-[#E8EFEA] text-[#2D5A41]'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {src.enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              src.isPublic !== false
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-zinc-100 text-zinc-500'
                            }`}
                          >
                            {src.isPublic !== false ? 'পাবলিকলি দৃশ্যমান' : 'লুকায়িত'}
                          </span>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                          {!src.isDefault && src.enabled && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultYear(src.year)}
                              className="px-2.5 py-1 rounded-lg border border-[#EBE8E0] bg-white hover:bg-[#F7F5F0] text-[#2D5A41] text-[11px] font-semibold transition-colors"
                              title="এই বছরটিকে ডিফল্ট হিসেবে সেট করুন"
                            >
                              ডিফল্ট করুন
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleYearSource(src.year)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              src.enabled
                                ? 'border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0]'
                                : 'bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20'
                            }`}
                          >
                            {src.enabled ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                          </button>

                          {src.url && (
                            <button
                              type="button"
                              disabled={isCurrentTesting}
                              onClick={() => handleTestSpecificYearSource(src)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2D5A41]/30 bg-[#E8EFEA] text-[#2D5A41] text-[11px] font-semibold hover:bg-[#D9E5DC] transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${isCurrentTesting ? 'animate-spin' : ''}`} />
                              <span>{isCurrentTesting ? 'যাচাই হচ্ছে...' : 'টেস্ট সিঙ্ক'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEditYearSource(src)}
                            className="p-1 rounded-lg border border-[#EBE8E0] text-[#2D3630] hover:bg-[#F7F5F0] transition-colors"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteYearSource(src.year)}
                            className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* URL & GID Information */}
                      <div className="pt-2 text-xs space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[#7A877E] shrink-0">শিট লিংক:</span>
                            {src.url ? (
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[#2D5A41] hover:underline truncate inline-flex items-center gap-1"
                              >
                                <span className="truncate">{src.url}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-amber-700 italic">কোনো লিংক যুক্ত করা হয়নি (অফলাইন / আর্কাইভ মোড)</span>
                            )}
                          </div>

                          <div className="text-[#7A877E] font-mono shrink-0">
                            GID / Tab ID: <span className="font-bold text-[#2D3630]">{src.gid || '0'}</span>
                          </div>
                        </div>

                        {src.notes && (
                          <div className="text-[11px] text-[#7A877E] italic pt-1">
                            নোট: {src.notes}
                          </div>
                        )}
                      </div>

                      {/* Test Result Preview for this year */}
                      {testRes && (
                        <div className="mt-3 p-3 rounded-lg bg-[#F7F5F0] border border-[#EBE8E0] text-[11px] font-mono flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                testRes.status === 'live' ? 'bg-[#2D5A41]' : 'bg-rose-500'
                              }`}
                            />
                            <span className="font-bold text-[#2D3630]">
                              {testRes.status === 'live' ? 'সংযোগ সফল' : 'সংযোগ ত্রুটি'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[#5C665F]">
                            <span>আদায়: ৳ {testRes.amountReceived.toLocaleString()}</span>
                            <span>ব্যয়: ৳ {testRes.amountSpent.toLocaleString()}</span>
                            <span>স্থিতি: ৳ {testRes.currentBalance.toLocaleString()}</span>
                            <span>সদস্য: {testRes.contributorCount} জন</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Opening Expense Balance Audit Card */}
            <div className="pt-6 border-t border-[#EBE8E0] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#2D5A41]" />
                    <span>প্রারম্ভিক ব্যয় ব্যালেন্স ও অডিট পর্যবেক্ষণ (Opening Expense Balance & Audit)</span>
                  </h3>
                  <p className="text-[11px] text-[#5C665F] mt-0.5">
                    ঐতিহাসিক বিস্তারিত ব্যয় এবং প্রারম্ভিক স্থিতির সমন্বয় পর্যবেক্ষণ।
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8EFEA] text-[#2D5A41] text-xs font-semibold self-start sm:self-center border border-[#2D5A41]/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ডুপ্লিকেশন সুরক্ষা সক্রিয় (Duplication Protected)</span>
                </div>
              </div>

              {/* Audit Explanation Banner */}
              <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#2D5A41]/20 space-y-2 text-xs">
                <div className="font-bold text-[#2D3630] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2D5A41]" />
                  <span>অর্থনৈতিক অডিট বিশ্লেষণ ও সমন্বয় তথ্য:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono">
                  <div className="p-2.5 rounded-lg bg-white border border-[#EBE8E0]">
                    <span className="text-[10px] text-[#7A877E] block">১. গুগল শিটে মোট ব্যয়</span>
                    <span className="text-sm font-bold text-[#2D3630]">৳ ৪,৯৫০</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#EBE8E0]">
                    <span className="text-[10px] text-[#7A877E] block">২. বিস্তারিত লেজারে ৩টি খরচ</span>
                    <span className="text-sm font-bold text-[#2D5A41]">৳ ৪,৯৫০ (১০০% সমন্বিত)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#EBE8E0]">
                    <span className="text-[10px] text-[#7A877E] block">৩. অতিরিক্ত ডুপ্লিকেশন ব্যয়</span>
                    <span className="text-sm font-bold text-[#2D5A41]">৳ ০ (কোনো ডুপ্লিকেট নেই)</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#5C665F] leading-relaxed pt-1">
                  বাইতুল মাল ফান্ডের ৩টি ঐতিহাসিক মানবিক উদ্যোগ (৳ ১,২০০ ওষুধ সহায়তা + ৳ ২,২৫০ ডায়াগনস্টিক পরীক্ষা + ৳ ১,৫০০ জরুরি সহায়তা = সর্বমোট ৳ ৪,৯৫০) ইতোমধ্যে বিস্তারিত ব্যয় লেজারে সংরক্ষিত রয়েছে। তাই ডুপ্লিকেশন প্রতিরোধে প্রারম্ভিক ব্যয় ব্যালেন্স আলাদা করে পুনরায় লেজারে যোগ করা হয়নি।
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 max-w-md pt-1">
                <div className="w-full">
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                    রেফারেন্স প্রারম্ভিক ব্যয় মান (৳)
                  </label>
                  <input
                    type="number"
                    value={config.openingExpenseBalance ?? 0}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      const updated = { ...config, openingExpenseBalance: val };
                      setConfig(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-xs font-mono text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    storageService.saveConfig(config);
                    showToast('প্রারম্ভিক ব্যয় রেফারেন্স মান সংরক্ষিত হয়েছে!');
                  }}
                  className="px-4 py-2 mt-4 sm:mt-5 rounded-xl bg-[#2D5A41] text-white text-xs font-semibold whitespace-nowrap hover:bg-[#234733] transition-colors"
                >
                  সংরক্ষণ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add / Edit Year Source Centered Viewport Modal */}
      {editingYearSource && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingYearSource(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-[#2D5A41]/40 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 text-xs"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE8E0] bg-[#FDFCF9] shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#2D3630]">
                  {isNewYearSource ? 'নতুন আর্থিক বছর ও সোর্স যোগ করুন' : 'আর্থিক বছরের সোর্স সম্পাদনা'}
                </h3>
                <p className="text-[11px] text-[#7A877E] mt-0.5">
                  বছর, গুগল স্প্রেডশিট লিংক এবং GID ট্যাব আইডি কনফিগার করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingYearSource(null)}
                className="p-1.5 text-[#7A877E] hover:text-[#2D3630] rounded-lg hover:bg-[#EBE8E0]/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSaveYearSource} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#2D3630] mb-1">
                      আর্থিক বছর * (যেমন: 2027)
                    </label>
                    <input
                      type="text"
                      required
                      value={editingYearSource.year || ''}
                      onChange={(e) => setEditingYearSource({ ...editingYearSource, year: e.target.value.trim() })}
                      placeholder="যেমন: 2027"
                      className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-xs font-mono text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2D3630] mb-1">
                      সোর্স লেবেল (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={editingYearSource.label || ''}
                      onChange={(e) => setEditingYearSource({ ...editingYearSource, label: e.target.value })}
                      placeholder="যেমন: ২০২৭ আর্থিক বছর"
                      className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">
                    Google Spreadsheet URL (গুগল শিট লিঙ্ক / CSV)
                  </label>
                  <input
                    type="url"
                    value={editingYearSource.url || ''}
                    onChange={(e) => setEditingYearSource({ ...editingYearSource, url: e.target.value.trim() })}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-xs font-mono text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                  />
                  <span className="block text-[10px] text-[#7A877E] mt-1">
                    স্প্রেডশিটের পারমিশন &apos;Anyone with the link can view&apos; হিসেবে শেয়ার থাকতে হবে।
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">
                    GID / Sheet Tab ID (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={editingYearSource.gid ?? '0'}
                    onChange={(e) => setEditingYearSource({ ...editingYearSource, gid: e.target.value.trim() })}
                    placeholder="যেমন: 0 অথবা 14920392"
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-xs font-mono text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                  />
                  <span className="block text-[10px] text-[#7A877E] mt-1">
                    স্প্রেডশিটের নির্দিষ্ট ট্যাবের URL শেষে থাকা #gid= সংখ্যাটি লিখুন (ডিফল্ট প্রথম ট্যাব: 0)।
                  </span>
                </div>

                <div className="space-y-2.5 p-3 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2D3630]">
                    <input
                      type="checkbox"
                      checked={Boolean(editingYearSource.isDefault)}
                      onChange={(e) => setEditingYearSource({ ...editingYearSource, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#2D5A41]"
                    />
                    <span>এই বছরটিকে ওয়েবসাইটের মূল ডিফল্ট বছর হিসেবে নির্ধারণ করুন</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2D3630]">
                    <input
                      type="checkbox"
                      checked={editingYearSource.enabled !== false}
                      onChange={(e) => setEditingYearSource({ ...editingYearSource, enabled: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#2D5A41]"
                    />
                    <span>এই আর্থিক বছরের ডাটা সোর্স সক্রিয় রাখুন</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2D3630]">
                    <input
                      type="checkbox"
                      checked={editingYearSource.isPublic !== false}
                      onChange={(e) => setEditingYearSource({ ...editingYearSource, isPublic: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#2D5A41]"
                    />
                    <span>পাবলিক তহবিল পেজে এই বছর প্রদর্শন করুন</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">
                    নোট / মন্তব্য (ঐচ্ছিক)
                  </label>
                  <textarea
                    rows={2}
                    value={editingYearSource.notes || ''}
                    onChange={(e) => setEditingYearSource({ ...editingYearSource, notes: e.target.value })}
                    placeholder="যেমন: ২০২৭ সালের লাইভ স্প্রেডশিট হিসাব..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBE8E0]">
                  <button
                    type="button"
                    onClick={() => setEditingYearSource(null)}
                    className="px-4 py-2 rounded-xl border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0] font-semibold transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white font-semibold shadow-2xs transition-colors"
                  >
                    সংরক্ষণ করুন
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* SECTION: FOUNDATION & BRAND IDENTITY CMS */}
      {activeSection === 'foundation' && (
        <AdminSiteSettingsTab
          config={config}
          onConfigChange={(updated) => {
            setConfig(updated);
            storageService.saveConfig(updated);
          }}
          onShowToast={showToast}
          currentSection="general"
          hideSubNav={false}
        />
      )}

      {/* SECTION: HOMEPAGE CMS */}
      {activeSection === 'homepage' && (
        <AdminSiteSettingsTab
          config={config}
          onConfigChange={(updated) => {
            setConfig(updated);
            storageService.saveConfig(updated);
          }}
          onShowToast={showToast}
          currentSection="hero"
          hideSubNav={true}
        />
      )}

      {/* SECTION: HEADER & NAVIGATION CMS */}
      {activeSection === 'header' && (
        <AdminSiteSettingsTab
          config={config}
          onConfigChange={(updated) => {
            setConfig(updated);
            storageService.saveConfig(updated);
          }}
          onShowToast={showToast}
          currentSection="header"
          hideSubNav={true}
        />
      )}

      {/* SECTION: FOOTER & COPYRIGHT CMS */}
      {activeSection === 'footer' && (
        <AdminSiteSettingsTab
          config={config}
          onConfigChange={(updated) => {
            setConfig(updated);
            storageService.saveConfig(updated);
          }}
          onShowToast={showToast}
          currentSection="footer"
          hideSubNav={true}
        />
      )}

      {/* SECTION: ABOUT US CMS */}
      {activeSection === 'about' && (
        <AdminSiteSettingsTab
          config={config}
          onConfigChange={(updated) => {
            setConfig(updated);
            storageService.saveConfig(updated);
          }}
          onShowToast={showToast}
          currentSection="about"
          hideSubNav={true}
        />
      )}

      {/* SECTION: CONTACT & SOCIAL CMS */}
      {activeSection === 'contact' && (
        <AdminSiteSettingsTab
          config={config}
          onConfigChange={(updated) => {
            setConfig(updated);
            storageService.saveConfig(updated);
          }}
          onShowToast={showToast}
          currentSection="contact"
          hideSubNav={false}
        />
      )}

      {/* SECTION: LANGUAGE & LOCALIZATION */}
      {activeSection === 'language' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6 text-xs">
          <div className="pb-4 border-b border-[#EBE8E0]">
            <h2 className="text-base font-bold text-[#2D3630] flex items-center gap-2">
              <Languages className="w-5 h-5 text-[#2D5A41]" />
              <span>ভাষা ও আন্তর্জাতিকীকরণ ব্যবস্থাপনা (Language & Localization)</span>
            </h2>
            <p className="text-xs text-[#5C665F] mt-1">
              সহানুভূতি ফাউন্ডেশনের ওয়েবসাইট বর্তমানে ৩টি আন্তর্জাতিক ভাষায় সক্রিয়ভাবে সমন্বিত।
            </p>
          </div>

          {/* Language Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#2D5A41]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#2D3630]">বাংলা (Bangla)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2D5A41] text-white">মূল ডিফল্ট</span>
              </div>
              <p className="text-[11px] text-[#5C665F]">ফাউন্ডেশনের উৎপত্তিস্থল ও প্রাথমিক ভাষা। সকল তথ্যের মূল ভিত্তি।</p>
              <div className="text-[10px] font-mono text-[#7A877E] pt-1 border-t border-[#EBE8E0]">LTR • Hind Siliguri</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#2D3630]">English (ইংরেজি)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8EFEA] text-[#2D5A41]">আন্তর্জাতিক</span>
              </div>
              <p className="text-[11px] text-[#5C665F]">বিশ্বব্যাপী প্রতিনিধি ও মানবিক অংশীদারদের সুবিধার্থে প্রযোজ্য।</p>
              <div className="text-[10px] font-mono text-[#7A877E] pt-1 border-t border-[#EBE8E0]">LTR • Plus Jakarta Sans</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#2D3630]">العربية (আরবি)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8EFEA] text-[#2D5A41]">প্রবাসী ও আত্মীয়</span>
              </div>
              <p className="text-[11px] text-[#5C665F]">মধ্যপ্রাচ্য ও উপসাগরীয় অঞ্চলের পরিবার ও শুভাকাঙ্ক্ষীদের জন্য পূর্ণাঙ্গ RTL ইন্টারফেস।</p>
              <div className="text-[10px] font-mono text-[#7A877E] pt-1 border-t border-[#EBE8E0]">RTL • Noto Sans Arabic</div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-[#2D3630] block">হেডার ও ফুটারে ভাষা পরিবর্তন বাটন প্রদর্শন (Language Switcher)</label>
                <p className="text-[11px] text-[#7A877E]">চালু থাকলে ভিজিটররা এক ক্লিকেই বাংলা, ইংরেজি ও আরবি ভাষার মাঝে বদল করতে পারবেন।</p>
              </div>
              <input
                type="checkbox"
                checked={config.showLanguageSelector !== false}
                onChange={(e) => {
                  const updated = { ...config, showLanguageSelector: e.target.checked };
                  setConfig(updated);
                  storageService.saveConfig(updated);
                  showToast('ভাষা সুইচার সেটিংস সংরক্ষিত হয়েছে!');
                }}
                className="w-5 h-5 rounded text-[#2D5A41] focus:ring-[#2D5A41] accent-[#2D5A41]"
              />
            </div>

            <div className="p-3 bg-[#E8EFEA] rounded-lg border border-[#2D5A41]/20 text-[#1E3E2D] text-xs leading-relaxed">
              💡 <strong>স্মার্ট ফলব্যাক নীতি:</strong> কোনো কার্যক্রম বা পরিচিতি লেখার সময় ইংরেজি বা আরবি ঘর ফাঁকা রাখলে স্বয়ংক্রিয়ভাবে মূল বাংলা লেখা প্রদর্শিত হবে। ফলে কোনো পেজেই অসম্পূর্ণতা বা শূন্যস্থান দেখা যাবে না।
            </div>
          </div>
        </div>
      )}

      {/* SECTION: SECURITY & SYSTEM BACKUP */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          {/* Cloud Synchronization & Migration Management */}
          <CloudSyncCard
            onRefreshLocalState={loadAllData}
            onShowToast={showToast}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Change Password Card */}
            <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#2D5A41]" />
                <h2 className="text-sm font-bold text-[#2D3630]">পাসওয়ার্ড পরিবর্তন</h2>
              </div>
              <p className="text-xs text-[#5C665F]">
                অ্যাডমিন প্যানেলে প্রবেশের পাসওয়ার্ড ক্রিপ্টোগ্রাফিক সল্ট সহ নিরাপদে পরিবর্তন করুন।
              </p>

              {passMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    passMsg.isError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {passMsg.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">বর্তমান পাসওয়ার্ড</label>
                  <div className="relative">
                    <input
                      type={showCurrPass ? 'text' : 'password'}
                      required
                      value={currPass}
                      onChange={(e) => setCurrPass(e.target.value)}
                      placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                      className="w-full pl-3 pr-9 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrPass(!showCurrPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#7A877E] hover:text-[#2D3630] transition-colors"
                      title={showCurrPass ? 'লুকান' : 'দেখুন'}
                    >
                      {showCurrPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ড লিখুন"
                      className="w-full pl-3 pr-9 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#7A877E] hover:text-[#2D3630] transition-colors"
                      title={showNewPass ? 'লুকান' : 'দেখুন'}
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ড পুনরায় লিখুন"
                      className="w-full pl-3 pr-9 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#7A877E] hover:text-[#2D3630] transition-colors"
                      title={showConfirmPass ? 'লুকান' : 'দেখুন'}
                    >
                      {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white font-semibold"
                >
                  পাসওয়ার্ড আপডেট করুন
                </button>
              </form>
            </div>

            {/* Backup and Restore Card */}
            <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-[#2D5A41]" />
                <h2 className="text-sm font-bold text-[#2D3630]">ডাটাবেজ ব্যাকআপ ও রিস্টোর</h2>
              </div>
              <p className="text-xs text-[#5C665F]">
                ফাউন্ডেশনের সকল ডাটা (সদস্য, কার্যক্রম, নোটিশ, গ্যালারি) একটি JSON ফাইলে সংরক্ষণ ও প্রয়োজনমাফিক ফিরিয়ে আনুন।
              </p>

              <div className="space-y-3 pt-2">
                <button
                  id="btn-admin-export-backup"
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#EBE8E0] bg-[#F7F5F0] hover:bg-[#EBE8E0] text-xs font-semibold text-[#2D3630] flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#2D5A41]" />
                  <span>সম্পূর্ণ ডাটাবেজ ডাউনলোড করুন (.json)</span>
                </button>

                <button
                  id="btn-admin-open-restore-modal"
                  type="button"
                  onClick={() => setIsRestoreModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#2D5A41]/30 bg-[#E8EFEA] hover:bg-[#D5E4D9] text-xs font-bold text-[#2D5A41] flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-[#2D5A41]" />
                  <span>রিস্টোর ব্যাকআপ (Restore Backup)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick link to site & SEO configuration */}
          <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#2D5A41]" />
              <span>উন্নত সাইট সেটিংস ও মেটা কনফিগারেশন</span>
            </h3>
            <AdminSiteSettingsTab
              config={config}
              onConfigChange={(updated) => {
                setConfig(updated);
                storageService.saveConfig(updated);
              }}
              onShowToast={showToast}
              currentSection="general"
              hideSubNav={false}
            />
          </div>
        </div>
      )}

          </main>
        </div>

      {/* Global Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Backup and Restore Modal */}
      <BackupRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onRestoreComplete={() => {
          loadAllData();
          showToast('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!');
        }}
      />
    </div>
  );
};
