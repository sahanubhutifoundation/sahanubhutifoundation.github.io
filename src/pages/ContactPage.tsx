import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { FoundationLocationDisplay } from '../components/FoundationLocationDisplay';
import { storageService } from '../services/storageService';
import {
  Mail,
  Facebook,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Calendar,
  HeartHandshake,
  Clock,
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { t, language } = useLanguage();
  const [config] = useState(storageService.getConfig());

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      // Save directly to admin inbox
      storageService.saveContactMessage({
        name: name.trim(),
        email: email.trim(),
        senderName: name.trim(),
        senderEmail: email.trim(),
        senderPhone: phone.trim() || undefined,
        phone: phone.trim() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim(),
      });

      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error('Contact submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      <PageHero
        title={t('contactTitle')}
        subtitle={t('contactSubtitle')}
        breadcrumb={[{ label: t('navContact') }]}
        tag="সরাসরি সংযোগ"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Col (5 cols): Direct channels & location */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#2D3630]">
                  {t('directContactTitle')}
                </h2>
                <div className="h-[2px] w-10 bg-[#2D5A41] rounded-full mt-1.5" />
                <p className="text-xs sm:text-sm text-[#5C665F] mt-2 leading-relaxed">
                  {language === 'bn'
                    ? 'আমাদের সাথে যেকোনো সময় ইমেইল বা ফেসবুকের মাধ্যমে যোগাযোগ করতে পারেন।'
                    : 'Feel free to reach out to us at any time via email or our official Facebook channel.'}
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* Official Email */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
                  <div className="w-8 h-8 rounded-lg bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#7A877E] block text-[11px] font-semibold">
                      {t('officialEmail')}
                    </span>
                    <a
                      href={`mailto:${config.email}`}
                      className="font-mono font-medium text-[#2D5A41] hover:underline break-all"
                    >
                      {config.email}
                    </a>
                  </div>
                </div>

                {/* Facebook Page */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
                  <div className="w-8 h-8 rounded-lg bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center shrink-0">
                    <Facebook className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#7A877E] block text-[11px] font-semibold">
                      {t('officialFacebook')}
                    </span>
                    <a
                      href={config.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#2D3630] hover:text-[#2D5A41] hover:underline text-xs"
                    >
                      facebook.com/profile (সহানুভূতি ফাউন্ডেশন)
                    </a>
                  </div>
                </div>

                {/* Phone - only displayed if configured and enabled */}
                {config.phone && config.showPhone !== false && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
                    <div className="w-8 h-8 rounded-lg bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[#7A877E] block text-[11px] font-semibold">
                        {t('phoneLabel')}
                      </span>
                      <a
                        href={`tel:${config.phone}`}
                        className="font-mono text-[#2D3630] font-semibold hover:text-[#2D5A41] transition-colors"
                      >
                        {config.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Physical Location */}
                <FoundationLocationDisplay config={config} variant="contact" />
              </div>
            </div>

            {/* Respectful message note */}
            <div className="p-5 rounded-2xl bg-[#F7F5F0] border border-[#EBE8E0] text-xs text-[#2D3630] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D3630]">
                <HeartHandshake className="w-4 h-4 text-[#2D5A41]" />
                <span>সদস্যপদ ও পরামর্শের জন্য</span>
              </div>
              <p className="leading-relaxed text-[#5C665F]">
                {language === 'bn'
                  ? 'আপনি যদি পরিবারের সদস্য হয়ে থাকেন এবং এখনো সংগঠনে যুক্ত না হয়ে থাকেন, তবে আপনার নাম ও পরিচয় লিখে বার্তা পাঠালে অ্যাডমিন প্যানেলে তা সরাসরি পৌঁছে যাবে।'
                  : 'If you are a family member and have not yet registered, sending your name and contact via this form directly notifies the administrator.'}
              </p>
            </div>
          </div>

          {/* Right Col (7 cols): Contact Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs">
              <h2 className="text-lg font-bold text-[#2D3630] mb-1">
                {language === 'bn' ? 'আমাদের বার্তা পাঠান' : 'Send Us a Message'}
              </h2>
              <p className="text-xs sm:text-sm text-[#5C665F] mb-6">
                {language === 'bn'
                  ? 'ফর্মটি পূরণ করে সাবমিট করলে এটি সরাসরি অ্যাডমিন ইনবক্সে সংরক্ষিত হবে।'
                  : 'Submitting this form stores your inquiry directly in our administrator inbox.'}
              </p>

              {submitted ? (
                <div className="p-6 rounded-xl bg-[#E8EFEA] border border-[#2D5A41]/20 text-center space-y-3 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-white text-[#2D5A41] mx-auto flex items-center justify-center shadow-2xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#234733]">
                    {t('contactSuccessMessage')}
                  </h3>
                  <p className="text-xs text-[#2D5A41] max-w-md mx-auto">
                    আপনার প্রেরিত বার্তাটি নিরাপদে সংরক্ষিত হয়েছে। ইনশাআল্লাহ দ্রুত যোগাযোগ করা হবে।
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#2D5A41] text-white hover:bg-[#234733] transition-colors"
                  >
                    আরেকটি বার্তা পাঠান
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#2D3630] mb-1">
                      {t('contactFormName')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="যেমন: মোহাম্মদ আবদুল্লাহ"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-sm text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2D3630] mb-1">
                        {t('contactFormEmail')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-sm text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#2D3630] mb-1">
                        {t('contactFormPhone')}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880 1..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-sm text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-[#2D3630] mb-1">
                      {t('contactFormSubject')}
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="যেমন: সদস্য হওয়ার আবেদন / আর্থিক পরামর্শ"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-sm text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold text-[#2D3630] mb-1">
                      {t('contactFormMessage')} <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="আপনার বার্তা বিস্তারিত লিখুন..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-sm text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41] resize-y"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] shadow-2xs transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? t('contactFormSubmitting') : t('contactFormSubmit')}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
