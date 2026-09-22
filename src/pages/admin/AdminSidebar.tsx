import React, { useState } from 'react';
import {
  LayoutDashboard,
  Globe,
  Sparkles,
  Compass,
  Layers,
  FileText,
  Users,
  Calendar,
  ImageIcon,
  Bell,
  Wallet,
  PhoneCall,
  Languages,
  Settings,
  Inbox,
  LogOut,
  Home,
  Download,
  Search,
  X,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '../../components/Logo';

export type AdminSection =
  | 'overview'
  | 'foundation'
  | 'homepage'
  | 'header'
  | 'footer'
  | 'about'
  | 'members'
  | 'activities'
  | 'gallery'
  | 'notices'
  | 'fund'
  | 'contact'
  | 'language'
  | 'settings'
  | 'inbox';

export interface AdminSidebarItem {
  id: AdminSection;
  labelBn: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  highlightCount?: boolean;
  keywords: string[];
}

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  unreadCount: number;
  membersCount: number;
  activitiesCount: number;
  noticesCount: number;
  galleryCount: number;
  onLogout: () => void;
  onExportBackup: () => void;
  onReturnHome: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSelectSection,
  unreadCount,
  membersCount,
  activitiesCount,
  noticesCount,
  galleryCount,
  onLogout,
  onExportBackup,
  onReturnHome,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const navItems: AdminSidebarItem[] = [
    {
      id: 'overview',
      labelBn: 'ড্যাশবোর্ড',
      labelEn: 'Dashboard',
      icon: LayoutDashboard,
      keywords: ['dashboard', 'overview', 'ড্যাশবোর্ড', 'পরিসংখ্যান', 'stats', 'home'],
    },
    {
      id: 'foundation',
      labelBn: 'ফাউন্ডেশন ও ব্র্যান্ড',
      labelEn: 'Foundation / Brand',
      icon: Globe,
      keywords: ['foundation', 'brand', 'logo', 'name', 'location', 'date', 'প্রতিষ্ঠা', 'লোগো', 'নাম', 'ঠিকানা', 'অবস্থান', 'ব্র্যান্ড'],
    },
    {
      id: 'homepage',
      labelBn: 'হোমপেজ কনটেন্ট',
      labelEn: 'Homepage CMS',
      icon: Sparkles,
      keywords: ['homepage', 'hero', 'badge', 'slogan', 'title', 'cta', 'button', 'হিরো', 'হোমপেজ', 'স্লোগান', 'বাটন'],
    },
    {
      id: 'header',
      labelBn: 'হেডার কন্ট্রোল',
      labelEn: 'Header Settings',
      icon: Compass,
      keywords: ['header', 'menu', 'nav', 'navigation', 'phone', 'হেডার', 'মেনু', 'ন্যাভিগেশন', 'ফোন'],
    },
    {
      id: 'footer',
      labelBn: 'ফুটার কন্ট্রোল',
      labelEn: 'Footer Settings',
      icon: Layers,
      keywords: ['footer', 'copyright', 'social', 'address', 'ফুটার', 'কপিরাইট', 'সোশ্যাল'],
    },
    {
      id: 'about',
      labelBn: 'আমাদের সম্পর্কে',
      labelEn: 'About CMS',
      icon: FileText,
      keywords: ['about', 'history', 'speech', 'mission', 'vision', 'baytul mal', 'সম্পর্কে', 'বক্তব্য', 'ইতিহাস', 'বাইতুল মাল', 'উদ্দেশ্য'],
    },
    {
      id: 'members',
      labelBn: 'সদস্য ও পদবী',
      labelEn: 'Members & Designations',
      icon: Users,
      count: membersCount,
      keywords: ['member', 'members', 'designation', 'team', 'committee', 'সদস্য', 'পদবী', 'কমিটি', 'টিম'],
    },
    {
      id: 'activities',
      labelBn: 'কার্যক্রম ও উদ্যোগ',
      labelEn: 'Activities',
      icon: Calendar,
      count: activitiesCount,
      keywords: ['activity', 'activities', 'initiative', 'event', 'কার্যক্রম', 'উদ্যোগ', 'ইভেন্ট'],
    },
    {
      id: 'gallery',
      labelBn: 'মিডিয়া গ্যালারি',
      labelEn: 'Gallery',
      icon: ImageIcon,
      count: galleryCount,
      keywords: ['gallery', 'photo', 'video', 'image', 'media', 'গ্যালারি', 'ছবি', 'ভিডিও', 'মিডিয়া'],
    },
    {
      id: 'notices',
      labelBn: 'বিজ্ঞপ্তি ও নোটিশ',
      labelEn: 'Notices',
      icon: Bell,
      count: noticesCount,
      keywords: ['notice', 'notices', 'announcement', 'বিজ্ঞপ্তি', 'নোটিশ', 'ঘোষণা'],
    },
    {
      id: 'fund',
      labelBn: 'তহবিল ও ব্যয় হিসাব',
      labelEn: 'Fund & Finance',
      icon: Wallet,
      keywords: ['fund', 'finance', 'sheet', 'google sheet', 'expense', 'expenses', 'ledger', 'balance', 'money', 'তহবিল', 'ব্যয়', 'হিসাব', 'শিট', 'ব্যালেন্স'],
    },
    {
      id: 'contact',
      labelBn: 'যোগাযোগ ও সোশ্যাল',
      labelEn: 'Contact & Social',
      icon: PhoneCall,
      keywords: ['contact', 'phone', 'email', 'facebook', 'social', 'map', 'যোগাযোগ', 'ফোন', 'ইমেইল', 'ম্যাপ', 'ফেসবুক'],
    },
    {
      id: 'language',
      labelBn: 'ভাষা ব্যবস্থাপনা',
      labelEn: 'Language & RTL',
      icon: Languages,
      keywords: ['language', 'bangla', 'english', 'arabic', 'rtl', 'translation', 'ভাষা', 'অনুবাদ', 'আরবি', 'ইংরেজি'],
    },
    {
      id: 'settings',
      labelBn: 'সাইট সেটিংস ও ব্যাকআপ',
      labelEn: 'Site Settings & Security',
      icon: Settings,
      keywords: ['settings', 'password', 'security', 'backup', 'restore', 'seo', 'নিরাপত্তা', 'পাসওয়ার্ড', 'ব্যাকআপ', 'রিস্টোর', 'সেটিংস'],
    },
    {
      id: 'inbox',
      labelBn: 'যোগাযোগ ইনবক্স',
      labelEn: 'Inbox Messages',
      icon: Inbox,
      count: unreadCount,
      highlightCount: unreadCount > 0,
      keywords: ['inbox', 'message', 'messages', 'mail', 'inquiry', 'ইনবক্স', 'বার্তা', 'চিঠি'],
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.labelBn.toLowerCase().includes(q) ||
      item.labelEn.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const content = (
    <div className="flex flex-col h-full bg-white text-[#2D3630]">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#EBE8E0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#F7F5F0] rounded-xl border border-[#EBE8E0]">
              <Logo size="sm" showText={false} location="admin" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#2D3630] leading-tight">
                সহানুভূতি ফাউন্ডেশন
              </h2>
              <span className="text-[10px] text-[#2D5A41] font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A41] animate-pulse" />
                অ্যাডমিন নিয়ন্ত্রণ কেন্দ্র
              </span>
            </div>
          </div>
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#7A877E] hover:bg-[#F7F5F0] lg:hidden"
              title="মেনু বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Search & Filter Input */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-[#7A877E] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সেটিংস খুঁজুন (যেমন: logo, hero, phone)..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#F7F5F0] border border-[#EBE8E0] rounded-xl text-[#2D3630] placeholder:text-[#9AA69E] focus:outline-hidden focus:bg-white focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#7A877E] hover:text-[#2D3630]"
              title="খোঁজা মুছুন"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#7A877E]">
            &apos;{searchQuery}&apos; সংশ্লিষ্ট কোনো মেনু পাওয়া যায়নি
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  if (isMobileOpen) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-[#2D5A41] text-white shadow-2xs font-semibold'
                    : 'text-[#4D5750] hover:bg-[#F7F5F0] hover:text-[#2D3630]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-[#5C665F]'
                    }`}
                  />
                  <div className="text-left truncate">
                    <span className="block truncate">{item.labelBn}</span>
                    <span
                      className={`block text-[10px] truncate leading-tight ${
                        isActive ? 'text-white/80' : 'text-[#7A877E]'
                      }`}
                    >
                      {item.labelEn}
                    </span>
                  </div>
                </div>

                {/* Badge Count if available */}
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-1.5 ${
                      isActive
                        ? 'bg-white text-[#2D5A41]'
                        : item.highlightCount
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-[#E8EFEA] text-[#2D5A41]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer Quick Actions */}
      <div className="p-3 border-t border-[#EBE8E0] bg-[#FDFCF9] space-y-1.5 text-xs">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-[#EBE8E0] bg-white hover:bg-[#F7F5F0] text-[#2D3630] font-semibold transition-colors shadow-3xs"
            title="মূল ওয়েবসাইট দেখুন"
          >
            <Home className="w-3.5 h-3.5 text-[#5C665F]" />
            <span className="text-[11px]">ওয়েবসাইট</span>
          </button>

          <button
            type="button"
            onClick={onExportBackup}
            className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-[#EBE8E0] bg-white hover:bg-[#F7F5F0] text-[#2D3630] font-semibold transition-colors shadow-3xs"
            title="ডাটাবেজ ব্যাকআপ ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5 text-[#5C665F]" />
            <span className="text-[11px]">ব্যাকআপ</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-[11px]">অ্যাডমিন সেশন লগআউট</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-[calc(100vh-3.5rem)] sticky top-4 rounded-2xl border border-[#EBE8E0] shadow-xs overflow-hidden">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-[#2D3630]/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Sliding drawer */}
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
