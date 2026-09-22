import React from 'react';

interface ActivityCardSkeletonProps {
  cardStyle?: React.CSSProperties;
}

export const ActivityCardSkeleton: React.FC<ActivityCardSkeletonProps> = ({ cardStyle }) => {
  return (
    <div
      style={cardStyle}
      className="snap-start shrink-0 flex flex-col justify-between bg-white rounded-2xl border border-[#EBE8E0] shadow-3xs overflow-hidden animate-pulse select-none"
    >
      <div>
        {/* Cover Skeleton */}
        <div className="h-40 sm:h-44 w-full bg-[#EBE8E0]/60" />

        {/* Content Skeleton */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 bg-[#EBE8E0] rounded-md" />
            <div className="h-3 w-14 bg-[#EBE8E0] rounded-md" />
          </div>
          <div className="h-4 w-3/4 bg-[#EBE8E0] rounded-md" />
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full bg-[#EBE8E0]/70 rounded-md" />
            <div className="h-3 w-5/6 bg-[#EBE8E0]/70 rounded-md" />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-[#EBE8E0]/70 flex items-center justify-between">
        <div className="h-4 w-20 bg-[#EBE8E0] rounded-md" />
        <div className="h-3 w-3 bg-[#EBE8E0] rounded-full" />
      </div>
    </div>
  );
};
