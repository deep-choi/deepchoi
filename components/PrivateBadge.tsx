import React from 'react';

export const lockIconPath = 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z';

/** Marks entries only the admin can see. */
export const PrivateBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
    <span className={`inline-flex items-center gap-1 rounded-md bg-[#111111]/80 px-2 py-0.5 text-[11px] font-bold text-white ${className}`}>
        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={lockIconPath} />
        </svg>
        비공개
    </span>
);
