import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import { storageService } from '../../services/storageService';
import { fetchFundData } from '../../services/fundService';
import { ConfirmModal } from '../../components/ConfirmModal';
import { MediaUploadField } from '../../components/MediaUploadField';
import { DesignationBadge } from '../../components/DesignationBadge';
import { AdminExpensesTab } from './AdminExpensesTab';
import { AdminSiteSettingsTab } from './AdminSiteSettingsTab';
import { AdminDesignationsManager } from './AdminDesignationsManager';
import { AdminSidebar, AdminSection } from './AdminSidebar';
import { CloudSyncCard } from './CloudSyncCard';
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

  // Forms / Modals state
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [editingActivity, setEditingActivity] = useState<Partial<Activity> | null>(null);
  const [editingNotice, setEditingNotice] = useState<Partial<Notice> | null>(null);
  const [editingGallery, setEditingGallery] = useState<Partial<GalleryItem> | null>(null);
  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [inboxSearch, setInboxSearch] = useState('');

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

  // Fund URL input state
  const [fundUrlInput, setFundUrlInput] = useState('');

  // Status message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    const authed = authService.isAuthenticated();
    setIsAuthenticated(authed);
    if (authed) {
      loadAllData();
    }
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
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name) return;

    const newMember: Member = {
      id: editingMember.id || `mem-${Date.now()}`,
      serial: Number(editingMember.serial) || members.length + 1,
      name: editingMember.name,
      role: editingMember.role || '',
      designationId: editingMember.designationId,
      photoUrl: editingMember.photoUrl || '',
      bio: editingMember.bio || '',
      address: editingMember.address || '',
      phone: editingMember.phone || '',
      email: editingMember.email || '',
      joiningDate: editingMember.joiningDate || new Date().toISOString().split('T')[0],
      isActive: editingMember.isActive !== false,
      isFamilyMember: true,
      imageShape: editingMember.imageShape,
      imagePosition: editingMember.imagePosition,
      createdAt: editingMember.createdAt || new Date().toISOString(),
    };

    const updated = storageService.saveMember(newMember);
    setMembers(updated);
    setEditingMember(null);
    showToast('সদস্য তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
  };

  const handleDeleteMember = (id: string) => {
    requestConfirm('সদস্য মুছে ফেলুন', 'আপনি কি নিশ্চিতভাবে এই সদস্যকে তালিকা থেকে মুছে ফেলতে চান?', () => {
      const updated = storageService.deleteMember(id);
      setMembers(updated);
      showToast('সদস্য মুছে ফেলা হয়েছে।');
    });
  };

  // Activity operations
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editingActivity.title) return;

    const titleStr = typeof editingActivity.title === 'string' ? editingActivity.title : editingActivity.title.bn || '';
    const newAct: Activity = {
      id: editingActivity.id || `act-${Date.now()}`,
      slug: editingActivity.slug || titleStr.toLowerCase().replace(/\s+/g, '-').slice(0, 40),
      title: typeof editingActivity.title === 'object' ? editingActivity.title : { bn: titleStr, en: titleStr, ar: titleStr },
      summary: typeof editingActivity.summary === 'object' ? editingActivity.summary : { bn: editingActivity.summary || '', en: editingActivity.summary || '', ar: editingActivity.summary || '' },
      description: typeof editingActivity.description === 'object' ? editingActivity.description : { bn: editingActivity.description || '', en: editingActivity.description || '', ar: editingActivity.description || '' },
      date: editingActivity.date || new Date().toISOString().split('T')[0],
      category: editingActivity.category || 'সাধারণ',
      coverImage: editingActivity.coverImage || '',
      isPublished: editingActivity.isPublished !== false,
      createdAt: editingActivity.createdAt || new Date().toISOString(),
    };

    const updated = storageService.saveActivity(newAct);
    setActivities(updated);
    setEditingActivity(null);
    showToast('কার্যক্রম সংরক্ষিত হয়েছে!');
  };

  const handleDeleteActivity = (id: string) => {
    requestConfirm('কার্যক্রম মুছে ফেলুন', 'আপনি কি এই কার্যক্রম মুছে ফেলতে চান?', () => {
      const updated = storageService.deleteActivity(id);
      setActivities(updated);
      showToast('কার্যক্রম মুছে ফেলা হয়েছে।');
    });
  };

  // Notice operations
  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice || !editingNotice.title) return;

    const titleStr = typeof editingNotice.title === 'string' ? editingNotice.title : editingNotice.title.bn || '';
    const bodyStr = typeof editingNotice.body === 'string' ? editingNotice.body : editingNotice.body.bn || '';

    const newNotice: Notice = {
      id: editingNotice.id || `not-${Date.now()}`,
      title: typeof editingNotice.title === 'object' ? editingNotice.title : { bn: titleStr, en: titleStr, ar: titleStr },
      body: typeof editingNotice.body === 'object' ? editingNotice.body : { bn: bodyStr, en: bodyStr, ar: bodyStr },
      date: editingNotice.date || new Date().toISOString().split('T')[0],
      isImportant: Boolean(editingNotice.isImportant),
      isPublished: editingNotice.isPublished !== false,
      attachmentUrl: editingNotice.attachmentUrl || '',
      createdAt: editingNotice.createdAt || new Date().toISOString(),
    };

    const updated = storageService.saveNotice(newNotice);
    setNotices(updated);
    setEditingNotice(null);
    showToast('নোটিশ সংরক্ষিত হয়েছে!');
  };

  const handleDeleteNotice = (id: string) => {
    requestConfirm('নোটিশ মুছে ফেলুন', 'আপনি কি এই নোটিশ মুছে ফেলতে চান?', () => {
      const updated = storageService.deleteNotice(id);
      setNotices(updated);
      showToast('নোটিশ মুছে ফেলা হয়েছে।');
    });
  };

  // Gallery operations
  const handleSaveGallery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGallery || !editingGallery.url) return;

    const titleStr = typeof editingGallery.title === 'string' ? editingGallery.title : editingGallery.title?.bn || '';
    const newG: GalleryItem = {
      id: editingGallery.id || `gal-${Date.now()}`,
      title: typeof editingGallery.title === 'object' ? editingGallery.title : { bn: titleStr, en: titleStr, ar: titleStr },
      mediaUrl: editingGallery.url || editingGallery.mediaUrl || '',
      url: editingGallery.url,
      type: (editingGallery.type as any) || 'photo',
      thumbnailUrl: editingGallery.thumbnailUrl || editingGallery.url,
      category: editingGallery.category || 'অন্যান্য',
      year: editingGallery.year || new Date().getFullYear().toString(),
      isPublished: editingGallery.isPublished !== false,
      createdAt: editingGallery.createdAt || new Date().toISOString(),
    };

    const updated = storageService.saveGalleryItem(newG);
    setGallery(updated);
    setEditingGallery(null);
    showToast('গ্যালারি আইটেম সংরক্ষিত হয়েছে!');
  };

  const handleDeleteGallery = (id: string) => {
    requestConfirm('গ্যালারি আইটেম মুছে ফেলুন', 'আপনি কি এই ছবি/ভিডিও মুছে ফেলতে চান?', () => {
      const updated = storageService.deleteGalleryItem(id);
      setGallery(updated);
      showToast('গ্যালারি আইটেম মুছে ফেলা হয়েছে।');
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
  const handleSaveFundSource = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig = { ...config, fundSourceUrl: fundUrlInput.trim() };
    storageService.saveConfig(updatedConfig);
    setConfig(updatedConfig);
    showToast('তহবিল ডাটা সোর্স URL সংরক্ষিত হয়েছে!');
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

  // Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass !== confirmPass) {
      setPassMsg({ text: 'নতুন পাসওয়ার্ড দুটি মিলছে না।', isError: true });
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
    const jsonStr = storageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sahanubhuti-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!');
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
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-sm text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
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
                  onClick={() => setEditingMember({ serial: members.length + 1, isActive: true })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold self-start sm:self-center"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন সদস্য যুক্ত করুন</span>
                </button>
              </div>

          {/* Member Edit / Add Form Modal */}
          {editingMember && (
            <div className="p-6 rounded-2xl bg-white border border-[#2D5A41]/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
                <h3 className="text-sm font-bold text-[#2D3630]">
                  {editingMember.id ? 'সদস্যের তথ্য সম্পাদনা' : 'নতুন সদস্য ফরম'}
                </h3>
                <button
                  onClick={() => setEditingMember(null)}
                  className="p-1 text-[#7A877E] hover:text-[#2D3630]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMember} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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

                <div className="sm:col-span-2">
                  <MediaUploadField
                    label="সদস্যের ছবি (ঐচ্ছিক)"
                    value={editingMember.photoUrl || ''}
                    onChange={(url) => setEditingMember({ ...editingMember, photoUrl: url })}
                    helperText="সদস্যের পোর্ট্রেট ছবি (JPG, PNG - সর্বোচ্চ ১০ MB)"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">ফোন নম্বর</label>
                  <input
                    type="text"
                    value={editingMember.phone || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">ইমেইল</label>
                  <input
                    type="email"
                    value={editingMember.email || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
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

                <div className="flex items-center justify-end gap-2 sm:col-span-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] font-semibold hover:bg-[#F7F5F0]"
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
          )}

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
                        onClick={() => setEditingMember(m)}
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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2D3630]">
              কার্যক্রম সম্পাদক ({activities.length})
            </h2>
            <button
              onClick={() => setEditingActivity({ isPublished: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কার্যক্রম যুক্ত করুন</span>
            </button>
          </div>

          {editingActivity && (
            <div className="p-6 rounded-2xl bg-white border border-[#2D5A41]/40 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
                <h3 className="text-sm font-bold text-[#2D3630]">
                  {editingActivity.id ? 'কার্যক্রম সম্পাদনা' : 'নতুন কার্যক্রম'}
                </h3>
                <button onClick={() => setEditingActivity(null)} className="p-1 text-[#7A877E] hover:text-[#2D3630]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveActivity} className="space-y-3">
                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">কার্যক্রমের শিরোনাম *</label>
                  <input
                    type="text"
                    required
                    value={typeof editingActivity.title === 'object' ? editingActivity.title.bn : editingActivity.title || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value as any })}
                    placeholder="যেমন: জরুরি ওষুধ সহায়তা"
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#2D3630] mb-1">তারিখ</label>
                    <input
                      type="date"
                      value={editingActivity.date || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#2D3630] mb-1">বিভাগ</label>
                    <input
                      type="text"
                      value={editingActivity.category || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, category: e.target.value })}
                      placeholder="যেমন: ওষুধ ও চিকিৎসা"
                      className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                  </div>
                </div>

                <MediaUploadField
                  label="কার্যক্রমের কভার ছবি"
                  value={editingActivity.coverImage || ''}
                  onChange={(url) => setEditingActivity({ ...editingActivity, coverImage: url })}
                  helperText="কার্যক্রমের ব্যানার বা ফটো (JPG, PNG - সর্বোচ্চ ১০ MB)"
                />

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">সংক্ষিপ্ত বিবরণ</label>
                  <textarea
                    rows={2}
                    value={typeof editingActivity.summary === 'object' ? editingActivity.summary.bn : editingActivity.summary || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, summary: e.target.value as any })}
                    placeholder="এক বা দুই বাক্যে সারসংক্ষেপ..."
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">বিস্তারিত বিবরণ</label>
                  <textarea
                    rows={4}
                    value={typeof editingActivity.description === 'object' ? editingActivity.description.bn : editingActivity.description || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value as any })}
                    placeholder="সম্পূর্ণ বিবরণ লিখুন..."
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPubAct"
                    checked={editingActivity.isPublished !== false}
                    onChange={(e) => setEditingActivity({ ...editingActivity, isPublished: e.target.checked })}
                    className="rounded accent-[#2D5A41]"
                  />
                  <label htmlFor="isPubAct" className="font-semibold text-[#2D3630]">
                    প্রকাশ করুন (Published)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingActivity(null)}
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
          )}

          <div className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-xl bg-white border border-[#EBE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-xs"
              >
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
                  <div className="text-[#A4B3A8] mt-0.5 text-[11px]">তারিখ: {act.date}</div>
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

          {editingNotice && (
            <div className="p-6 rounded-2xl bg-white border border-[#2D5A41]/40 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
                <h3 className="text-sm font-bold text-[#2D3630]">নোটিশ ফরম</h3>
                <button onClick={() => setEditingNotice(null)} className="p-1 text-[#7A877E] hover:text-[#2D3630]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNotice} className="space-y-3">
                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">নোটিশের শিরোনাম *</label>
                  <input
                    type="text"
                    required
                    value={typeof editingNotice.title === 'object' ? editingNotice.title.bn : editingNotice.title || ''}
                    onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value as any })}
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
                  <label className="block font-bold text-[#2D3630] mb-1">নোটিশের মূল বার্তা *</label>
                  <textarea
                    rows={4}
                    required
                    value={typeof editingNotice.body === 'object' ? editingNotice.body.bn : editingNotice.body || ''}
                    onChange={(e) => setEditingNotice({ ...editingNotice, body: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                </div>

                <MediaUploadField
                  label="সংযুক্ত ফাইল বা অফিসিয়াল সার্কুলার ছবি (ঐচ্ছিক)"
                  value={editingNotice.attachmentUrl || ''}
                  onChange={(url) => setEditingNotice({ ...editingNotice, attachmentUrl: url })}
                  helperText="নোটিশের অফিসিয়াল সার্কুলার বা মেমো ছবি (JPG, PNG - সর্বোচ্চ ১০ MB)"
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

                <div className="flex justify-end gap-2 pt-2">
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
                গ্যালারি মিডিয়া ব্যবস্থাপনা ({gallery.length})
              </h2>
              <p className="text-xs text-[#5C665F] mt-0.5">
                ছবি ও ভিডিও গ্যালারিতে প্রকাশ করুন।
              </p>
            </div>
            <button
              onClick={() => setEditingGallery({ isPublished: true, type: 'image' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ছবি/ভিডিও যুক্ত করুন</span>
            </button>
          </div>

          {editingGallery && (
            <div className="p-6 rounded-2xl bg-white border border-[#2D5A41]/40 shadow-xs space-y-4 text-xs">
              <form onSubmit={handleSaveGallery} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#2D3630] mb-1">ধরন</label>
                    <select
                      value={editingGallery.type || 'image'}
                      onChange={(e) => setEditingGallery({ ...editingGallery, type: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    >
                      <option value="image">ছবি (Image)</option>
                      <option value="video">ভিডিও (Video)</option>
                    </select>
                  </div>
                </div>

                <MediaUploadField
                  label={editingGallery.type === 'video' ? 'ভিডিও ফাইল বা লিঙ্ক *' : 'ছবি ফাইল আপলোড করুন *'}
                  value={editingGallery.url || ''}
                  isVideo={editingGallery.type === 'video'}
                  onChange={(url) => setEditingGallery({ ...editingGallery, url })}
                  required
                  helperText={editingGallery.type === 'video' ? 'ভিডিও ফাইল (MP4) বা ইউটিউব/ভিডিও ইউআরএল' : 'গ্যালারি ফটো (JPG, PNG - সর্বোচ্চ ১০ MB)'}
                />

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">ক্যাপশন / শিরোনাম</label>
                  <input
                    type="text"
                    value={typeof editingGallery.title === 'object' ? editingGallery.title.bn : editingGallery.title || ''}
                    onChange={(e) => setEditingGallery({ ...editingGallery, title: e.target.value as any })}
                    placeholder="যেমন: মৌলভী বাড়ি প্রাঙ্গণে সভা"
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
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
                    <label className="block font-bold text-[#2D3630] mb-1">সাল / বছর</label>
                    <input
                      type="text"
                      value={editingGallery.year || '2024'}
                      onChange={(e) => setEditingGallery({ ...editingGallery, year: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingGallery(null)}
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
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {gallery.map((g) => (
              <div key={g.id} className="relative rounded-xl overflow-hidden border border-[#EBE8E0] group aspect-video bg-[#F7F5F0]">
                <img src={g.thumbnailUrl || g.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#2D3630]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleDeleteGallery(g.id)}
                    className="p-1.5 rounded-lg bg-rose-600 text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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

            <form onSubmit={handleSaveFundSource} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2D3630] mb-1">
                  Fund Data Source URL (গুগল শিট লিঙ্ক / CSV URL)
                </label>
                <input
                  type="url"
                  required
                  value={fundUrlInput}
                  onChange={(e) => setFundUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-xs font-mono text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
                <span className="block text-[11px] text-[#7A877E] mt-1 break-all">
                  বর্তমান সক্রিয় গুগল শিট: {config.fundSourceUrl || 'https://docs.google.com/spreadsheets/d/1bh2WGcphb2ZTVzyaE9Yo3UHCOe_NkQtzoolS9UPuETg/edit?usp=sharing'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold shadow-2xs"
                >
                  URL সংরক্ষণ করুন
                </button>

                <button
                  type="button"
                  onClick={handleTestFundSource}
                  disabled={testingFund}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F7F5F0] hover:bg-[#EBE8E0] text-[#2D3630] border border-[#EBE8E0] text-xs font-semibold transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingFund ? 'animate-spin' : ''}`} />
                  <span>{testingFund ? 'সংযোগ পরীক্ষা হচ্ছে...' : 'সংযোগ পরীক্ষা ও সিঙ্ক'}</span>
                </button>
              </div>
            </form>

            {fundPreview && (
              <div className="p-5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-[#2D3630] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#2D5A41]" />
                    <span>গুগল শিট সংযোগের ফলাফল (Live Sync Success):</span>
                  </strong>
                  <span className="text-[11px] text-[#2D5A41] font-semibold bg-[#E8EFEA] px-2 py-0.5 rounded-full">
                    অনলাইন সক্রিয়
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] text-[#2D3630]">
                    <span className="text-[10px] text-[#7A877E] block">মোট জমা (Received)</span>
                    <span className="text-base font-bold text-[#2D5A41]">৳ {fundPreview.amountReceived.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] text-[#2D3630]">
                    <span className="text-[10px] text-[#7A877E] block">মোট ব্যয় (Spent)</span>
                    <span className="text-base font-bold text-rose-600">৳ {fundPreview.amountSpent.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] text-[#2D5A41] font-bold">
                    <span className="text-[10px] text-[#7A877E] block">বর্তমান স্থিতি (Balance)</span>
                    <span className="text-base font-bold text-[#2D5A41]">৳ {fundPreview.currentBalance.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] text-[#2D3630]">
                    <span className="text-[10px] text-[#7A877E] block">মোট লেনদেন</span>
                    <span className="text-base font-bold text-[#2D3630]">{fundPreview.transactions?.length || 0} টি</span>
                  </div>
                </div>
              </div>
            )}

            {/* Opening Expense Balance Card */}
            <div className="pt-4 border-t border-[#EBE8E0] space-y-3">
              <h3 className="text-xs font-bold text-[#2D3630]">
                প্রারম্ভিক ব্যয় ব্যালেন্স কনফিগারেশন (Opening Expense Balance)
              </h3>
              <p className="text-[11px] text-[#5C665F]">
                গুগল শিটের বাইরে সরাসরি পূর্বে বাস্তবায়িত মানবিক উদ্যোগ (যেমন: ৳ ১,২০০ প্রেসক্রিপশন সহায়তা) হিসেবে যুক্ত করার ভিত্তি।
              </p>
              <div className="flex items-center gap-3 max-w-sm">
                <input
                  type="number"
                  value={config.openingExpenseBalance ?? 0}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    const updated = { ...config, openingExpenseBalance: val };
                    setConfig(updated);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-xs font-mono text-[#2D3630]"
                />
                <button
                  type="button"
                  onClick={() => {
                    storageService.saveConfig(config);
                    showToast('প্রারম্ভিক ব্যয় ব্যালেন্স সংরক্ষিত হয়েছে!');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2D5A41] text-white text-xs font-semibold whitespace-nowrap hover:bg-[#234733]"
                >
                  সংরক্ষণ
                </button>
              </div>
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
          currentSection="social"
          hideSubNav={true}
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
                  <input
                    type="password"
                    required
                    value={currPass}
                    onChange={(e) => setCurrPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">নতুন পাসওয়ার্ড</label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
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
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#EBE8E0] bg-[#F7F5F0] hover:bg-[#EBE8E0] text-xs font-semibold text-[#2D3630] flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#5C665F]" />
                  <span>সম্পূর্ণ ডাটাবেজ ডাউনলোড করুন (.json)</span>
                </button>

                <div>
                  <label className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-[#EBE8E0] hover:border-[#2D5A41]/40 text-xs font-semibold text-[#5C665F] flex items-center justify-center gap-2 cursor-pointer transition-colors bg-[#FDFCF9]">
                    <Upload className="w-4 h-4 text-[#7A877E]" />
                    <span>ব্যাকআপ ফাইল নির্বাচন করে রিস্টোর করুন</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
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
    </div>
  );
};
