'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import Image from 'next/image';

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,  // client snapshot: always mounted
    () => false  // server snapshot: never mounted
  );
}

interface TenetLogoProps {
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  className?: string;
}

export function TenetLogo({ size = 'md', iconOnly = false, className = '' }: TenetLogoProps) {
  const { theme } = useTheme();
  const mounted = useIsMounted();
  const isDark = mounted && theme === 'dark';

  const sizes = {
    sm: { icon: 32, text: 'text-sm' },
    md: { icon: 40, text: 'text-base' },
    lg: { icon: 52, text: 'text-xl' },
  };

  const s = sizes[size];
  const darkColor = isDark ? '#E2E8F0' : '#2C3E50';
  const accentColor = '#F97316';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo.png"
        alt="TenetBid Logo"
        width={s.icon}
        height={s.icon}
        className="flex-shrink-0 aspect-square object-cover rounded-lg shadow-sm"
        priority
        unoptimized
      />
      {!iconOnly && (
        <span className={`${s.text} font-bold tracking-tight whitespace-nowrap`} suppressHydrationWarning>
          <span style={{ color: darkColor }} suppressHydrationWarning>Ten</span>
          <span style={{ color: accentColor }} suppressHydrationWarning>ets</span>
        </span>
      )}
    </div>
  );
}
