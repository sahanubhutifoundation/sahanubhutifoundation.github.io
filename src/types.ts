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
  showJoiningDate?: boolean;
  bio?: string;
  responsibilities?: string;
  isActive: boolean;
  isFamilyMember?: boolean;
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  facebook?: string;
  showFacebook?: boolean;
  instagram?: string;
  showInstagram?: boolean;
  whatsapp?: string;
  showWhatsapp?: boolean;
  imo?: string;
  showImo?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showSocials?: boolean;
  useGlobalImageShape?: boolean;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    imo?: string;
  };
  imageShape?: 'circle' | 'rounded' | 'square';
  imageFit?: 'cover' | 'contain';
  imagePosition?: string;
  createdAt: string;
}

export interface AboutValueCard {
  id: string;
  title: MultilingualText;
  description?: MultilingualText;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface AboutFutureCard {
  id: string;
  title: MultilingualText;
  description?: MultilingualText;
  icon?: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface MemberGridConfig {
  desktopCols?: number;
  desktopRows?: number;
  desktopLimit?: number;
  mobileCols?: number;
  mobileRows?: number;
  mobileLimit?: number;
}

export interface ActivityFinancialRecord {
  hasExpense: boolean;
  expenseId?: string;
  amount?: number;
  fundingSource?: 'foundation_fund' | 'external_donation' | 'personal_contribution';
  deductionMode?: 'deduct' | 'separate' | 'display_only';
  category?: string;
  title?: string;
  date?: string;
  location?: string;
  description?: string;
  receiptUrl?: string;
  isPublic?: boolean;
}

export interface ActivityCategoryItem {
  id: string;
  name: MultilingualText;
  slug?: string;
  order?: number;
  isEnabled: boolean;
  color?: string;
  description?: MultilingualText;
}

export interface Activity {
  id: string;
  slug: string;
  title: MultilingualText;
  summary: MultilingualText;
  description: MultilingualText;
  shortSummary?: MultilingualText;
  fullDescription?: MultilingualText;
  date: string;
  category: string;
  coverImage?: string;
  images?: string[];
  galleryImages?: string[];
  isPublished: boolean;
  linkedExpenseId?: string;
  financialRecord?: ActivityFinancialRecord;
  order?: number;
  purpose?: MultilingualText;
  location?: MultilingualText;
  beneficiaries?: MultilingualText;
  outcomes?: MultilingualText;
  showShortSummaryInDetail?: boolean;
  showOnMediaPage?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  date?: string;
  activityId?: string;
  isPublished: boolean;
  createdAt: string;
}

export type FundingSourceType = 'foundation_fund' | 'external_donation' | 'personal_contribution';
export type DeductionModeType = 'deduct' | 'separate' | 'display_only';

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
  activityId?: string;
  linkedActivityId?: string;
  fundingSource?: FundingSourceType;
  deductionMode?: DeductionModeType;
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
  showExpenseRatio?: boolean;
  showSafetyRatio?: boolean;
  showYearlyOverview?: boolean;
  showHistoricalYears?: boolean;
  showActivityLinkedExpenses?: boolean;
  showSourceLinks?: boolean;
}

export interface YearlyFundSource {
  year: string;
  url: string;
  gid?: string;
  label?: string;
  enabled: boolean;
  isPublic: boolean;
  isDefault?: boolean;
  notes?: string;
}

export interface FundExpenseHeadings {
  title?: string;
  subtitle?: string;
  totalSpentLabel?: string;
  columnDate?: string;
  columnTitle?: string;
  columnCategory?: string;
  columnLocation?: string;
  columnReceipt?: string;
  columnAmount?: string;
  emptyState?: string;
  sourceLabel?: string;
  verifiedLabel?: string;
}

export interface FundMemberLinkSettings {
  showMemberName: boolean;
  makeProfileLink: boolean;
  showContributionDetail: boolean;
}

export interface ContactPageConfig {
  pageTitle?: MultilingualText;
  pageSubtitle?: MultilingualText;
  directContactTitle?: MultilingualText;
  directContactDescription?: MultilingualText;
  membershipNoteTitle?: MultilingualText;
  membershipNoteContent?: MultilingualText;
  formTitle?: MultilingualText;
  formSubtitle?: MultilingualText;
  nameLabel?: string;
  namePlaceholder?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  phoneLabel?: string;
  phonePlaceholder?: string;
  isPhoneRequired?: boolean;
  subjectLabel?: string;
  subjectPlaceholder?: string;
  isSubjectRequired?: boolean;
  messageLabel?: string;
  messagePlaceholder?: string;
  submitButtonText?: string;
  submittingText?: string;
  successTitle?: string;
  successMessage?: string;
  sendAnotherText?: string;
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
  status: 'live' | 'fallback' | 'error' | 'not_found';
  errorMessage?: string;
  expenseRatio?: number;
  safetyRatio?: number;
  year?: string;
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

export interface FeatureCard {
  id: string;
  title: MultilingualText;
  description: MultilingualText;
  icon?: string;
}

export interface FundSnapshotCard {
  id: string;
  title: MultilingualText;
  description: MultilingualText;
  icon?: string;
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
  showFeatureCards?: boolean;
  featureCards?: FeatureCard[];
  fundSnapshotCards?: FundSnapshotCard[];
  mission: MultilingualText;
  vision: MultilingualText;
  values: MultilingualText;
  futurePlans: MultilingualText;
  galleryCategories: string[];
  activityCategories: string[];
  activityCategoryList?: ActivityCategoryItem[];
  footerText?: MultilingualText;
  footerDescription?: MultilingualText;
  footerCopyright?: MultilingualText;
  footerInitiativeText?: MultilingualText;
  footerVisibility?: FooterVisibilitySettings;
  aboutHeroTitle?: MultilingualText;
  aboutHeroSubtitle?: MultilingualText;
  aboutHeroTag?: MultilingualText;
  aboutSpeechTitle?: MultilingualText;
  aboutSpeechSubtitle?: MultilingualText;
  aboutStartTitle?: MultilingualText;
  aboutPurposeTitle?: MultilingualText;
  aboutBaytulMalTitle?: MultilingualText;
  aboutValuesTitle?: MultilingualText;
  aboutFutureTitle?: MultilingualText;
  aboutShowLocationCard?: boolean;
  aboutShowDateCard?: boolean;
  aboutShowSpeechSection?: boolean;
  aboutShowBeginningSection?: boolean;
  aboutShowPurposeSection?: boolean;
  aboutShowValuesSection?: boolean;
  aboutShowVisionSection?: boolean;
  aboutShowBaytulMal?: boolean;
  aboutValuesCards?: AboutValueCard[];
  aboutFutureCards?: AboutFutureCard[];
  memberImageShape?: 'circle' | 'rounded' | 'square';
  memberSerialStyle?: 'minimal' | 'circle' | 'pill' | 'corner' | 'outline';
  memberSerialPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  homeMembersCount?: number;
  homeMemberGrid?: MemberGridConfig;
  membersPageGrid?: MemberGridConfig;
  homeViewAllMembersLabel?: MultilingualText;
  homeShowViewAllMembers?: boolean;
  // Homepage Activities Rail CMS
  homeActivitiesEyebrow?: MultilingualText;
  homeActivitiesTitle?: MultilingualText;
  homeActivitiesSubtitle?: MultilingualText;
  homeActivitiesLimit?: number;
  homeActivitiesDesktopCols?: number;
  homeActivitiesWideDesktopCols?: number;
  homeActivitiesTabletCols?: number;
  homeActivitiesMobileCols?: number;
  homeActivitiesShowDate?: boolean;
  homeActivitiesShowCategory?: boolean;
  homeActivitiesShowSummary?: boolean;
  homeActivitiesShowCta?: boolean;
  homeActivitiesCtaLabel?: MultilingualText;
  homeActivitiesOrdering?: 'latest' | 'oldest' | 'manual' | 'featured';
  homeFeaturedActivityIds?: string[];
  homeShowViewAllActivities?: boolean;
  homeViewAllActivitiesLabel?: MultilingualText;
  homeActivitiesEmptyText?: MultilingualText;
  footerContactHeading?: MultilingualText;
  footerShowInitiative?: boolean;
  yearlyFundSources?: YearlyFundSource[];
  fundReconciliationMode?: 'detailed_ledger' | 'summary_authority' | 'reconciled';
  fundExpenseHeadings?: FundExpenseHeadings;
  fundMemberLinkSettings?: FundMemberLinkSettings;
  contactPageConfig?: ContactPageConfig;
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
