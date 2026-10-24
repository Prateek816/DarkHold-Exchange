'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { sound } from '@/lib/sound';

interface AccordionRowProps {
  title: string;
  subtitle: string;
  rightBadge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AccordionRow({
  title,
  subtitle,
  rightBadge,
  children,
  defaultOpen = false,
}: AccordionRowProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = () => {
    sound.playClick();
    setIsOpen(!isOpen);
  };

  return (
    <div className="border-b border-[var(--line-soft)] last:border-b-0 transition-colors">
      <button
        type="button"
        onClick={toggle}
        className="w-full py-3.5 px-4 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-lg group"
      >
        <div className="flex flex-col">
          <span className="text-[15px] font-medium text-[var(--text)] group-hover:text-white transition-colors">
            {title}
          </span>
          <span className="text-[12px] text-[var(--muted)] mt-0.5">
            {subtitle}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {rightBadge}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--text)] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <ChevronDown size={15} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 animate-reveal">
          {children}
        </div>
      )}
    </div>
  );
}
