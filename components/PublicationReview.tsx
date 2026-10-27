import React from 'react';

interface Props {
    title: string;
    category: string;
    date: string;
    editing?: boolean;
    saving: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const validPublicationDate = (date: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

export const PublicationReview: React.FC<Props> = ({ title, category, date, editing, saving, onCancel, onConfirm }) => {
    const valid = Boolean(title.trim() && category.trim() && validPublicationDate(date));
    return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="publication-review-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="publication-review-title" className="text-xl font-bold">{editing ? '저장할 내용 확인' : '게시할 내용 확인'}</h2>
            <dl className="mt-5 space-y-3 text-sm">
                <div><dt className="text-[#666]">제목</dt><dd className="mt-1 font-semibold break-words">{title || '제목을 입력해 주세요.'}</dd></div>
                <div><dt className="text-[#666]">카테고리</dt><dd className="mt-1 font-semibold">{category || '카테고리를 선택해 주세요.'}</dd></div>
                <div><dt className="text-[#666]">표시할 공개일</dt><dd className="mt-1 font-semibold">{date || '날짜를 입력해 주세요.'}</dd></div>
            </dl>
            <p className="mt-4 text-sm text-[#666]">이 날짜는 글에 표시되는 날짜입니다. 미래 날짜를 선택해도 예약 게시되지 않고 즉시 공개됩니다.</p>
            {!valid && <p role="alert" className="mt-3 text-sm text-red-600">제목, 카테고리와 올바른 날짜를 확인해 주세요.</p>}
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">돌아가기</button>
                <button type="button" disabled={saving || !valid} onClick={onConfirm} className="rounded-lg bg-[#4169E1] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{saving ? '저장 중…' : editing ? '저장하기' : '게시하기'}</button>
            </div>
        </div>
    </div>;
};
