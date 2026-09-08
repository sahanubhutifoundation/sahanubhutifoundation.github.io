import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  subMessage?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  subMessage,
  icon,
  actionText,
  onAction,
  className = '',
}) => {
  const { t } = useLanguage();

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl bg-white/70 border border-stone-200/80 shadow-xs max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3.5">
        {icon || <Inbox className="w-6 h-6 stroke-[1.5]" />}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-slate-800 leading-snug">
        {message || t('emptyData')}
      </h3>
      {subMessage && (
        <p className="text-xs sm:text-sm text-stone-500 max-w-sm mt-1.5 leading-relaxed">
          {subMessage}
        </p>
      )}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
