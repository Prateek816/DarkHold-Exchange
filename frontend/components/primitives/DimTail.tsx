'use client';

import React from 'react';

interface DimTailProps {
  value: string | number;
  dimDigits?: number;
  className?: string;
}

/**
 * DimTail renders a numeric string with its last three digits
 * at 45% opacity (--dim) as specified in Section 3 & 5.
 * Presentation only; numeric data is untouched.
 */
export function DimTail({ value, dimDigits = 3, className = '' }: DimTailProps) {
  const str = typeof value === 'number' ? value.toString() : value;
  
  if (str.length <= dimDigits) {
    return <span className={`tabular ${className}`}>{str}</span>;
  }

  const head = str.slice(0, -dimDigits);
  const tail = str.slice(-dimDigits);

  return (
    <span className={`tabular inline-flex items-baseline ${className}`}>
      <span>{head}</span>
      <span className="opacity-45 text-[var(--dim)] select-all">{tail}</span>
    </span>
  );
}

/**
 * UnitSuffix renders the unit, currency, or percent sign
 * at 60% size and muted color.
 */
export function UnitSuffix({ suffix, className = '' }: { suffix: string; className?: string }) {
  return (
    <span className={`text-[0.6em] text-[var(--muted)] font-normal ml-1 ${className}`}>
      {suffix}
    </span>
  );
}
