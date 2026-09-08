/**
 * Core type definitions for Sahanubhuti Foundation (সহানুভূতি ফাউন্ডেশন)
 */

export type Language = 'bn' | 'en' | 'ar';

export interface MultilingualText {
  bn: string;
  en: string;
  ar: string;
}

export type Gender = 'male' | 'female' | 'other';

export interface Designation {
  id: string;
  name: MultilingualText;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  accentColor?: string;
  badgeStyle?: 'classic' | 'soft' | 'outline' | 'accent';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
  isPredefined?: boolean;
}

export interface Member {
  id: string;
  serial: number;
  name: string;
  gender?: Gender;
  role?: string; // Designation text e.g. সভাপতি, প্রধান সমন্বয়ক
  designationId?: string; // ID referencing Designation definition
  photoUrl?: string;
  phone?: string;
  email?: string;
  location?: string;
  address?: string;
  joiningDate?: string;
  bio?: string;
  responsibilities?: string;
  isActive: boolean;
  isFamilyMember?: boolean;
  imageShape?: 'circle' | 'rounded' | 'square';
  imageFit?: 'cover' | 'contain';
  imagePosition?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  slug: string;
  title: MultilingualText;
  summary: MultilingualText;
  description: MultilingualText;
  date: string;
  category: string;
  coverImage?: string;
  images?: string[];
  galleryImages?: string[];
  isPublished: boolean;
  createdAt: string;
}

export interface Notice {
  id: string;
  title: MultilingualText;
  body: MultilingualText;
  date: string;
  link?: string;
  attachmentUrl?: string;
  isImportant?: boolean;
  isPublished: boolean;
  createdAt: string;
}

export type GalleryType = 'photo' | 'video' | 'image';

export interface GalleryItem {
  id: string;
  type: GalleryType;
  mediaUrl: string;
  url?: string;
  thumbnailUrl?: string;
  title: MultilingualText;
  description?: MultilingualText;
  caption?: MultilingualText;
  category: string;
  year: number | string;
  isPublished: boolean;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  amount: number;
  title: string;
  category: string;
  customCategory?: string;
  description?: string;
  recipient?: string;
  isRecipientPublic?: boolean;
  location?: string;
  receiptUrl?: string;
  isVerified?: boolean;
  year?: string | number;
  isPublic?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface FundVisibilitySettings {
  showTotalReceived: boolean;
  showTotalCost: boolean;
  showAvailableBalance: boolean;
  showExpenseDetails: boolean;
  showMonthlyFundDetails: boolean;
  showMemberContributionDetails: boolean;
}

export interface FundTransaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  donorOrReceiver?: string;
  category?: string;
  voucherNo?: string;
}

export interface FundMemberRecord {
  serial: number;
  name: string;
  commitment: number;
  months: { [month: string]: 'paid' | 'unpaid' };
  totalContributed: number;
  paidCount: number;
}

export interface FundData {
  totalFund: number;
  amountReceived: number;
  amountSpent: number;
  currentBalance: number;
  sheetSummaryCost?: number;
  sheetSummaryBalance?: number;
  balanceDiscrepancy?: boolean;
  discrepancyDiff?: number;
  contributorCount: number;
  yearlyReceived?: { [year: string]: number };
  monthlyTotals?: { [month: string]: number };
  memberRecords?: FundMemberRecord[];
  transactions: FundTransaction[];
  expenses: ExpenseRecord[];
  lastUpdated: string;
  sourceUrl: string;
  sourceType: 'google_sheet' | 'api' | 'manual';
  status: 'live' | 'fallback' | 'error';
  errorMessage?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  senderName?: string;
  email: string;
  senderEmail?: string;
  phone?: string;
  senderPhone?: string;
  subject?: string;
  message: string;
  submittedAt: string;
  isRead: boolean;
  isArchived: boolean;
}

export interface SocialLink {
  id: string;
  platform: 'facebook' | 'email' | 'phone' | 'youtube' | 'instagram' | 'whatsapp' | 'other';
  label: string;
  url: string;
  icon: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface LogoOverrides {
  header?: string;
  hero?: string;
  footer?: string;
  admin?: string;
}

export interface FooterVisibilitySettings {
  showDescription?: boolean;
  showNavigation?: boolean;
  showOrigin?: boolean;
  showContact?: boolean;
  showSocial?: boolean;
  showCopyright?: boolean;
}

export interface FoundationConfig {
  nameEn: string;
  nameBn: string;
  nameAr: string;
  logoUrl: string;
  logoOverrides?: LogoOverrides;
  headerTagline?: MultilingualText;
  headerCtaText?: MultilingualText;
  headerCtaLink?: string;
  showHeaderCta?: boolean;
  showHeaderPhone?: boolean;
  showLanguageSelector?: boolean;
  originLocation: string;
  foundationLocation?: MultilingualText;
  locationDisplayMode?: 'text' | 'map' | 'hidden';
  locationMapUrl?: string;
  foundedDate: string;
  showFoundingDate?: boolean;
  familyInitiativeText?: MultilingualText;
  expansionStatement?: MultilingualText;
  implementedInitiative?: MultilingualText;
  baytulMalText?: MultilingualText;
  aboutImage?: string;
  email: string;
  facebookUrl: string;
  phone?: string;
  showPhone?: boolean;
  phonePlaceholder?: string;
  youtubeUrl?: string;
  whatsappNumber?: string;
  imoNumber?: string;
  fundSourceUrl: string;
  openingExpenseBalance?: number;
  fundVisibility: FundVisibilitySettings;
  expenseCategories: string[];
  heroBadge?: MultilingualText;
  heroMessage: MultilingualText;
  heroSubtitle: MultilingualText;
  aboutSpeech: MultilingualText;
  homepageAboutSummary?: MultilingualText;
  showHistoricalAssistanceOnAbout?: boolean;
  heroPrimaryCtaText?: MultilingualText;
  heroPrimaryCtaLink?: string;
  heroSecondaryCtaText?: MultilingualText;
  heroSecondaryCtaLink?: string;
  heroContactCtaText?: MultilingualText;
  heroContactCtaLink?: string;
  showNoticeTicker?: boolean;
  showHomeActivities?: boolean;
  showHomeFundSummary?: boolean;
  showHomeMembersPreview?: boolean;
  showHomeGalleryPreview?: boolean;
  mission: MultilingualText;
  vision: MultilingualText;
  values: MultilingualText;
  futurePlans: MultilingualText;
  galleryCategories: string[];
  activityCategories: string[];
  footerText?: MultilingualText;
  footerDescription?: MultilingualText;
  footerCopyright?: MultilingualText;
  footerVisibility?: FooterVisibilitySettings;
  memberImageShape?: 'circle' | 'rounded' | 'square';
  customTranslations?: {
    [key: string]: MultilingualText;
  };
}

export interface AdminUser {
  username: string;
  email?: string;
  role: 'admin' | 'editor';
  lastLogin: string;
}
