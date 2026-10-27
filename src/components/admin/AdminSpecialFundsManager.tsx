import React, { useState } from 'react';
import { SpecialFundRecord, SpecialFundDonation, SpecialFundExpense, SpecialFundStatus, ExpenseAttachment } from '../../types';
import { storageService } from '../../services/storageService';
import { parseRecordYear } from '../../utils/foundationHelpers';
import {
  Layers,
  Plus,
  Save,
  Trash2,
  Edit2,
  X,
  ShieldCheck,
  UserCheck,
  Calendar,
  AlertCircle,
  Coins,
  CheckCircle2,
  TrendingDown,
  Gift,
  Scale,
  Receipt,
  FileText,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Upload,
  Paperclip,
  Eye,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';

interface AdminSpecialFundsManagerProps {
  onDataChanged?: () => void;
  selectedYear?: string;
}

export const AdminSpecialFundsManager: React.FC<AdminSpecialFundsManagerProps> = ({
  onDataChanged,
  selectedYear,
}) => {
  const [funds, setFunds] = useState<SpecialFundRecord[]>(() =>
    storageService.getSpecialFunds(selectedYear)
  );

  // Active fund being viewed / edited
  const [activeFundId, setActiveFundId] = useState<string | null>(null);
  const [isEditingFundInfo, setIsEditingFundInfo] = useState(false);

  // Template Modal
  const [showRamadanTemplateModal, setShowRamadanTemplateModal] = useState(false);

  // Fund Form states
  const [fundName, setFundName] = useState('');
  const [fundPurpose, setFundPurpose] = useState('');
  const [fundEventDate, setFundEventDate] = useState('');
  const [fundYear, setFundYear] = useState(selectedYear || '2026');
  const [fundStatus, setFundStatus] = useState<SpecialFundStatus>('completed');
  const [fundIntegrationMode, setFundIntegrationMode] = useState<'separate' | 'integrated'>('separate');

  // Sub-forms: Donation & Expense
  const [isAddingDonation, setIsAddingDonation] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorDate, setDonorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [donorIsAnon, setDonorIsAnon] = useState(false);
  const [donorAmount, setDonorAmount] = useState('');
  const [donorIsInKind, setDonorIsInKind] = useState(false);
  const [donorInKindItem, setDonorInKindItem] = useState('');
  const [donorInKindValue, setDonorInKindValue] = useState('');
  const [donorNotes, setDonorNotes] = useState('');

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('ইফতার সামগ্রী');
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState('');
  const [expenseAttachments, setExpenseAttachments] = useState<ExpenseAttachment[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [viewingAttachments, setViewingAttachments] = useState<{
    expenseTitle: string;
    attachments: ExpenseAttachment[];
    expenseId: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const refreshFunds = () => {
    const list = storageService.getSpecialFunds(selectedYear);
    setFunds(list);
    if (onDataChanged) onDataChanged();
  };

  const handleStartCreateFund = () => {
    setActiveFundId('new');
    setIsEditingFundInfo(true);
    setFundName('');
    setFundPurpose('');
    setFundEventDate('২০২৬');
    setFundYear(selectedYear || '2026');
    setFundStatus('active');
    setFundIntegrationMode('separate');
    setErrorMsg('');
  };

  const handleSelectFund = (id: string) => {
    setActiveFundId(id);
    setIsEditingFundInfo(false);
    setIsAddingDonation(false);
    setIsAddingExpense(false);
    setErrorMsg('');
  };

  const handleStartEditFundInfo = (fund: SpecialFundRecord) => {
    setIsEditingFundInfo(true);
    setFundName(fund.name);
    setFundPurpose(fund.purpose || '');
    setFundEventDate(fund.eventDate || '');
    setFundYear(fund.year || selectedYear || '2026');
    setFundStatus(fund.status || 'completed');
    setFundIntegrationMode(fund.integrationMode || 'separate');
  };

  const handleSaveFundInfo = () => {
    setErrorMsg('');
    if (!fundName.trim()) {
      setErrorMsg('তহবিলের নাম প্রদান করা আবশ্যক।');
      return;
    }

    const derivedYear = parseRecordYear(fundEventDate, fundYear) || selectedYear || '2026';
    if (activeFundId === 'new') {
      const newFund: SpecialFundRecord = {
        id: `special-fund-${Date.now()}`,
        name: fundName.trim(),
        purpose: fundPurpose.trim(),
        eventDate: fundEventDate.trim(),
        year: derivedYear,
        status: fundStatus,
        integrationMode: fundIntegrationMode,
        donations: [],
        expenses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storageService.saveSpecialFund(newFund);
      setActiveFundId(newFund.id);
      setIsEditingFundInfo(false);
      setSuccessMsg('নতুন বিশেষ তহবিল সফলভাবে তৈরি হয়েছে।');
    } else if (activeFundId) {
      const existing = funds.find((f) => f.id === activeFundId);
      if (existing) {
        const updated: SpecialFundRecord = {
          ...existing,
          name: fundName.trim(),
          purpose: fundPurpose.trim(),
          eventDate: fundEventDate.trim(),
          year: derivedYear,
          status: fundStatus,
          integrationMode: fundIntegrationMode,
          updatedAt: new Date().toISOString(),
        };
        storageService.saveSpecialFund(updated);
        setIsEditingFundInfo(false);
        setSuccessMsg('তহবিলের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।');
      }
    }
    setTimeout(() => setSuccessMsg(''), 3000);
    refreshFunds();
  };

  const handleDeleteFund = (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিতভাবে এই সম্পূর্ণ বিশেষ তহবিলটি মুছে ফেলতে চান? এতে এর সকল অনুদান ও ব্যয়ের রেকর্ড মুছে যাবে।')) {
      storageService.deleteSpecialFund(id);
      setActiveFundId(null);
      refreshFunds();
      setSuccessMsg('তহবিলটি মুছে ফেলা হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Add Donation to active fund
  const handleSaveDonation = () => {
    if (!activeFundId || activeFundId === 'new') return;
    const currentFund = funds.find((f) => f.id === activeFundId);
    if (!currentFund) return;

    const parsedAmount = parseFloat(donorAmount);
    const parsedInKindVal = parseFloat(donorInKindValue);

    if (donorIsInKind) {
      if (!donorInKindItem.trim()) {
        setErrorMsg('পণ্যের বিবরণ উল্লেখ করুন।');
        return;
      }
    } else {
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setErrorMsg('সঠিক নগদ অনুদানের পরিমাণ উল্লেখ করুন।');
        return;
      }
    }

    if (!donorDate || !donorDate.trim()) {
      setErrorMsg('অনুগ্রহ করে অনুদানের তারিখ উল্লেখ করুন।');
      return;
    }

    const newDonation: SpecialFundDonation = {
      id: `don-${Date.now()}`,
      donorName: donorIsAnon ? '' : donorName.trim(),
      isAnonymous: donorIsAnon,
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      isInKind: donorIsInKind,
      inKindItem: donorIsInKind ? donorInKindItem.trim() : undefined,
      inKindEstimatedValue: !isNaN(parsedInKindVal) && parsedInKindVal > 0 ? parsedInKindVal : undefined,
      notes: donorNotes.trim() || undefined,
      date: donorDate.trim(),
    };

    const updatedFund: SpecialFundRecord = {
      ...currentFund,
      donations: [...(currentFund.donations || []), newDonation],
      updatedAt: new Date().toISOString(),
    };

    storageService.saveSpecialFund(updatedFund);
    setIsAddingDonation(false);
    setDonorName('');
    setDonorDate(new Date().toISOString().slice(0, 10));
    setDonorIsAnon(false);
    setDonorAmount('');
    setDonorIsInKind(false);
    setDonorInKindItem('');
    setDonorInKindValue('');
    setDonorNotes('');
    refreshFunds();
    setSuccessMsg('অনুদানকারী সফলভাবে যোগ করা হয়েছে।');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteDonation = (donationId: string) => {
    if (!activeFundId) return;
    const currentFund = funds.find((f) => f.id === activeFundId);
    if (!currentFund) return;

    const updatedFund: SpecialFundRecord = {
      ...currentFund,
      donations: (currentFund.donations || []).filter((d) => d.id !== donationId),
      updatedAt: new Date().toISOString(),
    };
    storageService.saveSpecialFund(updatedFund);
    refreshFunds();
  };

  // Handle file uploads for expense attachments (PNG, JPG, WebP, PDF up to 5MB)
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetExpenseId?: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    setErrorMsg('');
    const newAttachments: ExpenseAttachment[] = [];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type)) {
        setErrorMsg(`"${file.name}" গ্রহণযোগ্য ফরম্যাট নয়। শুধুমাত্র PNG, JPG, WebP বা PDF আপলোড করুন।`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        setErrorMsg(`"${file.name}" ফাইলের সাইজ ৫MB এর চেয়ে বড়। অনুগ্রহ করে ছোট সাইজের ফাইল দিন।`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          url: dataUrl,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('File reading failed:', err);
      }
    }

    if (targetExpenseId && activeFundId) {
      // Adding directly to an existing expense
      const currentFund = funds.find((f) => f.id === activeFundId);
      if (currentFund) {
        const updatedExpenses = (currentFund.expenses || []).map((exp) => {
          if (exp.id === targetExpenseId) {
            const existingAtts = exp.attachments || [];
            return {
              ...exp,
              attachments: [...existingAtts, ...newAttachments],
            };
          }
          return exp;
        });

        const updatedFund = {
          ...currentFund,
          expenses: updatedExpenses,
          updatedAt: new Date().toISOString(),
        };
        storageService.saveSpecialFund(updatedFund);
        refreshFunds();

        // Update modal state if open
        if (viewingAttachments && viewingAttachments.expenseId === targetExpenseId) {
          setViewingAttachments({
            ...viewingAttachments,
            attachments: [...viewingAttachments.attachments, ...newAttachments],
          });
        }
        setSuccessMsg(`${newAttachments.length}টি প্রমাণপত্র সফলভাবে যুক্ত হয়েছে।`);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } else {
      // Adding to new expense form
      setExpenseAttachments((prev) => [...prev, ...newAttachments]);
    }

    setIsProcessingFiles(false);
    e.target.value = '';
  };

  const handleRemoveAttachmentFromNewExpense = (attId: string) => {
    setExpenseAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleDeleteAttachmentFromExistingExpense = (expenseId: string, attId: string) => {
    if (!activeFundId) return;
    const currentFund = funds.find((f) => f.id === activeFundId);
    if (!currentFund) return;

    const updatedExpenses = (currentFund.expenses || []).map((exp) => {
      if (exp.id === expenseId) {
        return {
          ...exp,
          attachments: (exp.attachments || []).filter((a) => a.id !== attId),
        };
      }
      return exp;
    });

    const updatedFund = {
      ...currentFund,
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
    };
    storageService.saveSpecialFund(updatedFund);
    refreshFunds();

    if (viewingAttachments && viewingAttachments.expenseId === expenseId) {
      setViewingAttachments({
        ...viewingAttachments,
        attachments: viewingAttachments.attachments.filter((a) => a.id !== attId),
      });
    }
  };

  // Add Expense to active fund
  const handleSaveExpense = () => {
    if (!activeFundId || activeFundId === 'new') return;
    const currentFund = funds.find((f) => f.id === activeFundId);
    if (!currentFund) return;

    const parsedAmount = parseFloat(expenseAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('সঠিক খরচের পরিমাণ উল্লেখ করুন।');
      return;
    }
    if (!expenseTitle.trim()) {
      setErrorMsg('ব্যয়ের খাত / বিবরণ প্রদান করুন।');
      return;
    }
    if (!expenseDate || !expenseDate.trim()) {
      setErrorMsg('অনুগ্রহ করে ব্যয়ের তারিখ উল্লেখ করুন।');
      return;
    }

    const newExp: SpecialFundExpense = {
      id: `spexp-${Date.now()}`,
      title: expenseTitle.trim(),
      amount: parsedAmount,
      date: expenseDate.trim(),
      category: expenseCategory.trim(),
      receiptUrl: expenseReceiptUrl.trim() || undefined,
      attachments: expenseAttachments.length > 0 ? expenseAttachments : undefined,
    };

    const updatedFund: SpecialFundRecord = {
      ...currentFund,
      expenses: [...(currentFund.expenses || []), newExp],
      updatedAt: new Date().toISOString(),
    };

    storageService.saveSpecialFund(updatedFund);
    setIsAddingExpense(false);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseDate('');
    setExpenseCategory('ইফতার সামগ্রী');
    setExpenseReceiptUrl('');
    setExpenseAttachments([]);
    refreshFunds();
    setSuccessMsg('ব্যয়ের খাত সফলভাবে যোগ করা হয়েছে।');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteExpense = (expId: string) => {
    if (!activeFundId) return;
    const currentFund = funds.find((f) => f.id === activeFundId);
    if (!currentFund) return;

    const updatedFund: SpecialFundRecord = {
      ...currentFund,
      expenses: (currentFund.expenses || []).filter((e) => e.id !== expId),
      updatedAt: new Date().toISOString(),
    };
    storageService.saveSpecialFund(updatedFund);
    refreshFunds();
  };

  // Import Ramadan Template with exact numbers
  const handleImportRamadanTemplate = () => {
    const existingRamadan = funds.find(
      (f) =>
        f.name.includes('রমজান') ||
        f.name.includes('ইফতার') ||
        f.id === 'special-fund-ramadan-2026'
    );

    if (existingRamadan) {
      if (
        !window.confirm(
          'রমজান ইফতার মাহফিলের একটি তহবিল ইতিমধ্যে বিদ্যমান। আপনি কি এটি প্রতিস্থাপন করতে চান নাকি বিদ্যমানটি রাখবেন?'
        )
      ) {
        return;
      }
    }

    const ramadanFund: SpecialFundRecord = {
      id: existingRamadan?.id || 'special-fund-ramadan-2026',
      name: 'রমজান ইফতার মাহফিল ২০২৬',
      purpose: 'পবিত্র রমজান উপলক্ষে এলাকার মুসল্লি ও রোজাদারদের নিয়ে অনুষ্ঠিত ইফতার মাহফিলের আয় ও ব্যয়ের সম্পূর্ণ সমন্বিত হিসাব।',
      eventDate: 'রমজান ২০২৬',
      year: selectedYear || '2026',
      status: 'completed',
      integrationMode: 'separate',
      donations: [
        { id: 'rd-1', donorName: 'জলিল', amount: 2000, isAnonymous: false, isInKind: false, notes: 'নগদ অনুদান' },
        { id: 'rd-2', donorName: 'দাউদ ও শরীফ', amount: 1500, isAnonymous: false, isInKind: false, notes: 'যৌথ নগদ অনুদান' },
        { id: 'rd-3', donorName: 'করিম', amount: 1000, isAnonymous: false, isInKind: false, notes: 'নগদ অনুদান' },
        { id: 'rd-4', donorName: '১০ জন প্রতিজন ৫০০ করে (১০ × ৫০০)', amount: 5000, isAnonymous: false, isInKind: false, notes: '১০ জন সদস্যের চাঁদা' },
        { id: 'rd-5', donorName: 'মোবাশ্বের ও তোফাজ্জল', amount: 500, isAnonymous: false, isInKind: false, notes: 'যৌথ নগদ অনুদান' },
        { id: 'rd-6', donorName: '২ জন প্রতিজন ৩০০ করে (২ × ৩০০)', amount: 600, isAnonymous: false, isInKind: false, notes: '২ জনের অনুদান' },
        { id: 'rd-7', donorName: '৩ জন প্রতিজন ১০০ করে (৩ × ১০০)', amount: 300, isAnonymous: false, isInKind: false, notes: '৩ জনের অনুদান' },
        { id: 'rd-8', donorName: 'হান্নান ভাই', amount: 0, isAnonymous: false, isInKind: true, inKindItem: 'ট্যাং (শেক বোতল)', inKindEstimatedValue: 400, notes: 'শেক ও শরবত সামগ্রী' },
        { id: 'rd-9', donorName: 'নূর ইসলাম কাকা', amount: 0, isAnonymous: false, isInKind: true, inKindItem: 'সবজি ও কাঁচাবাজার', inKindEstimatedValue: 150, notes: 'পেঁয়াজু ও চপের কাঁচাবাজার' },
      ],
      expenses: [
        { id: 're-1', title: '১০০০ গ্রাম খেজুর', amount: 1200, category: 'ইফতার ফল', date: '২০২৬' },
        { id: 're-2', title: 'তরমুজ ও আপেল', amount: 1280, category: 'ইফতার ফল', date: '২০২৬' },
        { id: 're-3', title: 'বুট ও মুড়ি', amount: 1500, category: 'প্রধান সামগ্রী', date: '২০২৬' },
        { id: 're-4', title: 'জিলাপি ও মিষ্টি', amount: 1140, category: 'মিষ্টান্ন', date: '২০২৬' },
        { id: 're-5', title: 'পেঁয়াজু ও চপ সামগ্রী', amount: 800, category: 'তেল ও ভাজাভুজি', date: '২০২৬' },
        { id: 're-6', title: 'ডিসপোজেবল প্লেট ও গ্লাস', amount: 770, category: 'পরিবেশন সরঞ্জাম', date: '২০২৬' },
        { id: 're-7', title: 'বরফ ও শরবত আনুষঙ্গিক', amount: 300, category: 'পানীয়', date: '২০২৬' },
        { id: 're-8', title: 'বাবুর্চি পারিশ্রমিক', amount: 200, category: 'সেবামূল্য', date: '২০২৬' },
        { id: 're-9', title: 'লেবু ও শসা', amount: 90, category: 'সালাদ', date: '২০২৬' },
        { id: 're-10', title: 'মশলা সামগ্রী', amount: 100, category: 'রান্না উপকরণ', date: '২০২৬' },
        { id: 're-11', title: 'অন্যান্য সামগ্রী', amount: 130, category: 'বিবিধ', date: '২০২৬' },
        { id: 're-12', title: 'পরিচ্ছন্নতা ও পানির জার', amount: 50, category: 'পরিচ্ছন্নতা', date: '২০২৬' },
      ],
      reportedTotalCollected: 10900,
      reportedTotalExpenses: 7560,
      reportedSurplus: 3340,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveSpecialFund(ramadanFund);
    setShowRamadanTemplateModal(false);
    setActiveFundId(ramadanFund.id);
    refreshFunds();
    setSuccessMsg('রমজান ইফতার মাহফিল ২০২৬ হিসাব (নগদ ৳১০,৯০০, ব্যয় ৳৭,৫৬০, উদ্বৃত্ত ৳৩,৩৪০) সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const activeFund = funds.find((f) => f.id === activeFundId);

  // Active Fund Calculations
  const cashDonations = (activeFund?.donations || []).filter((d) => !d.isInKind);
  const inKindDonations = (activeFund?.donations || []).filter((d) => d.isInKind);

  const activeTotalCash = cashDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const activeInKindTotal = inKindDonations.reduce(
    (sum, d) => sum + (Number(d.inKindEstimatedValue) || Number(d.amount) || 0),
    0
  );
  const activeTotalExpenses = (activeFund?.expenses || []).reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );
  const activeSurplus = activeTotalCash - activeTotalExpenses;
  const isSurplusPositive = activeSurplus >= 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-800 rounded-full text-xs font-semibold mb-1 border border-teal-200">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>আলাদা ও বিশেষ তহবিল ব্যবস্থাপনা</span>
          </div>
          <h3 className="text-xl font-bold font-serif text-slate-900">
            আলাদা ও বিশেষ তহবিল (Special Funds)
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            ইফতার মাহফিল, জরুরি সহায়তা বা নির্দিষ্ট উদ্দেশ্যে গঠিত স্বতন্ত্র তহবিলসমূহ তৈরি ও স্বচ্ছ হিসাব পরিচালনা করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ramadan Template Modal Trigger */}
          <button
            onClick={() => setShowRamadanTemplateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>রমজান ইফতার হিসাব প্রিভিউ</span>
          </button>

          <button
            onClick={handleStartCreateFund}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন তহবিল তৈরি করুন</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Funds Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-500 shrink-0">তহবিল নির্বাচন:</span>
        {funds.map((f) => {
          const isSelected = activeFundId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => handleSelectFund(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-teal-800 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{f.name}</span>
              {f.integrationMode === 'integrated' && (
                <span className="text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded">
                  সমন্বিত
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fund Creation / Editing Form */}
      {(isEditingFundInfo || activeFundId === 'new') && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>{activeFundId === 'new' ? 'নতুন বিশেষ তহবিল গঠন' : 'তহবিলের সাধারণ তথ্য সম্পাদনা'}</span>
            </h4>
            <button
              onClick={() => {
                setIsEditingFundInfo(false);
                if (activeFundId === 'new') setActiveFundId(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">তহবিলের নাম *</label>
              <input
                type="text"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="যেমন: রমজান ইফতার মাহফিল ২০২৬"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">তারিখ / উপলক্ষ</label>
              <input
                type="text"
                value={fundEventDate}
                onChange={(e) => setFundEventDate(e.target.value)}
                placeholder="যেমন: রমজান ২০২৬ / ১৫ এপ্রিল"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">আর্থিক বছর</label>
              <input
                type="text"
                value={fundYear}
                onChange={(e) => setFundYear(e.target.value)}
                placeholder="2026"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">স্ট্যাটাস</label>
              <select
                value={fundStatus}
                onChange={(e) => setFundStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="active">চলমান (Active)</option>
                <option value="completed">সম্পন্ন (Completed)</option>
                <option value="archived">সংরক্ষিত (Archived)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">হিসাব সংরক্ষণ নীতি (Accounting Isolation Mode)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 ${
                    fundIntegrationMode === 'separate'
                      ? 'bg-teal-50 border-teal-500 text-teal-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="isolationMode"
                    checked={fundIntegrationMode === 'separate'}
                    onChange={() => setFundIntegrationMode('separate')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs block">স্বতন্ত্র তহবিল (ডিফল্ট)</span>
                    <span className="text-[11px] text-slate-500">মূল ফান্ড থেকে সম্পূর্ণ আলাদা থাকবে; মূল ফান্ড ব্যালেন্সে প্রভাব ফেলবে না।</span>
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 ${
                    fundIntegrationMode === 'integrated'
                      ? 'bg-purple-50 border-purple-500 text-purple-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="isolationMode"
                    checked={fundIntegrationMode === 'integrated'}
                    onChange={() => setFundIntegrationMode('integrated')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs block">মূল ফান্ডে সমন্বিত</span>
                    <span className="text-[11px] text-slate-500">এর আয় ও ব্যয় মূল সাধারণ ফান্ডের সাথে একীভূত হবে।</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">তহবিলের উদ্দেশ্য ও সংক্ষিপ্ত বিবরণ</label>
              <textarea
                rows={2}
                value={fundPurpose}
                onChange={(e) => setFundPurpose(e.target.value)}
                placeholder="তহবিলের উদ্দেশ্য, আয়োজন ও লক্ষ্য সম্পর্কে সংক্ষিপ্ত বিবরণ লিখুন..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              onClick={() => {
                setIsEditingFundInfo(false);
                if (activeFundId === 'new') setActiveFundId(null);
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
            >
              বাতিল
            </button>
            <button
              onClick={handleSaveFundInfo}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>সংরক্ষণ করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Fund Dashboard */}
      {activeFund && !isEditingFundInfo && (
        <div className="space-y-6">
          {/* Fund Details Bar */}
          <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-medium text-emerald-300">
                  {activeFund.eventDate || activeFund.year}
                </span>
                <span className="px-2 py-0.5 bg-teal-500/30 rounded text-xs text-teal-200">
                  {activeFund.integrationMode === 'integrated' ? 'মূল ফান্ডে সমন্বিত' : 'স্বতন্ত্র তহবিল'}
                </span>
              </div>
              <h4 className="text-xl font-bold font-serif">{activeFund.name}</h4>
              {activeFund.purpose && (
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">{activeFund.purpose}</p>
              )}
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={() => handleStartEditFundInfo(activeFund)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>তথ্য সম্পাদনা</span>
              </button>
              <button
                onClick={() => handleDeleteFund(activeFund.id)}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>তহবিল মুছুন</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium block">মোট সংগৃহীত নগদ</span>
              <span className="font-mono text-lg font-bold text-slate-900">৳ {activeTotalCash.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{cashDonations.length} জন অনুদানকারী</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium block">মোট ব্যয়</span>
              <span className="font-mono text-lg font-bold text-rose-700">৳ {activeTotalExpenses.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{(activeFund.expenses || []).length} টি ব্যয়ের খাত</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium block">
                {isSurplusPositive ? 'অবশিষ্ট উদ্বৃত্ত' : 'ঘাটতি'}
              </span>
              <span className={`font-mono text-lg font-bold ${isSurplusPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isSurplusPositive ? '+' : '-'} ৳ {Math.abs(activeSurplus).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isSurplusPositive ? 'তহবিলে জমা আছে' : 'ঘাটতি সমন্বয় করুন'}
              </span>
            </div>

            <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl">
              <span className="text-[11px] text-teal-800 font-medium block">পণ্য/সামগ্রী অনুদান</span>
              <span className="font-mono text-lg font-bold text-teal-900">৳ {activeInKindTotal.toLocaleString()}</span>
              <span className="text-[10px] text-teal-700 block mt-0.5">{inKindDonations.length} টি মালামাল</span>
            </div>
          </div>

          {/* Sub-Section 1: Donors Ledger */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h5 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>অনুদানকারী তালিকা (Donors Ledger)</span>
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  নগদ টাকা এবং পণ্য/মালামাল অনুদানকারী উভয়কেই যুক্ত করুন।
                </p>
              </div>

              {!isAddingDonation && (
                <button
                  onClick={() => setIsAddingDonation(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>অনুদানকারী যোগ করুন</span>
                </button>
              )}
            </div>

            {/* Donation Form */}
            {isAddingDonation && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">নতুন অনুদানকারী যোগ</span>
                  <button onClick={() => setIsAddingDonation(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">অনুদানের তারিখ *</label>
                    <input
                      type="date"
                      value={donorDate}
                      onChange={(e) => setDonorDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">অনুদানকারীর নাম</label>
                    <input
                      type="text"
                      disabled={donorIsAnon}
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder={donorIsAnon ? 'নাম প্রকাশে অনিচ্ছুক' : 'যেমন: জলিল / করিম'}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={donorIsAnon}
                        onChange={(e) => {
                          setDonorIsAnon(e.target.checked);
                          if (e.target.checked) setDonorName('');
                        }}
                        className="rounded text-emerald-600"
                      />
                      <span className="text-xs font-semibold text-slate-700">নাম প্রকাশে অনিচ্ছুক</span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">অনুদানের ধরণ</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDonorIsInKind(false)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs border ${
                          !donorIsInKind ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        নগদ অর্থ
                      </button>
                      <button
                        type="button"
                        onClick={() => setDonorIsInKind(true)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold text-xs border ${
                          donorIsInKind ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        পণ্য / সামগ্রী
                      </button>
                    </div>
                  </div>

                  {!donorIsInKind ? (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">নগদ অনুদানের পরিমাণ (৳) *</label>
                      <input
                        type="number"
                        min="1"
                        value={donorAmount}
                        onChange={(e) => setDonorAmount(e.target.value)}
                        placeholder="যেমন: ১০০০ বা ৫০০০"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">পণ্যের বিবরণ (কী দিয়েছেন) *</label>
                        <input
                          type="text"
                          value={donorInKindItem}
                          onChange={(e) => setDonorInKindItem(e.target.value)}
                          placeholder="যেমন: ট্যাং / সবজি / খেজুর"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">আনুমানিক মূল্য (ঐচ্ছিক ৳)</label>
                        <input
                          type="number"
                          min="0"
                          value={donorInKindValue}
                          onChange={(e) => setDonorInKindValue(e.target.value)}
                          placeholder="যেমন: ৪০০ বা ১৫০"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">সংক্ষিপ্ত নোট</label>
                    <input
                      type="text"
                      value={donorNotes}
                      onChange={(e) => setDonorNotes(e.target.value)}
                      placeholder="যেমন: ১০ জন প্রতিজন ৫০০ করে / বিশেষ সাহায্য"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-emerald-200">
                  <button
                    onClick={() => setIsAddingDonation(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSaveDonation}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                  >
                    যোগ করুন
                  </button>
                </div>
              </div>
            )}

            {/* Donors Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">নাম</th>
                    <th className="py-2.5 px-3">ধরণ</th>
                    <th className="py-2.5 px-3">বিবরণ / নোট</th>
                    <th className="py-2.5 px-3 text-right">পরিমাণ (৳)</th>
                    <th className="py-2.5 px-3 text-center">মুছুন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeFund.donations || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        এখনো কোনো অনুদানকারী রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    (activeFund.donations || []).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">{item.date || '—'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.isAnonymous || !item.donorName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>নাম প্রকাশে অনিচ্ছুক</span>
                            </span>
                          ) : (
                            <span>{item.donorName}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.isInKind ? (
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded text-[11px] border border-teal-200 font-medium">
                              পণ্য: {item.inKindItem}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[11px] border border-emerald-200 font-medium">
                              নগদ অর্থ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.notes || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ৳ {item.isInKind ? (item.inKindEstimatedValue || 0) : item.amount}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDeleteDonation(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-Section 2: Expenses Ledger */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h5 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span>ব্যয় বিবরণী (Expense Ledger)</span>
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  কর্মসূচির সকল ব্যয়ের খাত ও ভাউচার সংরক্ষণ করুন।
                </p>
              </div>

              {!isAddingExpense && (
                <button
                  onClick={() => setIsAddingExpense(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ব্যয়ের খাত যোগ করুন</span>
                </button>
              )}
            </div>

            {/* Expense Form */}
            {isAddingExpense && (
              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">নতুন ব্যয়ের খাত যোগ</span>
                  <button onClick={() => setIsAddingExpense(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ব্যয়ের খাত / শিরোনাম *</label>
                    <input
                      type="text"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      placeholder="যেমন: খেজুর ও ফলমূল / বিরিয়ানি"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">পরিমাণ (৳) *</label>
                    <input
                      type="number"
                      min="1"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="যেমন: ১২০০"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                    <input
                      type="text"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      placeholder="যেমন: ইফতার সামগ্রী / খাবার / সরঞ্জাম"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">তারিখ</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  {/* Document & Receipt Attachments (PNG, JPG, WebP, PDF up to 5MB) */}
                  <div className="sm:col-span-2 md:col-span-3 p-3 bg-white rounded-xl border border-rose-200/80 space-y-2">
                    <label className="block font-bold text-slate-800 text-xs">
                      খরচের রসিদ/প্রমাণপত্র (ঐচ্ছিক)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      ভাউচার, ক্যাশ মেমো, রসিদ বা বিলের ছবি বা পিডিএফ আপলোড করুন (PNG, JPG, WebP, PDF — সর্বোচ্চ ৫MB)
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>ফাইল বাছাই করুন</span>
                        <input
                          type="file"
                          multiple
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          onChange={(e) => handleAttachmentUpload(e)}
                          className="hidden"
                          disabled={isProcessingFiles}
                        />
                      </label>
                      {isProcessingFiles && (
                        <span className="text-xs text-slate-500 italic">প্রসেসিং হচ্ছে...</span>
                      )}
                    </div>

                    {/* Previews of currently selected attachments */}
                    {expenseAttachments.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                        {expenseAttachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-rose-50/60 border border-rose-200 text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {att.fileType.startsWith('image/') ? (
                                <img
                                  src={att.url}
                                  alt=""
                                  className="w-7 h-7 object-cover rounded shrink-0 border border-rose-200"
                                />
                              ) : (
                                <FileText className="w-5 h-5 text-rose-700 shrink-0" />
                              )}
                              <div className="overflow-hidden">
                                <span className="font-semibold text-slate-800 block truncate max-w-[130px]" title={att.name}>
                                  {att.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {(att.fileSize / 1024).toFixed(0)} KB
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachmentFromNewExpense(att.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="মুছুন"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Optional Web Link */}
                    <div className="pt-2">
                      <span className="text-[11px] text-slate-500 block mb-1">অথবা ওয়েব লিংক দিন (ঐচ্ছিক):</span>
                      <input
                        type="url"
                        value={expenseReceiptUrl}
                        onChange={(e) => setExpenseReceiptUrl(e.target.value)}
                        placeholder="https://... (ভাউচার বা ক্যাশ মেমোর লিংক)"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-rose-200">
                  <button
                    onClick={() => {
                      setIsAddingExpense(false);
                      setExpenseAttachments([]);
                    }}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSaveExpense}
                    className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold"
                  >
                    যোগ করুন
                  </button>
                </div>
              </div>
            )}

            {/* Expenses Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">ব্যয়ের খাত</th>
                    <th className="py-2.5 px-3">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">প্রমাণপত্র / রসিদ</th>
                    <th className="py-2.5 px-3 text-right">পরিমাণ (৳)</th>
                    <th className="py-2.5 px-3 text-center">মুছুন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeFund.expenses || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        এখনো কোনো ব্যয়ের রেকর্ড নেই।
                      </td>
                    </tr>
                  ) : (
                    (activeFund.expenses || []).map((exp, idx) => {
                      const attCount = (exp.attachments || []).length;
                      return (
                        <tr key={exp.id || idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {exp.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {exp.date || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {attCount > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingAttachments({
                                    expenseTitle: exp.title,
                                    attachments: exp.attachments || [],
                                    expenseId: exp.id,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-md border border-rose-200 text-[11px] font-semibold transition-colors"
                              >
                                <Paperclip className="w-3 h-3 text-rose-700" />
                                <span>{attCount}টি প্রমাণপত্র</span>
                              </button>
                            ) : exp.receiptUrl ? (
                              <a
                                href={exp.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>রসিদ লিংক</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingAttachments({
                                    expenseTitle: exp.title,
                                    attachments: [],
                                    expenseId: exp.id,
                                  })
                                }
                                className="text-[11px] text-slate-400 hover:text-rose-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>যুক্ত করুন</span>
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                            ৳ {exp.amount}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ramadan Template Preview Modal */}
      {showRamadanTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 font-serif text-lg">
                  রমজান ইফতার মাহফিল ২০২৬ হিসাব প্রিভিউ ও সংরক্ষণ
                </h3>
              </div>
              <button
                onClick={() => setShowRamadanTemplateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
              <p className="font-bold">সঠিক গাণিতিক হিসাব বিবরণী (Reconciliation Summary):</p>
              <p>
                • <strong>মোট সংগৃহীত নগদ টাকা:</strong> ৳১০,৯০০ (জলিল ২০০০ + দাউদ ও শরীফ ১৫০০ + করিম ১০০০ + ১০ জন প্রতিজন ৫০০ করে ৫০০০ + মোবাশ্বের ও তোফাজ্জল ৫০০ + ২ জন প্রতিজন ৩০০ করে ৬০০ + ৩ জন প্রতিজন ১০০ করে ৩০০)
              </p>
              <p>
                • <strong>মোট কর্মসূচি ব্যয়:</strong> ৳৭,৫৬০ (খেজুর ১২০০ + তরমুজ/আপেল ১২৮০ + বুট/মুড়ি ১৫০০ + জিলাপি/মিষ্টি ১১৪০ + পেঁয়াজু/চপ ৮০০ + প্লেট/গ্লাস ৭৭০ + বরফ/শরবত ৩০০ + বাবুর্চি ২০০ + লেবু/শসা ৯০ + মশলা ১০০ + অন্যান্য ১৩০ + পরিচ্ছন্নতা ৫০)
              </p>
              <p>
                • <strong>অবশিষ্ট নিট উদ্বৃত্ত:</strong> ৳১০,৯০০ − ৳৭,৫৬০ = <span className="text-emerald-700 font-bold">৳৩,৩৪০</span>
              </p>
              <p>
                • <strong>পণ্য/মালামাল অনুদান (ইন-কাইন্ড):</strong> হান্নান ভাই (ট্যাং ৪০০) + নূর ইসলাম কাকা (সবজি ১৫০) = ৳৫৫০ (নগদ উদ্বৃত্তে মেশানো হয়নি, আলাদা প্রদর্শিত)
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowRamadanTemplateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={handleImportRamadanTemplate}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>নিশ্চিত করে তহবিলটি ডাটাবেজে সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Attachment Manager Modal for Existing Expense */}
      {viewingAttachments && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-rose-700" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  খরচের প্রমাণপত্র ও রসিদ: {viewingAttachments.expenseTitle}
                </h3>
              </div>
              <button
                onClick={() => setViewingAttachments(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of attachments */}
            {viewingAttachments.attachments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">এখনো কোনো রসিদ বা ভাউচার আপলোড করা হয়নি।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {viewingAttachments.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div className="flex items-start gap-2.5 overflow-hidden">
                      {att.fileType.startsWith('image/') ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                          title="বড় করে দেখতে ক্লিক করুন"
                        >
                          <img
                            src={att.url}
                            alt=""
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-rose-700" />
                        </div>
                      )}
                      <div className="overflow-hidden flex-1">
                        <span className="font-bold text-slate-900 block truncate" title={att.name}>
                          {att.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {(att.fileSize / 1024).toFixed(0)} KB • {att.fileType.includes('pdf') ? 'PDF ডকুমেন্ট' : 'ছবি'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(att.uploadedAt).toLocaleDateString('bn-BD')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>দেখুন / ডাউনলোড</span>
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteAttachmentFromExistingExpense(
                            viewingAttachments.expenseId,
                            att.id
                          )
                        }
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছুন</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Upload More */}
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-2">
              <span className="text-xs font-bold text-rose-900 block">
                + এই ব্যয়ের জন্য নতুন রসিদ/প্রমাণপত্র যোগ করুন
              </span>
              <p className="text-[11px] text-slate-500">
                ভাউচার বা ক্যাশ মেমো সিলেক্ট করুন (PNG, JPG, WebP, PDF — সর্বোচ্চ ৫MB)
              </p>
              <div className="flex items-center gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>ফাইল আপলোড করুন</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(e) => handleAttachmentUpload(e, viewingAttachments.expenseId)}
                    className="hidden"
                    disabled={isProcessingFiles}
                  />
                </label>
                {isProcessingFiles && (
                  <span className="text-xs text-slate-500 italic">প্রসেসিং হচ্ছে...</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewingAttachments(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
