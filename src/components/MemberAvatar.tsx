import React from 'react';
import { User, Users } from 'lucide-react';
import { Member, FoundationConfig } from '../types';

interface MemberAvatarProps {
  member: Member;
  config?: FoundationConfig;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  config,
  size = 'md',
  className = '',
}) => {
  const shape = member.imageShape || config?.memberImageShape || 'circle';

  const shapeClass =
    shape === 'square'
      ? 'rounded-xs sm:rounded-sm'
      : shape === 'rounded'
      ? 'rounded-2xl'
      : 'rounded-full';

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16 sm:w-20 sm:h-20',
    lg: 'w-20 h-20 sm:w-24 sm:h-24',
    xl: 'w-28 h-28 sm:w-32 sm:h-32',
  };

  const zoom = member.cropZoom || 1;
  const cropX = member.cropX || 0;
  const cropY = member.cropY || 0;

  const imageTransform = `scale(${zoom}) translate(${cropX}%, ${cropY}%)`;

  return (
    <div
      className={`${sizeClasses[size]} ${shapeClass} bg-[#F7F5F0] border-2 border-[#EBE8E0] group-hover:border-[#2D5A41]/50 flex items-center justify-center text-[#7A877E] overflow-hidden shrink-0 transition-all duration-200 shadow-2xs relative ${className}`}
    >
      {member.photoUrl ? (
        <div className="w-full h-full overflow-hidden flex items-center justify-center">
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-full h-full object-cover transition-transform duration-200"
            style={{
              transform: imageTransform,
              transformOrigin: 'center center',
              objectPosition: member.imagePosition || 'center',
            }}
            loading="lazy"
          />
        </div>
      ) : size === 'sm' ? (
        <User className="w-6 h-6 text-[#A8B3AA]" />
      ) : size === 'xl' ? (
        <User className="w-14 h-14 text-[#A8B3AA]" />
      ) : (
        <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[#A8B3AA] group-hover:text-[#2D5A41] transition-colors" />
      )}
    </div>
  );
};
