// First level: typographic tabs on a hairline (Work and Blog). Second level: quiet chips under them.
export const groupTabClassName = (isActive: boolean) =>
    `-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 text-[15px] font-medium transition-colors ${isActive
        ? 'border-[#4169E1] text-[#111111]'
        : 'border-transparent text-[#888888] hover:text-[#111111]'
    }`;

export const categoryChipClassName = (isActive: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[14px] transition-colors ${isActive
        ? 'bg-[#4169E1]/10 font-semibold text-[#4169E1]'
        : 'font-medium text-[#666666] hover:bg-[#f5f5f5] hover:text-[#111111]'
    }`;
