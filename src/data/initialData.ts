import { FoundationConfig, Activity, Notice, Member, Designation, GalleryItem, SocialLink, ExpenseRecord } from '../types';

export const initialDesignations: Designation[] = [
  {
    id: 'des-president',
    name: { bn: 'সভাপতি', en: 'President', ar: 'الرئيس' },
    textColor: '#1E3E2B',
    bgColor: '#E8EFEA',
    borderColor: '#B8D5C2',
    accentColor: '#2D5A41',
    badgeStyle: 'accent',
    fontWeight: 'bold',
    sortOrder: 1,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-chief-coordinator',
    name: { bn: 'প্রধান সমন্বয়ক', en: 'Chief Coordinator', ar: 'المنسق العام' },
    textColor: '#1E3E2B',
    bgColor: '#EBF3EE',
    borderColor: '#BCDBC7',
    accentColor: '#2D5A41',
    badgeStyle: 'accent',
    fontWeight: 'bold',
    sortOrder: 2,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-vice-president',
    name: { bn: 'সহ-সভাপতি', en: 'Vice President', ar: 'نائب الرئيس' },
    textColor: '#2D3630',
    bgColor: '#F4F2EB',
    borderColor: '#DED9CE',
    accentColor: '#5C665F',
    badgeStyle: 'soft',
    fontWeight: 'semibold',
    sortOrder: 3,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-general-secretary',
    name: { bn: 'সাধারণ সম্পাদক', en: 'General Secretary', ar: 'الأمين العام' },
    textColor: '#1E3E2B',
    bgColor: '#E8EFEA',
    borderColor: '#B8D5C2',
    accentColor: '#2D5A41',
    badgeStyle: 'accent',
    fontWeight: 'bold',
    sortOrder: 4,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-joint-secretary',
    name: { bn: 'যুগ্ম সাধারণ সম্পাদক', en: 'Joint Secretary', ar: 'الأمين العام المساعد' },
    textColor: '#2D3630',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#5C665F',
    badgeStyle: 'soft',
    fontWeight: 'semibold',
    sortOrder: 5,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-treasurer',
    name: { bn: 'কোষাধ্যক্ষ', en: 'Treasurer', ar: 'أمين الصندوق' },
    textColor: '#1E3E2B',
    bgColor: '#EAF1ED',
    borderColor: '#BEDECE',
    accentColor: '#2D5A41',
    badgeStyle: 'accent',
    fontWeight: 'bold',
    sortOrder: 6,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-finance-sec',
    name: { bn: 'অর্থ সম্পাদক', en: 'Finance Secretary', ar: 'مسؤول المالية' },
    textColor: '#2D3630',
    bgColor: '#F4F2EB',
    borderColor: '#DED9CE',
    accentColor: '#2D5A41',
    badgeStyle: 'soft',
    fontWeight: 'semibold',
    sortOrder: 7,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-asst-finance-sec',
    name: { bn: 'সহ-অর্থ সম্পাদক', en: 'Assistant Finance Secretary', ar: 'مساعد مسؤول المالية' },
    textColor: '#2D3630',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#7A877E',
    badgeStyle: 'soft',
    fontWeight: 'medium',
    sortOrder: 8,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-org-sec',
    name: { bn: 'সাংগঠনিক সম্পাদক', en: 'Organizational Secretary', ar: 'أمين التنظيم' },
    textColor: '#2D3630',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#2D5A41',
    badgeStyle: 'soft',
    fontWeight: 'semibold',
    sortOrder: 9,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-relief-welfare',
    name: { bn: 'ত্রাণ ও সমাজকল্যাণ সম্পাদক', en: 'Relief & Social Welfare Secretary', ar: 'أمين الإغاثة والرعاية الاجتماعية' },
    textColor: '#2D3630',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#2D5A41',
    badgeStyle: 'soft',
    fontWeight: 'semibold',
    sortOrder: 10,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-office-sec',
    name: { bn: 'দপ্তর সম্পাদক', en: 'Office Secretary', ar: 'أمين المكتب والمتابعة' },
    textColor: '#2D3630',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#7A877E',
    badgeStyle: 'soft',
    fontWeight: 'medium',
    sortOrder: 11,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-publicity-sec',
    name: { bn: 'প্রচার ও প্রকাশনা সম্পাদক', en: 'Publicity & Publications Secretary', ar: 'أمين الإعلام والنشر' },
    textColor: '#2D3630',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#7A877E',
    badgeStyle: 'soft',
    fontWeight: 'medium',
    sortOrder: 12,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-it-sec',
    name: { bn: 'তথ্য ও প্রযুক্তি সম্পাদক', en: 'IT Secretary', ar: 'أمين تكنولوجيا المعلومات' },
    textColor: '#2D3630',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#2D5A41',
    badgeStyle: 'soft',
    fontWeight: 'medium',
    sortOrder: 13,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-media-sec',
    name: { bn: 'মিডিয়া সম্পাদক', en: 'Media Secretary', ar: 'أمين الإعلام والاتصال' },
    textColor: '#2D3630',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#7A877E',
    badgeStyle: 'soft',
    fontWeight: 'medium',
    sortOrder: 14,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-exec-member',
    name: { bn: 'কার্যকরী সদস্য', en: 'Executive Member', ar: 'عضو تنفيذي' },
    textColor: '#3A443D',
    bgColor: '#F9F8F5',
    borderColor: '#EBE8E0',
    accentColor: '#7A877E',
    badgeStyle: 'classic',
    fontWeight: 'medium',
    sortOrder: 15,
    isEnabled: true,
    isPredefined: true,
  },
  {
    id: 'des-volunteer',
    name: { bn: 'স্বেচ্ছাসেবক', en: 'Volunteer', ar: 'متطوع' },
    textColor: '#5C665F',
    bgColor: '#F7F5F0',
    borderColor: '#EBE8E0',
    accentColor: '#8A968E',
    badgeStyle: 'outline',
    fontWeight: 'normal',
    sortOrder: 16,
    isEnabled: true,
    isPredefined: true,
  },
];

export const initialConfig: FoundationConfig = {
  nameEn: 'Sahanubhuti Foundation',
  nameBn: 'সহানুভূতি ফাউন্ডেশন',
  nameAr: 'مؤسسة ساهانوبوتي',
  logoUrl: '/assets/logo.svg',
  logoOverrides: {
    header: '',
    hero: '',
    footer: '',
    admin: '',
  },
  headerTagline: {
    bn: 'মৌলভী বাড়ি, শর্শদী, ফেনী সদর | প্রতিষ্ঠা: ২৮/১১/২০২৪',
    en: 'Moulovi Bari, Sharshadi, Feni | Founded: 28/11/2024',
    ar: 'مولفي باري، شارشادي، فيني | تأسست: 28/11/2024',
  },
  headerCtaText: {
    bn: 'যোগাযোগ করুন',
    en: 'Contact Us',
    ar: 'تواصل معنا',
  },
  headerCtaLink: '/contact',
  showHeaderCta: true,
  showHeaderPhone: true,
  showLanguageSelector: true,
  originLocation: 'মৌলভী বাড়ি, মোহাম্মদ আলী বাজারের নিকটে, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ',
  foundationLocation: {
    bn: 'মৌলভী বাড়ি, মোহাম্মদ আলী বাজারের নিকটে, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ',
    en: 'Moulovi Bari, near Mohammad Ali Bazar, Sharshadi, Feni Sadar, Feni, Bangladesh',
    ar: 'مولفي باري، بالقرب من سوق محمد علي، شارشادي، فيني سادار، فيني، بنغلاديش',
  },
  locationDisplayMode: 'text',
  locationMapUrl: '',
  foundedDate: '2024-11-28',
  showFoundingDate: true,
  familyInitiativeText: {
    bn: 'সহানুভূতি ফাউন্ডেশনের বীজ রোপিত হয়েছিল মৌলভী বাড়ি, মোহাম্মদ আলী বাজারের কাছে, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশে। ২০২৪ সালের ২৮ নভেম্বর আনুষ্ঠানিক পথচলা শুরু হলেও পারিবারিক তরুণদের এই সংকল্প গত প্রায় এক-দেড় বছর ধরে নিভৃতে ও নিরবচ্ছিন্নভাবে অগ্রসর হচ্ছে। প্রাথমিক পর্যায়ে পরিবারের অসহায় ও অসুস্থ সদস্যদের পাশে দাঁড়ানোই এর মূল প্রতিপাদ্য।',
    en: 'The seed of Sahanubhuti Foundation was planted at Moulovi Bari, near Mohammad Ali Bazar, Sharshadi, Feni Sadar, Feni, Bangladesh. While officially founded on 28 November 2024, this initiative has been progressing quietly and steadily for nearly a year and a half, primarily supporting ailing and vulnerable family members.',
    ar: 'غُرست بذرة مؤسسة ساهانوبوتي في مولفي باري، بالقرب من سوق محمد علي، شارشادي، فيني، بنغلاديش. انطلقت رسمياً في 28 نوفمبر 2024، مع التركيز أولاً على دعم المحتاجين من أفراد العائلة.',
  },
  expansionStatement: {
    bn: 'আজ পারিবারিক পর্যায় থেকে শুরু করে ইনশাআল্লাহ ভবিষ্যতে উপযুক্ত ও সৎ মানুষদের সাথে নিয়ে একটি সুশৃঙ্খল, স্বচ্ছ ও আদর্শ মানবিক ফাউন্ডেশনে রূপান্তরিত হওয়া এবং পরিবারের বাইরে বৃহত্তর সমাজেও মানবকল্যাণমূলক অবদান রাখা।',
    en: 'Starting today at the family level, and gradually expanding InshaAllah with upright and dedicated individuals into a disciplined, transparent humanitarian foundation serving the wider community.',
    ar: 'الانطلاق اليوم من الإطار العائلي والتوسع مستقبلاً بإذن الله بالتعاون مع المخلصين لخدمة المجتمع الأوسع بشفافية وانضباط.',
  },
  implementedInitiative: {
    bn: 'ফাউন্ডেশনের মানবিক উদ্যোগে একজন অসহায় রোগীর এক মাসের প্রয়োজনীয় জরুরি ওষুধ সহায়তা সফলভাবে সরবরাহ করা হয়েছে।',
    en: 'Under the foundation’s humanitarian initiative, essential one-month prescription medicines were successfully provided to an ailing patient.',
    ar: 'من خلال مبادرة المؤسسة الإنسانية، تم توفير الأدوية الشهرية الأساسية لمريض محتاج بنجاح.',
  },
  showHistoricalAssistanceOnAbout: false,
  homepageAboutSummary: {
    bn: 'সহানুভূতি ফাউন্ডেশন ফেনী সদর উপজেলার শর্শদী ইউনিয়নের ঐতিহ্যবাহী মৌলভী বাড়ির তরুণ সমাজের উদ্যোগে প্রতিষ্ঠিত। আমাদের মূল লক্ষ্য—একতাবদ্ধ থাকা, দুঃসময়ে পারস্পরিক পাশে দাঁড়ানো এবং সবার আন্তরিক সহযোগিতায় নিয়মিত কল্যাণমূলক কাজ চালিয়ে যাওয়া।',
    en: 'Sahanubhuti Foundation was initiated by the young members of our family residing in Moulovi Bari, Sharshadi, Feni. Our primary commitment is maintaining unity, standing beside each other in times of distress, and sustaining benevolent assistance within our humble means.',
    ar: 'تأسست مؤسسة ساهانوبوتي بمبادرة من شباب عائلة مولفي باري في شارشادي، فيني. هدفنا الأساسي هو الحفاظ على الوحدة والوقوف مع المحتاجين وإدامة العمل الخيري.',
  },
  heroPrimaryCtaText: {
    bn: 'আমাদের সম্পর্কে জানুন',
    en: 'About Our Mission',
    ar: 'تعرف علينا',
  },
  heroPrimaryCtaLink: '/about',
  heroSecondaryCtaText: {
    bn: 'কার্যক্রম দেখুন',
    en: 'Our Activities',
    ar: 'أنشطتنا',
  },
  heroSecondaryCtaLink: '/activities',
  heroContactCtaText: {
    bn: 'যোগাযোগ করুন',
    en: 'Contact Us',
    ar: 'تواصل معنا',
  },
  heroContactCtaLink: '/contact',
  showNoticeTicker: true,
  showHomeActivities: true,
  showHomeFundSummary: true,
  showHomeMembersPreview: true,
  showHomeGalleryPreview: true,
  baytulMalText: {
    bn: 'আমাদের এই সংগঠনের সবচেয়ে গুরুত্বপূর্ণ বুনিয়াদ হলো ‘বাইতুল মাল’। প্রতি মাসে সদস্যরা যে সামান্য কিছু অর্থ এখানে জমা দেন, তা কোনো ছোট বিষয় নয়। দিনশেষে এই সঞ্চিত অংশটুকুই বিপদগ্রস্ত কোনো মানুষের পাশে দাঁড়াতে কিংবা বড় কোনো সংকট উত্তরণে সর্বাধিক ভূমিকা রাখে।',
    en: 'The most pivotal pillar of our organization is the "Baytul Mal". The modest monthly contributions members deposit here carry immense collective power, standing ready as a dedicated safety net for those confronting distress or emergency.',
    ar: 'إن الركن الأساسي في هذا التنظيم هو "بيت المال". إن المبلغ الرمزي الذي يودعه الأعضاء شهرياً ذو أثر بالغ، فهذه المدخرات هي التي ستغيث المحتاج في أوقات الشدة.',
  },
  email: 'sahanubhutifoundation2024@gmail.com',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61570501300625',
  phone: '',
  showPhone: false,
  phonePlaceholder: '',
  youtubeUrl: '',
  whatsappNumber: '',
  imoNumber: '',
  footerDescription: {
    bn: 'একতা, সহানুভূতি ও মানবিকতার মাধ্যমে আমরা আমাদের নিজেদের মানুষদের পাশে দাঁড়াতে চাই—আজ পরিবারের ভেতর থেকে শুরু, ইনশাআল্লাহ আগামী দিনে আরও বিস্তৃত পরিসরে।',
    en: 'Through unity, empathy, and humanity, we stand beside our people—starting within our family today, and expanding broader tomorrow InshaAllah.',
    ar: 'من خلال الوحدة والتعاطف والإنسانية، نسعى للوقوف إلى جانب أهلنا—نبدأ اليوم من داخل العائلة، ونتطلع إلى أفق أوسع غداً إن شاء الله.',
  },
  footerCopyright: {
    bn: 'সর্বস্বত্ব সংরক্ষিত © ২০২৪-২০২৬ সহানুভূতি ফাউন্ডেশন। মৌলভী বাড়ি, শর্শদী, ফেনী সদর।',
    en: 'All rights reserved © 2024-2026 Sahanubhuti Foundation. Moulovi Bari, Sharshadi, Feni.',
    ar: 'جميع الحقوق محفوظة © 2024-2026 مؤسسة ساهانوبوتي. مولفي باري، فيني.',
  },
  footerVisibility: {
    showDescription: true,
    showNavigation: true,
    showOrigin: true,
    showContact: true,
    showSocial: true,
    showCopyright: true,
  },
  memberImageShape: 'circle',
  customTranslations: {},
  fundSourceUrl: 'https://docs.google.com/spreadsheets/d/1bh2WGcphb2ZTVzyaE9Yo3UHCOe_NkQtzoolS9UPuETg/edit?usp=sharing',
  openingExpenseBalance: 4950,
  fundVisibility: {
    showTotalReceived: true,
    showTotalCost: true,
    showAvailableBalance: true,
    showExpenseDetails: true,
    showMonthlyFundDetails: true,
    showMemberContributionDetails: true,
  },
  expenseCategories: [
    'চিকিৎসা সহায়তা',
    'জরুরি সহায়তা',
    'খাদ্য সহায়তা',
    'শিক্ষা সহায়তা',
    'পারিবারিক সহায়তা',
    'অন্যান্য',
  ],

  heroBadge: {
    bn: 'পারিবারিক একতা ও মানবিক দায়বদ্ধতা',
    en: 'Family Unity and Humanitarian Responsibility',
    ar: 'الوحدة العائلية والمسؤولية الإنسانية',
  },

  heroMessage: {
    bn: 'একতা, সহানুভূতি ও মানবিকতার মাধ্যমে আমরা আমাদের নিজেদের মানুষদের পাশে দাঁড়াতে চাই—আজ পরিবারের ভেতর থেকে শুরু, ইনশাআল্লাহ আগামী দিনে আরও বিস্তৃত পরিসরে।',
    en: 'Through unity, empathy, and humanity, we stand beside our people—starting within our family today, and expanding broader tomorrow InshaAllah.',
    ar: 'من خلال الوحدة والتعاطف والإنسانية، نسعى للوقوف إلى جانب أهلنا—نبدأ اليوم من داخل العائلة، ونتطلع إلى أفق أوسع غداً إن شاء الله.',
  },
  heroSubtitle: {
    bn: 'ফেনীর শর্শদী ইউনিয়নের মৌলভী বাড়ির তরুণদের উদ্যোগে প্রতিষ্ঠিত একটি আন্তরিক পারিবারিক মানবিক প্ল্যাটফর্ম।',
    en: 'A sincere humanitarian family platform founded by the youth of Moulovi Bari, Sharshadi, Feni.',
    ar: 'منصة إنسانية عائلية مخلصة أسسها شباب مولفي باري، شارشادي، فيني، بنغلاديش.',
  },

  aboutSpeech: {
    bn: `আসসালামু আলাইকুম আশা করি আপনারা সবাই ভালো আছেন।

আমাদের এই ‘সহানুভূতি ফাউন্ডেশন’ গড়ার মূল উদ্দেশ্যই ছিল আমরা যেন সবাই মিলে একতাবদ্ধ থাকতে পারি এবং ভালো কিছু কাজ করতে পারি। আপনারা যারা এই উদ্যোগে সাড়া দিয়ে সদস্য হয়েছেন, আপনাদের সবাইকে আন্তরিক ধন্যবাদ। আপনাদের এই উপস্থিতি আমাদের পথচলাকে অনেক সহজ করে দিয়েছে।

আপনারা অনেকেই জানেন, আবার হয়তো অনেকে এখনো জানেন না যে, আমাদের এই সংগঠনটি গত প্রায় এক-দেড় বছর ধরে নিরবচ্ছিন্নভাবে চলছে।

আমাদের এই সংগঠনের একটি গুরুত্বপূর্ণ অংশ হলো ‘বাইতুল মাল’। আমরা প্রতি মাসে যে সামান্য কিছু টাকা এখানে জমা দিচ্ছি, তা কিন্তু ছোট কোনো বিষয় নয়। দিনশেষে এই জমানো অংশটুকুই আমাদের বড় কোনো কাজে বা কারও বিপদে সবচেয়ে বেশি কাজে আসবে।

আমাদের এই পারিবারিক সংগঠনে অনেকেই সদস্য হয়েছেন, আবার অনেকে হয়তো এখনো হয়ে ওঠেননি। আমরা সবাইকে বিনীতভাবে অনুরোধ করব—আপনারা যারা এখনো সদস্য হতে পারেন নি, তারা এখন সদস্য হওয়ার জন্য যোগাযোগ করতে পারেন।

আমরা চাই না পরিবারের কোনো সদস্য এই সুন্দর উদ্যোগের বাইরে থাকুক। সবার অংশগ্রহণে আমাদের এই বন্ধন আরও মজবুত হবে।

আমরা আশা করি, আমাদের পথচলা হোক অর্থবহ, সুন্দর ও সৌহার্দ্যে ভরপুর। আমরা সবার সর্বাত্মক সহযোগিতা কামনা করি এবং বিশ্বাস করি—পারস্পরিক সম্মান, বোঝাপড়া ও একতার মাধ্যমে আমরা একসাথে সমাজকে ভালো কিছু উপহার দিতে পারব।

সবাই ভালো থাকবেন, সুস্থ থাকবেন।

ধন্যবাদান্তে
উপস্থাপক
সহানুভূতি ফাউন্ডেশন`,
    en: `Assalamu Alaikum, hope you are all well.

The primary purpose of establishing 'Sahanubhuti Foundation' was so that we could all remain united and accomplish benevolent work together. Heartfelt thanks to all of you who responded and became members. Your participation has made our journey significantly smoother.

Many of you know, and perhaps some do not yet know, that our organization has been continuing steadily for nearly a year and a half.

A crucial pillar of our organization is 'Baytul Mal'. The modest amount we contribute each month is by no means insignificant. In the end, these gathered savings will prove most valuable in emergencies or supporting someone in need.

We warmly invite family members who have not yet joined to connect with us. We hope our path ahead remains meaningful, harmonious, and full of mutual goodwill.

With gratitude,
Presenter
Sahanubhuti Foundation`,
    ar: `السلام عليكم ورحمة الله وبركاته، نرجو أن تكونوا جميعاً بخير.

كان الهدف الأساسي من تأسيس "مؤسسة ساهانوبوتي" هو أن نتكاتف جميعاً ونبقى متحدين لنقدم أعمال الخير معاً. شكرنا الخالص لكل من استجاب وانضم إلينا كعضو في هذه المبادرة.

يعلم الكثير منكم، وربما البعض لا يعلم بعد، أن هذا التنظيم يسير بثبات وتفانٍ منذ قرابة عام ونصف.

إن الركن الأساسي في هذا التنظيم هو "بيت المال". إن المبلغ الرمزي الذي نودعه شهرياً ذو أثر بالغ، فهذه المدخرات هي التي ستغيث المحتاج وتحدث الفارق الحقيقي في أوقات الشدة.

نتوجه بالدعوة الكريمة لكل من لم ينضم بعد من أفراد العائلة للتواصل والمشاركة. نسأل الله أن يجعل مسيرتنا هادفة ومباركة تسودها المحبة والوئام.

مع خالص التحية والتقدير،
مقدم المبادرة
مؤسسة ساهانوبوتي`,
  },

  mission: {
    bn: 'পারিবারিক বন্ধনকে দৃঢ় রেখে পারস্পরিক সহমর্মিতা, সুখে-দুঃখে পাশে থাকা এবং প্রাথমিক সেবামূলক সহায়তার মাধ্যমে একটি দায়িত্বশীল সমাজ গঠনের সূচনা করা।',
    en: 'Strengthening family bonds while fostering empathy, standing together through hardships, and delivering frontline humanitarian assistance.',
    ar: 'تعزيز الروابط العائلية وبث روح التكافل الإنساني وتقديم العون المباشر للمحتاجين في أوقات الشدة.',
  },

  vision: {
    bn: 'আজ পারিবারিক পর্যায় থেকে শুরু করে ইনশাআল্লাহ ভবিষ্যতে উপযুক্ত ও সৎ মানুষদের সাথে নিয়ে একটি সুশৃঙ্খল, স্বচ্ছ ও আদর্শ মানবিক ফাউন্ডেশনে রূপান্তরিত হওয়া।',
    en: 'Starting from our extended family today and gradually transforming InshaAllah into a disciplined, transparent, and exemplary humanitarian foundation.',
    ar: 'الانطلاق اليوم من الإطار العائلي والتطور تدريجياً بإذن الله إلى مؤسسة إنسانية نموذجية تتسم بالشفافية والريادة المجتمعية.',
  },

  values: {
    bn: '১. সততা ও শতভাগ আর্থিক স্বচ্ছতা\n২. পারস্পরিক সম্মান ও ভ্রাতৃত্ববোধ\n৩. কোনো প্রদর্শনপ্রিয়তা নয়, আন্তরিক মানবকল্যাণ\n৪. শৃঙ্খলা ও ঐক্যবদ্ধ সিদ্ধান্ত',
    en: '1. Honesty & 100% Financial Transparency\n2. Mutual Respect & Kinship\n3. Sincerity over Ostentation\n4. Discipline & Collective Decisions',
    ar: '١. الصدق والشفافية المالية التامة\n٢. الاحترام المتبادل وصلة الرحم\n٣. الإخلاص لوجه الله بعيداً عن المظاهر\n٤. الانضباط واتخاذ القرار الجماعي',
  },

  futurePlans: {
    bn: '১. স্থায়ী বাইতুল মাল তহবিলের বিস্তার\n২. অসুস্থ ও অসহায় স্বজনদের জরুরি চিকিৎসা ফান্ড\n৩. পারিবারিক মেধাবী সন্তানদের শিক্ষাবৃত্তি ও সহায়তা\n৪. ভবিষ্যতে বৃহত্তর সমাজে সেবামূলক উদ্যোগের দ্বার উন্মোচন',
    en: '1. Expanding the permanent Baytul Mal reserve\n2. Emergency healthcare support for ailing individuals\n3. Educational support for promising young minds\n4. Gradually expanding welfare initiatives to the wider community InshaAllah',
    ar: '١. توسيع رصيد بيت المال الدائم\n٢. دعم الرعاية الطبية الطارئة للمرضى المحتاجين\n٣. رعاية ودعم الطلبة المتفوقين علمياً\n٤. فتح آفاق الخير لخدمة المجتمع الأوسع مستقبلاً إن شاء الله',
  },

  galleryCategories: ['মানবিক সহায়তা', 'পারিবারিক উদ্যোগ', 'সভা', 'ইফতার ও দোয়া', 'ওষুধ সহায়তা', 'অন্যান্য'],
  activityCategories: ['ওষুধ ও চিকিৎসা', 'বাইতুল মাল', 'জরুরি মানবিক সহায়তা', 'পারিবারিক সমাবেশ'],
};

// Initial verified activity
export const initialActivities: Activity[] = [
  {
    id: 'act-1',
    slug: 'essential-medicine-assistance',
    title: {
      bn: 'জরুরি ওষুধ সহায়তা প্রদান',
      en: 'Emergency Medicine Assistance',
      ar: 'تقديم المساعدات الدوائية العاجلة',
    },
    summary: {
      bn: 'ফাউন্ডেশনের বাইতুল মাল ফান্ড থেকে ব্যয় করে একজন অসহায় ব্যক্তির এক মাসের প্রয়োজনীয় ওষুধ কিনে দেওয়া হয়েছে।',
      en: 'Purchased one month of necessary prescription medicines for a person in need from the Baytul Mal fund.',
      ar: 'شراء أدوية شهرية ضرورية لشخص محتاج من رصيد بيت المال التابع للمؤسسة.',
    },
    description: {
      bn: 'আলহামদুলিল্লাহ, সহানুভূতি ফাউন্ডেশনের প্রাথমিক মানবিক উদ্যোগ হিসেবে একজন অসুস্থ ও প্রয়োজনীয় ব্যক্তির এক মাসের জন্য অত্যাবশ্যকীয় ব্যবস্থাপত্র অনুযায়ী জরুরি ওষুধ সহায়তা সফলভাবে সরবরাহ করা হয়েছে। ছোট ছোট এমন আন্তরিক উদ্যোগই আমাদের অনুপ্রেরণা।',
      en: 'Alhamdulillah, as an early humanitarian initiative of Sahanubhuti Foundation, essential prescription medicines were supplied for a full month to an ailing individual in need. Such modest, sincere acts are our inspiration.',
      ar: 'الحمد لله، كمبادرة إنسانية أولى لمؤسسة ساهانوبوتي، تم توفير الأدوية الأساسية لشخص مريض لمدة شهر كامل. هذه الخطوات الصادقة هي مصدر إلهامنا المستمر.',
    },
    date: '2024-12-15',
    category: 'ওষুধ ও চিকিৎসা',
    coverImage: '',
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
];

// Initial verified notice
export const initialNotices: Notice[] = [
  {
    id: 'not-1',
    title: {
      bn: 'সহানুভূতি ফাউন্ডেশনের সদস্য হওয়ার বিনীত আহ্বান',
      en: 'Invitation to Join Sahanubhuti Foundation',
      ar: 'دعوة للانضمام إلى عضوية مؤسسة ساهانوبوتي',
    },
    body: {
      bn: 'আমাদের এই সংগঠনের মূল উদ্দেশ্য আমরা যেন সবাই মিলে একতাবদ্ধ থাকতে পারি এবং ভালো কিছু কাজ করতে পারি। পরিবারের যেসকল সদস্য এখনো যুক্ত হতে পারেননি, আপনাদের বিনীত অনুরোধ করা হচ্ছে সদস্য হওয়ার জন্য যোগাযোগ করার জন্য।',
      en: 'The core purpose of our organization is to stand united and accomplish benevolent work. Family members who have not yet registered are warmly invited to get in touch and join this noble effort.',
      ar: 'الهدف الأساسي من مؤسستنا هو التكاتف وصنع الخير معاً. نوجه دعوة قلبية لجميع أفراد الأسرة الذين لم ينضموا بعد للتواصل معنا والمشاركة في هذا العمل المبارك.',
    },
    date: '2024-11-28',
    isImportant: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
  },
];

// Initial members list
// Note: We do NOT invent fake names or photos.
// We provide placeholder for admin to easily add members via "+ Add Member" button!
export const initialMembers: Member[] = [];

// Initial gallery items
export const initialGalleryItems: GalleryItem[] = [];

// Social links configuration
export const initialSocialLinks: SocialLink[] = [
  {
    id: 'soc-fb',
    platform: 'facebook',
    label: 'Facebook Page',
    url: 'https://www.facebook.com/profile.php?id=61570501300625',
    icon: 'Facebook',
    isEnabled: true,
    sortOrder: 1,
  },
  {
    id: 'soc-email',
    platform: 'email',
    label: 'Email',
    url: 'mailto:sahanubhutifoundation2024@gmail.com',
    icon: 'Mail',
    isEnabled: true,
    sortOrder: 2,
  },
  {
    id: 'soc-phone',
    platform: 'phone',
    label: 'Phone (Hotline)',
    url: '#',
    icon: 'Phone',
    isEnabled: true,
    sortOrder: 3,
  },
];

// Historical and verified humanitarian assistance expenses
// Matches the verified 4,950 Taka humanitarian assistance cost recorded in the foundation accounts
export const initialExpenses: ExpenseRecord[] = [
  {
    id: 'exp-hist-1',
    date: '2024-12-15',
    amount: 1200,
    title: 'অসহায় ব্যক্তির ১ মাসের জীবনরক্ষাকারী ওষুধ সহায়তা',
    category: 'চিকিৎসা সহায়তা',
    description: 'ফাউন্ডেশনের বাইতুল মাল ফান্ড থেকে একজন অসহায় রোগাক্রান্ত ব্যক্তির ১ মাসের প্রয়োজনীয় ওষুধ কিনে দেওয়া হয়েছে।',
    recipient: 'স্বজন (পরিচয় সংরক্ষিত)',
    isRecipientPublic: false,
    location: 'শর্শদী, ফেনী',
    isPublic: true,
    createdAt: '2024-12-15T10:00:00.000Z',
  },
  {
    id: 'exp-hist-2',
    date: '2025-05-18',
    amount: 2250,
    title: 'জরুরি ডায়াগনস্টিক পরীক্ষা ও প্রেসক্রিপশন ওষুধ অনুদান',
    category: 'চিকিৎসা সহায়তা',
    description: 'অসুস্থ স্বজনের জরুরি প্যাথলজিক্যাল পরীক্ষা এবং চিকিৎসকের প্রেসক্রিপশন অনুযায়ী প্রয়োজনীয় অ্যান্টিবায়োটিক ও ওষুধ বাবদ সহায়তা।',
    recipient: 'পরিবারের স্বজন',
    isRecipientPublic: false,
    location: 'ফেনী সদর',
    isPublic: true,
    createdAt: '2025-05-18T14:30:00.000Z',
  },
  {
    id: 'exp-hist-3',
    date: '2025-10-05',
    amount: 1500,
    title: 'জরুরি পারিবারিক মানবিক সহায়তা ও খাদ্য সামগ্রী',
    category: 'জরুরি সহায়তা',
    description: 'সংকটকালীন মুহূর্তে পরিবারের সদস্যকে জরুরি খাদ্যসামগ্রী ও জরুরি পুনর্বাসনে এককালীন মানবিক অনুদান।',
    recipient: 'পরিবারের সদস্য',
    isRecipientPublic: false,
    location: 'মৌলভী বাড়ি, শর্শদী',
    isPublic: true,
    createdAt: '2025-10-05T09:15:00.000Z',
  },
];

