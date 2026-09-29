import { Language } from '../types';

export interface TranslationDictionary {
  [key: string]: {
    bn: string;
    en: string;
    ar: string;
  };
}

export const translations: TranslationDictionary = {
  // Navigation
  navHome: {
    bn: 'হোম',
    en: 'Home',
    ar: 'الرئيسية',
  },
  navAbout: {
    bn: 'আমাদের সম্পর্কে',
    en: 'About Us',
    ar: 'من نحن',
  },
  navActivities: {
    bn: 'কার্যক্রম',
    en: 'Activities',
    ar: 'الأنشطة',
  },
  navMembers: {
    bn: 'সদস্যবৃন্দ',
    en: 'Members',
    ar: 'الأعضاء',
  },
  navFund: {
    bn: 'ফান্ড',
    en: 'Fund',
    ar: 'الصندوق',
  },
  navGallery: {
    bn: 'গ্যালারি',
    en: 'Gallery',
    ar: 'المعرض',
  },
  navNotice: {
    bn: 'নোটিশ',
    en: 'Notice',
    ar: 'الإعلانات',
  },
  navContact: {
    bn: 'যোগাযোগ',
    en: 'Contact',
    ar: 'اتصل بنا',
  },
  navAdmin: {
    bn: 'অ্যাডমিন প্যানেল',
    en: 'Admin Panel',
    ar: 'لوحة التحكم',
  },

  // Foundation Identity
  foundationName: {
    bn: 'সহানুভূতি ফাউন্ডেশন',
    en: 'Sahanubhuti Foundation',
    ar: 'مؤسسة ساهانوبوتي',
  },
  foundationSubname: {
    bn: 'একটি মানবিক পারিবারিক উদ্যোগ',
    en: 'A Humanitarian Family Initiative',
    ar: 'مبادرة إنسانية عائلية',
  },
  originLocation: {
    bn: 'মৌলভী বাড়ি, মোহাম্মদ আলী বাজারের কাছে, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ',
    en: 'Moulovi Bari, near Mohammad Ali Bazar, Sharshadi, Feni Sadar, Feni, Bangladesh',
    ar: 'مولفي باري، بالقرب من سوق محمد علي، شارشادي، فيني، بنغلاديش',
  },
  foundedOn: {
    bn: 'প্রতিষ্ঠা: ২৮/১১/২০২৪',
    en: 'Founded: 28/11/2024',
    ar: 'تأسست: 28/11/2024',
  },

  // Hero Section
  heroBadge: {
    bn: 'পারিবারিক একতা ও মানবিক দায়বদ্ধতা',
    en: 'Family Unity & Humanitarian Commitment',
    ar: 'الوحدة العائلية والالتزام الإنساني',
  },
  heroMessage: {
    bn: 'একতা, সহানুভূতি ও মানবিকতার মাধ্যমে আমরা আমাদের নিজেদের মানুষদের পাশে দাঁড়াতে চাই—আজ পরিবারের ভেতর থেকে শুরু, ইনশাআল্লাহ আগামী দিনে আরও বিস্তৃত পরিসরে।',
    en: 'Through unity, empathy, and humanity, we stand beside our people—starting within our family today, and expanding broader tomorrow InshaAllah.',
    ar: 'من خلال الوحدة والتعاطف والإنسانية، نسعى للوقوف إلى جانب أهلنا—نبدأ اليوم من داخل العائلة، ونتطلع إلى أفق أوسع غداً إن شاء الله.',
  },
  heroCtaAbout: {
    bn: 'আমাদের সম্পর্কে জানুন',
    en: 'Learn About Us',
    ar: 'تعرف علينا',
  },
  heroCtaActivities: {
    bn: 'কার্যক্রম দেখুন',
    en: 'View Activities',
    ar: 'عرض الأنشطة',
  },
  heroCtaContact: {
    bn: 'যোগাযোগ করুন',
    en: 'Contact Us',
    ar: 'تواصل معنا',
  },
  readMoreAbout: {
    bn: 'আরও জানুন',
    en: 'Read More',
    ar: 'اقرأ المزيد',
  },

  // Homepage Highlights
  sectionIntroductionTitle: {
    bn: 'আমাদের সংক্ষিপ্ত পরিচয়',
    en: 'A Brief Introduction',
    ar: 'مقدمة موجزة',
  },
  sectionPurposeTitle: {
    bn: 'আমাদের মূল উদ্দেশ্য',
    en: 'Our Primary Purpose',
    ar: 'هدفنا الأساسي',
  },
  sectionWhatWeDoTitle: {
    bn: 'আমরা কী করি',
    en: 'What We Do',
    ar: 'ماذا نعمل',
  },
  sectionActivitiesTitle: {
    bn: 'নির্বাচিত কার্যক্রম',
    en: 'Selected Activities',
    ar: 'أنشطة مختارة',
  },
  sectionFundSnapshotTitle: {
    bn: 'তহবিল একনজরে',
    en: 'Fund Snapshot',
    ar: 'نظرة سريعة على الصندوق',
  },
  sectionMembersTitle: {
    bn: 'আমাদের সদস্যবৃন্দ',
    en: 'Our Members',
    ar: 'أعضاؤنا الكرام',
  },
  sectionNoticeTitle: {
    bn: 'সর্বশেষ নোটিশ',
    en: 'Latest Notices',
    ar: 'آخر الإعلانات',
  },
  sectionGalleryTitle: {
    bn: 'নির্বাচিত স্থিরচিত্র',
    en: 'Selected Gallery',
    ar: 'معرض مختار',
  },
  sectionJoinTitle: {
    bn: 'উদ্যোগে যুক্ত হোন',
    en: 'Join the Initiative',
    ar: 'انضم إلى المبادرة',
  },

  viewAll: {
    bn: 'সবগুলো দেখুন',
    en: 'View All',
    ar: 'عرض الكل',
  },
  viewDetails: {
    bn: 'বিস্তারিত দেখুন',
    en: 'View Details',
    ar: 'عرض التفاصيل',
  },

  // About Page Headings
  aboutStartTitle: {
    bn: 'আমাদের শুরু',
    en: 'Our Beginning',
    ar: 'بدايتنا',
  },
  aboutPurposeTitle: {
    bn: 'আমাদের উদ্দেশ্য',
    en: 'Our Purpose',
    ar: 'أهدافنا',
  },
  aboutValuesTitle: {
    bn: 'আমাদের মূল্যবোধ',
    en: 'Our Values',
    ar: 'قيمنا',
  },
  aboutFutureTitle: {
    bn: 'আমাদের ভবিষ্যৎ ভাবনা',
    en: 'Our Future Vision',
    ar: 'رؤيتنا المستقبلية',
  },
  aboutBaytulMalTitle: {
    bn: 'বাইতুল মাল ও পারস্পরিক সহযোগিতা',
    en: 'Baytul Mal & Mutual Support',
    ar: 'بيت المال والتعاون المشترك',
  },

  // Fund Page
  fundDashboardTitle: {
    bn: 'আর্থিক স্বচ্ছতা ড্যাশবোর্ড',
    en: 'Financial Transparency Dashboard',
    ar: 'لوحة الشفافية المالية',
  },
  fundSubtitle: {
    bn: 'সহানুভূতি ফাউন্ডেশনের তহবিলের প্রতিটি হিসাব পরিবারের সদস্যদের জন্য উন্মুক্ত ও স্বচ্ছ।',
    en: 'Every single transaction of Sahanubhuti Foundation fund is completely open and transparent.',
    ar: 'كل حركة مالية في صندوق مؤسسة ساهانوبوتي مكشوفة وشفافة لأفراد العائلة.',
  },
  totalFundCard: {
    bn: 'সর্বমোট সংগৃহীত তহবিল',
    en: 'Total Fund Received',
    ar: 'إجمالي التبرعات المحصلة',
  },
  totalSpentCard: {
    bn: 'মোট মানবিক ব্যয়',
    en: 'Total Humanitarian Spent',
    ar: 'إجمالي المصروفات الإنسانية',
  },
  currentBalanceCard: {
    bn: 'বর্তমান অবশিষ্ট স্থিতি',
    en: 'Current Net Balance',
    ar: 'الرصيد المتبقي الحالي',
  },
  contributorCountCard: {
    bn: 'নিয়মিত জমাদানকারী সংখ্যা',
    en: 'Active Contributors',
    ar: 'عدد المساهمين النشطين',
  },
  lastUpdatedLabel: {
    bn: 'সর্বশেষ হালনাগাদ',
    en: 'Last Updated',
    ar: 'آخر تحديث',
  },
  refreshButton: {
    bn: 'হালনাগাদ করুন',
    en: 'Refresh Data',
    ar: 'تحديث البيانات',
  },
  refreshing: {
    bn: 'হালনাগাদ হচ্ছে...',
    en: 'Refreshing...',
    ar: 'جاري التحديث...',
  },
  recentTransactionsTitle: {
    bn: 'সাম্প্রতিক লেনদেন বিবরণী',
    en: 'Recent Transaction Statements',
    ar: 'كشف المعاملات الأخيرة',
  },
  txDate: {
    bn: 'তারিখ',
    en: 'Date',
    ar: 'التاريخ',
  },
  txDescription: {
    bn: 'বিবরণ',
    en: 'Description',
    ar: 'البيان',
  },
  txType: {
    bn: 'ধরন',
    en: 'Type',
    ar: 'النوع',
  },
  txAmount: {
    bn: 'পরিমাণ (টাকা)',
    en: 'Amount (BDT)',
    ar: 'المبلغ (تاكا)',
  },
  txIncome: {
    bn: 'জমা / অনুদান',
    en: 'Deposit / Contribution',
    ar: 'إيداع / مساهمة',
  },
  txExpense: {
    bn: 'ব্যয় / সহায়তা',
    en: 'Expense / Assistance',
    ar: 'مصروف / مساعدة',
  },
  fundDataUnavailable: {
    bn: 'তহবিলের তথ্য এই মুহূর্তে লোড করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    en: 'Fund data is temporarily unavailable. Please try again shortly.',
    ar: 'بيانات الصندوق غير متوفرة مؤقتًا. يرجى المحاولة بعد قليل.',
  },
  yearlyReceivedTitle: {
    bn: 'বাৎসরিক আদায় পরিসংখ্যান',
    en: 'Yearly Collection Statistics',
    ar: 'إحصائيات التحصيل السنوي',
  },
  monthlyBreakdownTitle: {
    bn: 'মাসিক আদায় বিবরণী',
    en: 'Monthly Collection Breakdown',
    ar: 'تفاصيل التحصيل الشهري',
  },
  memberContributionsTitle: {
    bn: 'সদস্যদের নিয়মিত মাসিক জমার হিসাব',
    en: 'Member Monthly Contribution Status',
    ar: 'سجل الاشتراكات الشهرية للأعضاء',
  },
  commitmentLabel: {
    bn: 'মাসিক অঙ্গীকার',
    en: 'Monthly Commitment',
    ar: 'الالتزام الشهري',
  },
  paidMonthsLabel: {
    bn: 'পরিশোধিত মাস',
    en: 'Paid Months',
    ar: 'الأشهر المدفوعة',
  },
  returnHomeBtn: {
    bn: 'হোমে ফিরে যান',
    en: 'Return to Home',
    ar: 'العودة إلى الرئيسية',
  },

  // Members Page
  membersPageTitle: {
    bn: 'ফাউন্ডেশনের সদস্যবৃন্দ',
    en: 'Foundation Members',
    ar: 'أعضاء المؤسسة',
  },
  membersSubtitle: {
    bn: 'আমাদের পারিবারিক উদ্যোগকে এগিয়ে নিতে যে আপনজনেরা আন্তরিকভাবে যুক্ত আছেন।',
    en: 'Our cherished family members who are wholeheartedly united in advancing this cause.',
    ar: 'أفراد عائلتنا الكرام الذين يشاركون بكل إخلاص في دعم هذه المبادرة.',
  },
  memberSerial: {
    bn: 'ক্রমিক নং',
    en: 'Serial No.',
    ar: 'الرقم التسلسلي',
  },
  memberDesignation: {
    bn: 'দায়িত্ব / পদবী',
    en: 'Designation / Role',
    ar: 'الصفة / المنصب',
  },
  memberLocation: {
    bn: 'ঠিকানা / বর্তমান অবস্থান',
    en: 'Location',
    ar: 'الموقع',
  },
  memberJoiningDate: {
    bn: 'যোগদানের তারিখ',
    en: 'Joining Date',
    ar: 'تاريخ الانضمام',
  },
  memberContact: {
    bn: 'যোগাযোগ',
    en: 'Contact Info',
    ar: 'معلومات الاتصال',
  },

  // Activities Page
  activitiesTitle: {
    bn: 'মানবিক কার্যক্রম ও উদ্যোগ',
    en: 'Humanitarian Activities & Initiatives',
    ar: 'الأنشطة والمبادرات الإنسانية',
  },
  activitiesSubtitle: {
    bn: 'আমাদের ক্ষুদ্র সামর্থ্যের মধ্য দিয়ে বাস্তবায়িত ও চলমান সেবামূলক কার্যক্রমসমূহ।',
    en: 'Our humanitarian and welfare activities implemented within our humble capacity.',
    ar: 'أنشطتنا الإنسانية والخدمية المنفذة في حدود إمكانياتنا المتواضعة.',
  },

  // Notices Page
  noticesTitle: {
    bn: 'ঘোষণা ও নোটিশ বোর্ড',
    en: 'Announcements & Notice Board',
    ar: 'لوحة الإعلانات والبيانات',
  },
  noticesSubtitle: {
    bn: 'সহানুভূতি ফাউন্ডেশনের সাধারণ তথ্য, মিটিংয়ের সিদ্ধান্ত ও প্রয়োজনীয় ঘোষণা।',
    en: 'Official notices, meeting outcomes, and announcements of Sahanubhuti Foundation.',
    ar: 'الإعلانات الرسمية وقرارات الاجتماعات الصادرة عن مؤسسة ساهانوبوتي.',
  },

  // Gallery Page
  galleryTitle: {
    bn: 'ফটো গ্যালারি',
    en: 'Photo Gallery',
    ar: 'معرض الصور',
  },
  gallerySubtitle: {
    bn: 'আমাদের সেবামূলক কার্যক্রম এবং স্মরণীয় পারিবারিক মুহূর্তগুলোর স্থিরচিত্র।',
    en: 'Visual documentation of our welfare initiatives and cherished family milestones.',
    ar: 'توثيق مرئي لمبادراتنا الإنسانية واللحظات العائلية المؤثرة.',
  },
  allCategories: {
    bn: 'সকল বিভাগ',
    en: 'All Categories',
    ar: 'جميع الأقسام',
  },
  allYears: {
    bn: 'সকল বছর',
    en: 'All Years',
    ar: 'جميع السنوات',
  },

  // Contact Page
  contactTitle: {
    bn: 'আমাদের সাথে যোগাযোগ করুন',
    en: 'Get in Touch with Us',
    ar: 'تواصل معنا',
  },
  contactSubtitle: {
    bn: 'যেকোনো পরামর্শ, সহযোগিতা বা সদস্য হওয়া সংক্রান্ত তথ্যের জন্য বার্তা পাঠাতে পারেন।',
    en: 'Send us a message for suggestions, cooperation, or membership inquiries.',
    ar: 'راسلنا لأي استفسار، اقتراح، أو طلب انضمام إلى عضوية المبادرة.',
  },
  contactFormName: {
    bn: 'আপনার পূর্ণ নাম',
    en: 'Your Full Name',
    ar: 'الاسم الكامل',
  },
  contactFormEmail: {
    bn: 'ইমেইল ঠিকানা',
    en: 'Email Address',
    ar: 'البريد الإلكتروني',
  },
  contactFormPhone: {
    bn: 'ফোন নম্বর (ঐচ্ছিক)',
    en: 'Phone Number (Optional)',
    ar: 'رقم الهاتف (اختياري)',
  },
  contactFormSubject: {
    bn: 'বিষয় (ঐচ্ছিক)',
    en: 'Subject (Optional)',
    ar: 'الموضوع (اختياري)',
  },
  contactFormMessage: {
    bn: 'আপনার বার্তা / বিস্তারিত',
    en: 'Your Message / Details',
    ar: 'نص الرسالة / التفاصيل',
  },
  contactFormSubmit: {
    bn: 'বার্তা পাঠান',
    en: 'Send Message',
    ar: 'إرسال الرسالة',
  },
  contactFormSubmitting: {
    bn: 'বার্তা পাঠানো হচ্ছে...',
    en: 'Sending...',
    ar: 'جاري الإرسال...',
  },
  contactSuccessMessage: {
    bn: 'আপনার বার্তাটি সফলভাবে পাঠানো হয়েছে। ইনশাআল্লাহ দ্রুত যোগাযোগ করা হবে।',
    en: 'Your message has been sent successfully. We will be in touch soon, InshaAllah.',
    ar: 'تم إرسال رسالتكم بنجاح. سنتواصل معكم قريباً إن شاء الله.',
  },
  directContactTitle: {
    bn: 'সরাসরি যোগাযোগ মাধ্যম',
    en: 'Direct Contact Channels',
    ar: 'قنوات التواصل المباشر',
  },
  officialEmail: {
    bn: 'অফিসিয়াল ইমেইল',
    en: 'Official Email',
    ar: 'البريد الرسمي',
  },
  officialFacebook: {
    bn: 'অফিসিয়াল ফেসবুক পেজ',
    en: 'Official Facebook Page',
    ar: 'الصفحة الرسمية على فيسبوك',
  },
  phoneLabel: {
    bn: 'জরুরি ফোন নম্বর',
    en: 'Emergency Contact Phone',
    ar: 'رقم الهاتف المباشر',
  },
  emailLabel: {
    bn: 'ইমেইল:',
    en: 'Email:',
    ar: 'البريد الإلكتروني:',
  },
  hotlineLabel: {
    bn: 'হটলাইন:',
    en: 'Hotline:',
    ar: 'الخط الساخن:',
  },

  // Empty States
  emptyData: {
    bn: 'বর্তমানে প্রদর্শনের জন্য কোনো তথ্য নেই।',
    en: 'No information to display at this time.',
    ar: 'لا توجد معلومات للعرض حالياً.',
  },
  emptyActivities: {
    bn: 'বর্তমানে প্রদর্শনের মতো কোনো কার্যক্রম তালিকাভুক্ত নেই। নতুন উদ্যোগ যুক্ত হলে এখানে প্রকাশিত হবে।',
    en: 'No activities listed at this time. New initiatives will appear here when published.',
    ar: 'لا توجد أنشطة مسجلة حالياً. سيتم إدراج المبادرات الجديدة هنا فور اعتمادها.',
  },
  emptyNotices: {
    bn: 'বর্তমানে কোনো নতুন নোটিশ প্রকাশিত হয়নি।',
    en: 'No new notices published at this moment.',
    ar: 'لا توجد إعلانات جديدة منشورة في الوقت الحالي.',
  },
  emptyGallery: {
    bn: 'এই বিভাগে বর্তমানে কোনো ছবি পাওয়া যায়নি।',
    en: 'No photos found in this section.',
    ar: 'لم يتم العثور على صور في هذا القسم.',
  },
  emptyMembers: {
    bn: 'সদস্য তালিকা বর্তমানে সংকলিত হচ্ছে।',
    en: 'The member registry is currently being updated.',
    ar: 'سجل الأعضاء قيد التحديث حالياً.',
  },
  backToMembers: {
    bn: 'সদস্য তালিকায় ফিরে যান',
    en: 'Back to Members',
    ar: 'العودة إلى قائمة الأعضاء',
  },
  activeMember: {
    bn: 'সক্রিয় সদস্য',
    en: 'Active Member',
    ar: 'عضو نشط',
  },
  memberNotFound: {
    bn: 'সদস্যের তথ্য পাওয়া যায়নি',
    en: 'Member Not Found',
    ar: 'لم يتم العثور على العضو',
  },
  memberNotFoundHint: {
    bn: 'অনুগ্রহ করে সদস্য তালিকায় ফিরে যান।',
    en: 'Please return to the members list.',
    ar: 'الرجاء العودة إلى قائمة الأعضاء.',
  },
  memberJoinDateLabel: {
    bn: 'সদস্য হওয়ার তারিখ:',
    en: 'Join Date:',
    ar: 'تاريخ الانضمام:',
  },

  // Footer
  footerAboutText: {
    bn: 'সহানুভূতি ফাউন্ডেশন—ফেনীর শর্শদীর মৌলভী বাড়ি থেকে শুরু হওয়া একটি পারিবারিক মানবিক উদ্যোগ। পরস্পরের পাশে থাকা এবং আর্তমানবতার সেবাই আমাদের অঙ্গীকার।',
    en: 'Sahanubhuti Foundation—A family humanitarian initiative originating from Moulovi Bari, Sharshadi, Feni. Standing by one another and serving humanity is our pledge.',
    ar: 'مؤسسة ساهانوبوتي—مبادرة إنسانية عائلية انطلقت من مولفي باري، شارشادي، فيني. عهدنا التكاتف وخدمة المحتاجين.',
  },
  allRightsReserved: {
    bn: 'সর্বস্বত্ব সংরক্ষিত।',
    en: 'All rights reserved.',
    ar: 'جميع الحقوق محفوظة.',
  },
  quickLinks: {
    bn: 'প্রয়োজনীয় লিংক',
    en: 'Quick Links',
    ar: 'روابط سريعة',
  },

  // Admin Area
  adminTitle: {
    bn: 'অ্যাডমিন কন্ট্রোল সিস্টেম',
    en: 'Admin Control System',
    ar: 'نظام إدارة المؤسسة',
  },
  adminLoginTitle: {
    bn: 'প্রশাসক প্রবেশদ্বার',
    en: 'Administrator Access',
    ar: 'بوابة دخول الإدارة',
  },
  adminPasswordLabel: {
    bn: 'অ্যাডমিন পাসওয়ার্ড',
    en: 'Admin Password',
    ar: 'كلمة مرور الإدارة',
  },
  adminLoginBtn: {
    bn: 'প্রবেশ করুন',
    en: 'Sign In',
    ar: 'تسجيل الدخول',
  },
  adminLogoutBtn: {
    bn: 'লগআউট',
    en: 'Log Out',
    ar: 'تسجيل الخروج',
  },
  adminInvalidPassword: {
    bn: 'ভুল পাসওয়ার্ড। দয়া করে সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।',
    en: 'Invalid password. Please enter the correct password.',
    ar: 'كلمة المرور غير صحيحة. الرجاء إدخال كلمة المرور الصحيحة.',
  },
  adminDashboardTab: {
    bn: 'ড্যাশবোর্ড ওভারভিউ',
    en: 'Dashboard Overview',
    ar: 'نظرة عامة',
  },
  adminInboxTab: {
    bn: 'যোগাযোগ ইনবক্স',
    en: 'Contact Inbox',
    ar: 'صندوق الرسائل',
  },
  adminMembersTab: {
    bn: 'সদস্য ব্যবস্থাপনা ও ক্রম',
    en: 'Members & Order',
    ar: 'إدارة الأعضاء وترتيبهم',
  },
  adminActivitiesTab: {
    bn: 'কার্যক্রম সম্পাদক',
    en: 'Activities Editor',
    ar: 'إدارة الأنشطة',
  },
  adminNoticesTab: {
    bn: 'নোটিশ বোর্ড সম্পাদক',
    en: 'Notices Editor',
    ar: 'إدارة الإعلانات',
  },
  adminGalleryTab: {
    bn: 'গ্যালারি ব্যবস্থাপনা',
    en: 'Gallery Manager',
    ar: 'إدارة المعرض',
  },
  adminFundSourceTab: {
    bn: 'তহবিল উৎস সংযোগ',
    en: 'Fund Source Connection',
    ar: 'ربط مصدر الصندوق',
  },
  adminAboutTab: {
    bn: 'আমাদের সম্পর্কে এডিটর',
    en: 'About Us Editor',
    ar: 'محرر من نحن',
  },
  adminSocialTab: {
    bn: 'সোশ্যাল লিংক',
    en: 'Social Links',
    ar: 'روابط التواصل',
  },
  adminSettingsTab: {
    bn: 'নিরাপত্তা ও সেটিংস',
    en: 'Security & Settings',
    ar: 'الأمان والإعدادات',
  },
  saveChanges: {
    bn: 'পরিবর্তন সংরক্ষণ করুন',
    en: 'Save Changes',
    ar: 'حفظ التغييرات',
  },
  savedSuccess: {
    bn: 'সফলভাবে সংরক্ষিত হয়েছে!',
    en: 'Changes saved successfully!',
    ar: 'تم حفظ التغييرات بنجاح!',
  },
  cancel: {
    bn: 'বাতিল',
    en: 'Cancel',
    ar: 'إلغاء',
  },
  delete: {
    bn: 'মুছে ফেলুন',
    en: 'Delete',
    ar: 'حذف',
  },
  edit: {
    bn: 'সম্পাদনা',
    en: 'Edit',
    ar: 'تعديل',
  },
  add: {
    bn: 'নতুন যুক্ত করুন',
    en: 'Add New',
    ar: 'إضافة جديد',
  },

  // Additional Multilingual Public UI Keys
  viewLinkedActivity: {
    bn: 'সম্পর্কিত কার্যক্রম দেখুন',
    en: 'View Linked Activity',
    ar: 'عرض النشاط المرتبط',
  },
  financialNotice: {
    bn: 'খরচ সংক্রান্ত অবগতি',
    en: 'Expense Notice & Disclosure',
    ar: 'إشعار بالمصروفات والإفصاح المالي',
  },
  financialTransparency: {
    bn: 'তহবিল ও ব্যয় স্বচ্ছতা রেকর্ড',
    en: 'Financial Transparency Record',
    ar: 'سجل الشفافية المالية',
  },
  financialTransparencyDesc: {
    bn: 'এই কার্যক্রমের যাবতীয় ব্যয় ভাউচার ও নিরীক্ষিত অডিট রেকর্ড কেন্দ্রীয় তহবিলের ব্যয়ের লেজারে অন্তর্ভুক্ত।',
    en: 'All expense vouchers and audited records of this activity are included in the central fund expense ledger.',
    ar: 'جميع إيصالات المصروفات وسجلات التدقيق لهذا النشاط مدرجة في دفتر مصروفات الصندوق المركزي.',
  },
  viewFundStatement: {
    bn: 'তহবিল বিবরণী দেখুন',
    en: 'View Fund Statement',
    ar: 'عرض كشف الصندوق',
  },
  backToFundStatement: {
    bn: 'তহবিল বিবরণীতে ফিরে যান',
    en: 'Back to Fund Statement',
    ar: 'العودة إلى كشف الصندوق',
  },
  canonicalLedgerRecords: {
    bn: 'সংযুক্ত অনুমোদিত ব্যয় (Canonical Ledger Records):',
    en: 'Linked Approved Expenses (Canonical Ledger Records):',
    ar: 'المصروفات المعتمدة المرتبطة (سجلات الدفتر المعتمد):',
  },
  activityGalleryTitle: {
    bn: 'কার্যক্রমের স্থিরচিত্র (Photo Gallery)',
    en: 'Activity Photo Gallery',
    ar: 'معرض صور النشاط',
  },
  backToActivities: {
    bn: 'সকল কার্যক্রমে ফিরে যান',
    en: 'Back to All Activities',
    ar: 'العودة إلى جميع الأنشطة',
  },
  shareBtn: {
    bn: 'শেয়ার',
    en: 'Share',
    ar: 'مشاركة',
  },
  copiedToast: {
    bn: 'কপি হয়েছে!',
    en: 'Copied!',
    ar: 'تم النسخ!',
  },
  copyLink: {
    bn: 'লিংক কপি করুন',
    en: 'Copy Link',
    ar: 'نسخ الرابط',
  },
  activityNotFound: {
    bn: 'কার্যক্রমটি খুঁজে পাওয়া যায়নি',
    en: 'Activity Not Found',
    ar: 'النشاط غير موجود',
  },
  activityNotFoundHint: {
    bn: 'অনুরোধকৃত কার্যক্রমটি অপ্রকাশিত হতে পারে অথবা লিংকটি পরিবর্তিত হয়েছে।',
    en: 'The requested activity may be unpublished or the link has changed.',
    ar: 'النشاط المطلوب قد يكون غير منشور أو تم تغيير الرابط.',
  },
  prevActivity: {
    bn: 'পূর্ববর্তী কার্যক্রম',
    en: 'Previous Activity',
    ar: 'النشاط السابق',
  },
  noPrevActivity: {
    bn: 'কোনো পূর্ববর্তী কার্যক্রম নেই',
    en: 'No previous activity',
    ar: 'لا يوجد نشاط سابق',
  },
  nextActivity: {
    bn: 'পরবর্তী কার্যক্রম',
    en: 'Next Activity',
    ar: 'النشاط التالي',
  },
  noNextActivity: {
    bn: 'কোনো পরবর্তী কার্যক্রম নেই',
    en: 'No next activity',
    ar: 'لا يوجد نشاط تالٍ',
  },
  activityPurposeContext: {
    bn: 'উদ্দেশ্য ও প্রেক্ষাপট',
    en: 'Purpose & Context',
    ar: 'الهدف والسياق',
  },
  activityLocationLabel: {
    bn: 'কার্যক্রমের স্থান',
    en: 'Activity Location',
    ar: 'موقع النشاط',
  },
  activityBeneficiariesLabel: {
    bn: 'সুবিধাভোগী',
    en: 'Beneficiaries',
    ar: 'المستفيدون',
  },
  activityOutcomesLabel: {
    bn: 'অর্জন ও ফলাফল (Key Outcomes)',
    en: 'Key Outcomes & Results',
    ar: 'النتائج والمكتسبات',
  },
  transparentBaitulMal: {
    bn: 'স্বচ্ছ বাইতুল মাল তহবিল',
    en: 'Transparent Baytul Mal Fund',
    ar: 'صندوق بيت المال الشفاف',
  },
  liveGoogleSheetConnected: {
    bn: 'লাইভ গুগল শিট সংযুক্ত',
    en: 'Live Google Sheet Connected',
    ar: 'متصل بجدول بيانات جوجل المباشر',
  },
  savedCacheData: {
    bn: 'সংরক্ষিত ক্যাশ তথ্য',
    en: 'Cached Data',
    ar: 'بيانات مخزنة مؤقتًا',
  },
  dataUnavailable: {
    bn: 'তথ্য অনুপলব্ধ',
    en: 'Data Unavailable',
    ar: 'البيانات غير متوفرة',
  },
  verifyingConnection: {
    bn: 'সংযোগ যাচাই করা হচ্ছে',
    en: 'Verifying Connection...',
    ar: 'جاري التحقق من الاتصال...',
  },
  viewGoogleSheet: {
    bn: 'গুগল শিট দেখুন',
    en: 'View Google Sheet',
    ar: 'عرض جدول بيانات جوجل',
  },
  sourceSheet: {
    bn: 'মূল উৎস শিট',
    en: 'Original Source Sheet',
    ar: 'ورقة المصدر الأصلية',
  },
  yearDataNotConnected: {
    bn: 'আর্থিক বছরের তথ্য এখনো সংযুক্ত করা হয়নি',
    en: 'Fiscal Year Data Not Yet Connected',
    ar: 'لم يتم ربط بيانات السنة المالية بعد',
  },
  yearDataNotConnectedDesc: {
    bn: 'এই আর্থিক বছরের জন্য কোনো গুগল স্প্রেডশিট বা ডাটাবেজ লিংক যুক্ত করা হয়নি। প্রশাসনিক প্যানেল থেকে লিংক কনফিগার করার পর তথ্য স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।',
    en: 'No Google Spreadsheet or database link has been configured for this fiscal year. Once configured from the admin panel, data will appear automatically.',
    ar: 'لم يتم تكوين جدول بيانات جوجل أو رابط قاعدة بيانات لهذه السنة المالية. بعد التهيئة من لوحة التحكم، ستظهر البيانات تلقائيًا.',
  },
  viewActiveYearData: {
    bn: 'সালের হিসাব দেখুন',
    en: 'View Year Records',
    ar: 'عرض حسابات سنة',
  },
  yearDataSourceUnavailable: {
    bn: 'আর্থিক বছরের ডাটা সোর্স বর্তমানে অনুপলব্ধ',
    en: 'Fiscal Year Data Source Currently Unavailable',
    ar: 'مصدر بيانات السنة المالية غير متوفر حاليًا',
  },
  reloadBtn: {
    bn: 'পুনরায় লোড করুন',
    en: 'Reload',
    ar: 'إعادة التحميل',
  },
  backToActiveYearFund: {
    bn: 'সালের তহবিলে ফিরে যান',
    en: 'Back to Year Fund',
    ar: 'العودة إلى صندوق سنة',
  },
  totalBaitulMalCollection: {
    bn: 'সর্বমোট সংগৃহীত বাইতুল মাল আদায়',
    en: 'Total Baytul Mal Collections',
    ar: 'إجمالي تحصيلات بيت المال',
  },
  approvedMedicalAidExpenses: {
    bn: 'অনুমোদিত ওষুধ ও মানবিক সহায়তা ব্যয়',
    en: 'Approved Healthcare & Relief Aid Expenses',
    ar: 'مصروفات الرعاية الصحية والمساعدات المعتمدة',
  },
  currentNetCashBalance: {
    bn: 'বাইতুল মালে বর্তমান কার্যকর নগদ স্থিতি',
    en: 'Current Net Cash Balance in Baytul Mal',
    ar: 'الرصيد النقدي الفعلي الحالي في بيت المال',
  },
  expenseRatio: {
    bn: 'মোট ব্যয়ের হার',
    en: 'Expense Ratio',
    ar: 'نسبة المصروفات',
  },
  safetyRatio: {
    bn: 'তহবিল নিরাপত্তা সঞ্চয় স্থিতি',
    en: 'Fund Reserve Safety Ratio',
    ar: 'نسبة أمان احتياطي الصندوق',
  },
  activeContributors: {
    bn: 'নিয়মিত জমাদানকারী সদস্য',
    en: 'Regular Contributing Members',
    ar: 'الأعضاء المساهمون بانتظام',
  },
  memberContributionBreakdown: {
    bn: 'সদস্যভিত্তিক জমা ও চাঁদার তালিকা',
    en: 'Member Contribution & Collection Breakdown',
    ar: 'بيان اشتراكات وتبرعات الأعضاء',
  },
  searchMemberPlaceholder: {
    bn: 'সদস্যের নাম বা নম্বর দিয়ে খুঁজুন...',
    en: 'Search by member name or serial...',
    ar: 'ابحث باسم العضو أو رقمه...',
  },
  noContributionsFound: {
    bn: 'কোনো জমার তথ্য পাওয়া যায়নি',
    en: 'No contribution records found',
    ar: 'لم يتم العثور على سجلات مساهمات',
  },
  totalAmount: {
    bn: 'মোট পরিমাণ',
    en: 'Total Amount',
    ar: 'المبلغ الإجمالي',
  },
  monthLabel: {
    bn: 'মাস',
    en: 'Month',
    ar: 'الشهر',
  },
  yearLabel: {
    bn: 'বছর',
    en: 'Year',
    ar: 'السنة',
  },
  recipientLabel: {
    bn: 'গ্রহীতা',
    en: 'Recipient',
    ar: 'المستفيد',
  },
  categoryLabel: {
    bn: 'বিভাগ',
    en: 'Category',
    ar: 'القسم',
  },
  locationLabel: {
    bn: 'এলাকা',
    en: 'Location',
    ar: 'المنطقة',
  },
  receiptVoucher: {
    bn: 'রসিদ / ভাউচার',
    en: 'Receipt / Voucher',
    ar: 'الإيصال / الفاتورة',
  },
  verifiedBadge: {
    bn: 'অনুমোদিত ও ভেরিফাইড',
    en: 'Audited & Verified',
    ar: 'معتمد ومُدقق',
  },
  contactToJoin: {
    bn: 'সদস্য হতে যোগাযোগ করুন',
    en: 'Contact to Join',
    ar: 'تواصل للانضمام كعضو',
  },
  familyMemberListTag: {
    bn: 'পারিবারিক সদস্য তালিকা',
    en: 'Family Members Directory',
    ar: 'دليل أفراد العائلة',
  },
  expenseAmountLabel: {
    bn: 'ব্যয়:',
    en: 'Expense:',
    ar: 'المصروف:',
  },
  fundTag: {
    bn: 'স্বচ্ছ বাইতুল মাল তহবিল',
    en: 'Transparent Baitul Mal Fund',
    ar: 'صندوق بيت المال الشفاف',
  },
  liveSheetConnected: {
    bn: 'লাইভ গুগল শিট সংযুক্ত',
    en: 'Live Google Sheet Connected',
    ar: 'جدول بيانات جوجل المباشر متصل',
  },
  cachedData: {
    bn: 'সংরক্ষিত ক্যাশ তথ্য',
    en: 'Cached Data',
    ar: 'البيانات المخزنة مؤقتاً',
  },
  sourceUnavailable: {
    bn: 'তথ্য অনুপলব্ধ',
    en: 'Data Unavailable',
    ar: 'البيانات غير متوفرة',
  },
  checkingConnection: {
    bn: 'সংযোগ যাচাই করা হচ্ছে',
    en: 'Checking Connection...',
    ar: 'جارٍ التحقق من الاتصال...',
  },
  viewSourceSheet: {
    bn: 'মূল উৎস শিট',
    en: 'Source Sheet',
    ar: 'الجدول المصدر',
  },
  totalBaitulMalCollected: {
    bn: 'সর্বমোট সংগৃহীত বাইতুল মাল আদায়',
    en: 'Total Baitul Mal Collections',
    ar: 'إجمالي أموال بيت المال المحصلة',
  },
  approvedReliefExpenses: {
    bn: 'অনুমোদিত ওষুধ ও মানবিক সহায়তা ব্যয়',
    en: 'Approved Healthcare & Relief Expenses',
    ar: 'مصروفات المساعدات الطبية والإغاثية المعتمدة',
  },
  currentCashBalance: {
    bn: 'বাইতুল মালে বর্তমান কার্যকর নগদ স্থিতি',
    en: 'Current Net Cash Balance in Baitul Mal',
    ar: 'الرصيد النقدي الفعلي الحالي في بيت المال',
  },
  committedMembers: {
    bn: 'মাসিক অঙ্গীকারাবদ্ধ অংশীদার সদস্য',
    en: 'Committed Monthly Partner Members',
    ar: 'الأعضاء الشركاء الملتزمون شهرياً',
  },
  yearlyFundComparison: {
    bn: 'প্রতি বছরের সংগৃহীত মোট তহবিলের তুলনামূলক চিত্র',
    en: 'Yearly Fund Collection Comparison',
    ar: 'مقارنة إجمالي الأموال المحصلة سنوياً',
  },
  totalCollectedAmount: {
    bn: 'সর্বমোট আদায়',
    en: 'Total Collected',
    ar: 'إجمالي المحصل',
  },
  monthlyInstallmentStats: {
    bn: 'প্রতি মাসের আদায়কৃত নিয়মিত মাসিক কিস্তির পরিসংখ্যান',
    en: 'Monthly Installment Collection Statistics',
    ar: 'إحصائيات أقساط التحصيل الشهرية',
  },
  memberCommitmentLedger: {
    bn: 'সদস্যদের নিয়মিত মাসিক অঙ্গীকার ও জমাকৃত কিস্তির স্বচ্ছ বিবরণী',
    en: 'Member Commitments & Installment Ledger',
    ar: 'سجل التزامات وأقساط اشتراكات الأعضاء',
  },
  searchMemberNamePlaceholder: {
    bn: 'সদস্যের নাম খুঁজুন...',
    en: 'Search member by name...',
    ar: 'ابحث عن اسم العضو...',
  },
  filterAll: {
    bn: 'সকল',
    en: 'All',
    ar: 'الكل',
  },
  filterCompleted: {
    bn: 'পরিপূর্ণ',
    en: 'Completed',
    ar: 'مكتمل',
  },
  filterOngoing: {
    bn: 'চলমান',
    en: 'Ongoing',
    ar: 'قيد المتابعة',
  },
  colMemberName: {
    bn: 'সদস্যের নাম',
    en: 'Member Name',
    ar: 'اسم العضو',
  },
  colMonthlyRate: {
    bn: 'মাসিক হার',
    en: 'Monthly Rate',
    ar: 'المعدل الشهري',
  },
  colTotalDeposited: {
    bn: 'মোট জমা',
    en: 'Total Deposited',
    ar: 'إجمالي المودع',
  },
  colProgress: {
    bn: 'অগ্রগতি',
    en: 'Progress',
    ar: 'التقدم',
  },
  noMemberRecordsFound: {
    bn: 'কোনো সদস্যের তথ্য পাওয়া যায়নি।',
    en: 'No member records found.',
    ar: 'لم يتم العثور على سجلات للأعضاء.',
  },
  separateFund: {
    bn: 'পৃথক তহবিল',
    en: 'Separate Fund',
    ar: 'صندوق منفصل',
  },
  fundUsageAndSafetyRatio: {
    bn: 'তহবিল ব্যবহার ও নিরাপত্তা অনুপাত',
    en: 'Fund Utilization & Reserve Ratio',
    ar: 'نسبة استخدام الأموال واحتياطي الأمان',
  },
  healthcareSpendingRate: {
    bn: 'মানবিক সহায়তা ও চিকিৎসায় ব্যয়িত হার',
    en: 'Healthcare & Relief Spending Rate',
    ar: 'معدل الإنفاق على الرعاية الصحية والإغاثة',
  },
  fundUsageDesc: {
    bn: 'সর্বমোট সংগৃহীত তহবিলের বিপরীতে মানবিক কাজে ব্যয় এবং বাইতুল মালের অবশিষ্ট মওজুদ',
    en: 'Humanitarian expenditures compared to total collections and remaining reserve.',
    ar: 'مصروفات الأعمال الإنسانية مقابل إجمالي التبرعات والاحتياطي المتبقي.',
  },
  spendingRatio: {
    bn: 'ব্যয় অনুপাত',
    en: 'Spending Ratio',
    ar: 'نسبة الإنفاق',
  },
  totalAidSpent: {
    bn: 'মোট মানবিক সহায়তা ব্যয়:',
    en: 'Total Relief Aid Spent:',
    ar: 'إجمالي المساعدات الإنسانية المصروفة:',
  },
  effectiveCashInBaitulMal: {
    bn: 'বাইতুল মালে কার্যকর নগদ স্থিতি:',
    en: 'Effective Cash in Baitul Mal:',
    ar: 'الرصيد الفعلي في بيت المال:',
  },
  voucherProof: {
    bn: 'ব্যয়ের প্রমাণপত্র / ভাউচার কপি',
    en: 'Expense Receipt / Voucher Proof',
    ar: 'إيصال / مستند إثبات الصرف',
  },
  currentYearLabel: {
    bn: 'চলতি বছর',
    en: 'Current Year',
    ar: 'العام الحالي',
  },
  yearSuffix: {
    bn: 'সাল',
    en: '',
    ar: 'عام',
  },
  monthsSuffix: {
    bn: 'মাস',
    en: 'months',
    ar: 'أشهر',
  },
  paidStatus: {
    bn: 'পরিশোধিত',
    en: 'Paid',
    ar: 'مدفوع',
  },
  dueStatus: {
    bn: 'বাকি',
    en: 'Due',
    ar: 'متبقي',
  },
  recipientColonLabel: {
    bn: 'গ্রহীতা:',
    en: 'Recipient:',
    ar: 'المستفيد:',
  },
  categoryRelief: {
    bn: 'জরুরি ত্রাণ',
    en: 'Emergency Relief',
    ar: 'الإغاثة العاجلة',
  },
  categoryMedical: {
    bn: 'চিকিৎসা সহায়তা',
    en: 'Medical Assistance',
    ar: 'المساعدات الطبية',
  },
  categoryEducation: {
    bn: 'শিক্ষা সহায়তা',
    en: 'Education Support',
    ar: 'دعم التعليم',
  },
  categoryOrphanWidow: {
    bn: 'এতিম/বিধবা সহায়তা',
    en: 'Orphan & Widow Support',
    ar: 'كفالة الأيتام والأرامل',
  },
  categoryOther: {
    bn: 'অন্যান্য ব্যয়',
    en: 'Other Expenses',
    ar: 'مصروفات أخرى',
  },
  joinMemberNoticeTitle: {
    bn: 'পরিবারের সকল সদস্যের প্রতি আন্তরিক আহ্বান',
    en: 'A Sincere Invitation to All Family Members',
    ar: 'دعوة صادقة لجميع أفراد العائلة',
  },
  joinMemberNoticeDesc: {
    bn: 'আমাদের এই উদ্যোগকে আরও শক্তিশালী ও গতিশীল করতে পরিবারের যেকেউ সদস্য হিসেবে যুক্ত হতে যোগাযোগ করতে পারেন।',
    en: 'To make this initiative stronger and more dynamic, any family member is warmly invited to get in touch and join.',
    ar: 'لجعل هذه المبادرة أكثر قوة وفاعلية، ندعو جميع أفراد العائلة للتواصل والانضمام كأعضاء.',
  },
  joinMemberBtn: {
    bn: 'সদস্য হতে যোগাযোগ করুন',
    en: 'Get in Touch to Join',
    ar: 'تواصل معنا للانضمام',
  },
  memberSince: {
    bn: 'সদস্য:',
    en: 'Member since:',
    ar: 'عضو منذ:',
  },
  membersCompileMsg: {
    bn: 'সদস্য তালিকা বর্তমানে সংকলন করা হচ্ছে। অ্যাডমিন প্যানেল থেকে ক্রমানুসারে সদস্য যুক্ত করা যাবে।',
    en: 'Member directory is currently being compiled. Members can be added sequentially from the Admin Panel.',
    ar: 'يجري تجميع دليل الأعضاء حالياً. يمكن إضافة الأعضاء بالتسلسل من لوحة الإدارة.',
  },
  fillContactForm: {
    bn: 'যোগাযোগ ফর্ম পূরণ করুন',
    en: 'Fill Contact Form',
    ar: 'ملء نموذج الاتصال',
  },
};
