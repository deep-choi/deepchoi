import React, { useEffect, useRef, useState } from 'react';
import { MarkdownToolbar } from './MarkdownToolbar';
import { RichEditor } from './RichEditor';
import { EntryEditorState } from '../hooks/useEntryEditor';
import { categoryLabel, CategoryRecord, EntryType } from '../services/categoryService';
import { linkifyHtml, normalizeEditorHtml } from '../utils/contentProcessor';
import { setupCarousel } from '../utils/carousel';
import { useSuspendSmoothScroll } from './SmoothScroll';
import { ContentType, secondaryTypeOf } from '../utils/entryPlacement';
import { lockIconPath } from './PrivateBadge';

const globeIconPath = 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418';

interface EntryEditorProps {
    state: EntryEditorState;
    heading: string;
    categories: CategoryRecord[];
    saving: boolean;
    saveLabel: string;
    onSave: () => void;
    onExit: () => void;
    onImageUpload: (file: File) => Promise<string>;
    onCoverUpload: (file: File) => Promise<string>;
    /** About/Contact pages only edit the title, subtitle and body. */
    isStaticPage?: boolean;
}

const inputClass = 'w-full rounded-lg border border-[#e5e5e5] bg-white text-[#111111] outline-none transition-all placeholder:text-[#aaaaaa] focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20';
const smallButtonClass = 'inline-flex h-8 items-center rounded-lg border border-[#e5e5e5] bg-white px-3 text-xs font-bold text-[#111111] transition-colors hover:bg-[#f5f5f5]';
const previewProseClass = 'markdown-body dual-prose prose prose-lg max-w-none prose-headings:text-[#111111] prose-p:text-[#2b2b2b] prose-strong:text-[#111111] prose-a:text-[#4169E1] prose-img:rounded-[8px] md:prose-img:rounded-[16px] prose-headings:m-0 prose-p:m-0 prose-ul:m-0 prose-ol:m-0 prose-li:m-0 prose-blockquote:m-0 prose-pre:m-0';

const formatTime = (value: number) =>
    new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const formatDateTime = (value: number) =>
    new Date(value).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const countCharacters = (html: string) =>
    html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z#0-9]+;/gi, 'x').replace(/\s+/g, '').length;

const FieldLabel: React.FC<{ label: React.ReactNode; htmlFor?: string; right?: React.ReactNode }> = ({ label, htmlFor, right }) => (
    <div className="mb-2 flex min-h-[20px] items-end justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-bold text-[#111111]">{label}</label>
        {right && <div className="text-xs font-medium text-[#888888]">{right}</div>}
    </div>
);

const ChipInput: React.FC<{
    id: string;
    values: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
}> = ({ id, values, onChange, placeholder }) => {
    const [draft, setDraft] = useState('');

    const commit = () => {
        const next = draft.split(',').map(value => value.trim()).filter(Boolean);
        if (next.length > 0) onChange(Array.from(new Set([...values, ...next])));
        setDraft('');
    };

    return (
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-2 py-1.5 transition-all focus-within:border-[#4169E1] focus-within:ring-2 focus-within:ring-[#4169E1]/20">
            {values.map(value => (
                <span key={value} className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#f2f3f5] pl-2.5 pr-1.5 text-xs font-bold text-[#111111]">
                    {value}
                    <button
                        type="button"
                        onClick={() => onChange(values.filter(item => item !== value))}
                        className="flex h-4 w-4 items-center justify-center rounded text-[#888888] hover:text-[#ff3b30]"
                        aria-label={`${value} 삭제`}
                    >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </span>
            ))}
            <input
                id={id}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        commit();
                    } else if (e.key === 'Backspace' && !draft && values.length > 0) {
                        onChange(values.slice(0, -1));
                    }
                }}
                className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-sm font-medium text-[#111111] outline-none placeholder:text-[#aaaaaa]"
                placeholder={values.length === 0 ? placeholder : '추가'}
            />
        </div>
    );
};

export const EntryEditor: React.FC<EntryEditorProps> = ({
    state,
    heading,
    categories,
    saving,
    saveLabel,
    onSave,
    onExit,
    onImageUpload,
    onCoverUpload,
    isStaticPage = false
}) => {
    const { form, update, syncContent, markEdited, dirty, editorKey, editorRef, pendingDraft, restoreDraft, discardDraft, flushDraft, draftSavedAt } = state;
    const [mode, setMode] = useState<'write' | 'preview'>('write');
    const [previewHtml, setPreviewHtml] = useState('');
    const [coverUploading, setCoverUploading] = useState(false);
    const [coverDragging, setCoverDragging] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;
    useSuspendSmoothScroll();

    const entryType: ContentType = form.type === 'blog' ? 'blog' : 'work';
    const secondaryType = secondaryTypeOf(form);
    // The primary type always comes first; it decides the URL, SEO type and editor label.
    const placements: ContentType[] = secondaryType ? [entryType, secondaryType] : [entryType];
    const typeName = (type: ContentType) => (type === 'work' ? 'Work' : 'Blog');
    const categoryOptionsFor = (type: ContentType) => categories.filter(category => category.type === type);
    const firstCategoryOf = (type: ContentType) => categoryOptionsFor(type)[0]?.name || (type === 'blog' ? 'AI' : 'UI UX');

    const togglePlacement = (type: ContentType) => update(prev => {
        const primary: ContentType = prev.type === 'blog' ? 'blog' : 'work';
        const secondary = secondaryTypeOf(prev);
        if (type !== primary && type !== secondary) {
            return { ...prev, secondaryType: type, secondaryCategory: firstCategoryOf(type) };
        }
        if (type === secondary) {
            return { ...prev, secondaryType: null, secondaryCategory: null };
        }
        // Removing the primary type promotes the secondary one.
        return secondary
            ? { ...prev, type: secondary, category: prev.secondaryCategory || firstCategoryOf(secondary), secondaryType: null, secondaryCategory: null }
            : prev;
    });

    const swapPrimary = () => update(prev => {
        const secondary = secondaryTypeOf(prev);
        if (!secondary) return prev;
        return {
            ...prev,
            type: secondary,
            category: prev.secondaryCategory || firstCategoryOf(secondary),
            secondaryType: prev.type === 'blog' ? 'blog' : 'work',
            secondaryCategory: prev.category || ''
        };
    });
    const characterCount = countCharacters(form.content || '');
    const readingMinutes = Math.max(1, Math.ceil(characterCount / 500));

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                onSaveRef.current();
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    useEffect(() => {
        if (mode !== 'preview' || !previewRef.current) return;
        const cleanups = Array.from(previewRef.current.querySelectorAll('.image-carousel'))
            .map(carousel => setupCarousel(carousel as HTMLElement));
        return () => cleanups.forEach(cleanup => cleanup());
    }, [mode, previewHtml]);

    const showPreview = () => {
        setPreviewHtml(linkifyHtml(normalizeEditorHtml(editorRef.current?.innerHTML || form.content || '')));
        setMode('preview');
        window.scrollTo({ top: 0 });
    };

    const handleExit = () => {
        if (dirty) {
            flushDraft();
            const leave = window.confirm('저장하지 않은 변경사항이 있어요. 편집을 끝낼까요?\n작성 중인 내용은 이 기기에 임시저장되어 다음에 불러올 수 있어요.');
            if (!leave) return;
        }
        onExit();
    };

    const uploadCover = async (file?: File | null) => {
        if (!file || !file.type.startsWith('image/')) return;
        setCoverUploading(true);
        try {
            const url = await onCoverUpload(file);
            update(prev => ({ ...prev, imageUrl: url }));
        } catch (error) {
            console.error('Cover image upload failed:', error);
            alert('커버 이미지 업로드에 실패했습니다.');
        } finally {
            setCoverUploading(false);
            if (coverInputRef.current) coverInputRef.current.value = '';
        }
    };

    const statusText = saving
        ? '저장 중…'
        : dirty
            ? (draftSavedAt ? `임시저장됨 ${formatTime(draftSavedAt)}` : '변경사항 있음')
            : '';

    return (
        <div className="min-h-screen bg-white pb-24 pt-[72px]">
            {/* Sticky action bar, sits under the fixed site navigation */}
            <div className="sticky top-[72px] z-30 border-b border-[#eeeeee] bg-white/95 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-[1000px] items-center justify-between gap-3 px-4 md:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={handleExit}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#2b2b2b] transition-colors hover:bg-[#f5f5f5]"
                            aria-label="편집 종료"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-[17px] font-bold tracking-tight text-[#111111]">{heading}</h1>
                            <p className="h-4 text-[11px] font-medium text-[#888888]" aria-live="polite">{statusText}</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {!isStaticPage && (
                            <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(form.isPrivate)}
                                aria-label="비공개"
                                onClick={() => update(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                                title={form.isPrivate
                                    ? '관리자에게만 보입니다. 누르면 공개로 바뀝니다.'
                                    : '누구나 볼 수 있습니다. 누르면 비공개로 바뀝니다.'}
                                className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors ${form.isPrivate
                                    ? 'border-[#111111] bg-[#111111] text-white hover:bg-[#333333]'
                                    : 'border-[#e5e5e5] bg-white text-[#444444] hover:bg-[#f5f5f5]'
                                    }`}
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={form.isPrivate ? lockIconPath : globeIconPath} />
                                </svg>
                                <span className="hidden sm:inline">{form.isPrivate ? '비공개' : '공개'}</span>
                            </button>
                        )}
                        <div className="flex rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-0.5" role="tablist" aria-label="보기 전환">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === 'write'}
                                onClick={() => setMode('write')}
                                className={`h-8 rounded-md px-3 text-xs font-bold transition-colors ${mode === 'write' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'}`}
                            >
                                편집
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === 'preview'}
                                onClick={showPreview}
                                className={`h-8 rounded-md px-3 text-xs font-bold transition-colors ${mode === 'preview' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'}`}
                            >
                                미리보기
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={saving}
                            title="Ctrl+S"
                            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#4169E1] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3458c7] disabled:opacity-60"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" /></svg>
                            {saveLabel}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1000px] px-4 pt-8 md:px-6">
                {pendingDraft && (
                    <div role="status" className="mb-6 flex flex-col gap-3 rounded-xl border border-[#4169E1]/25 bg-[#f7f9ff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-[#2b2b2b]">
                            이 기기에 임시저장된 글이 있어요 <span className="text-[#888888]">({formatDateTime(pendingDraft.savedAt)})</span>
                        </p>
                        <div className="flex shrink-0 gap-2">
                            <button type="button" onClick={discardDraft} className={smallButtonClass}>삭제</button>
                            <button type="button" onClick={restoreDraft} className="inline-flex h-8 items-center rounded-lg bg-[#4169E1] px-3 text-xs font-bold text-white hover:bg-[#3458c7]">불러오기</button>
                        </div>
                    </div>
                )}

                {mode === 'preview' && (
                    <article>
                        <header className="mb-10 text-center">
                            <h1 className="mb-3 text-[28px] font-semibold leading-[1.2] tracking-tight text-[#111111] md:text-[40px]">{form.title || '제목 없음'}</h1>
                            {form.subtitle && <p className="mb-4 text-[18px] font-medium leading-[1.4] text-[#666666] md:text-[22px]">{form.subtitle}</p>}
                            {!isStaticPage && <p className="text-[15px] font-medium text-[#666666]">{form.date}</p>}
                        </header>
                        {!isStaticPage && form.imageUrl && (
                            <img src={form.imageUrl} alt="" className="mb-16 w-full rounded-[8px] md:rounded-[16px]" />
                        )}
                        <div ref={previewRef} className={previewProseClass} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </article>
                )}

                <div className={mode === 'preview' ? 'hidden' : 'space-y-6'}>
                    {!isStaticPage && (
                        <section>
                            <FieldLabel
                                label="커버 이미지"
                                right={form.imageUrl ? (
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => coverInputRef.current?.click()} className={smallButtonClass}>변경</button>
                                        <button type="button" onClick={() => update(prev => ({ ...prev, imageUrl: '' }))} className={`${smallButtonClass} text-[#ff3b30]`}>삭제</button>
                                    </div>
                                ) : '권장 1600×500 · 5MB 이하'}
                            />
                            <div
                                role="button"
                                tabIndex={0}
                                aria-label={form.imageUrl ? '커버 이미지 변경' : '커버 이미지 추가'}
                                onClick={() => coverInputRef.current?.click()}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        coverInputRef.current?.click();
                                    }
                                }}
                                onDragOver={e => { e.preventDefault(); setCoverDragging(true); }}
                                onDragLeave={() => setCoverDragging(false)}
                                onDrop={e => {
                                    e.preventDefault();
                                    setCoverDragging(false);
                                    void uploadCover(e.dataTransfer.files?.[0]);
                                }}
                                className={`relative flex aspect-[16/5] min-h-[150px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border transition-colors ${form.imageUrl
                                    ? 'border-[#e5e5e5]'
                                    : coverDragging
                                        ? 'border-dashed border-[#4169E1] bg-[#f7f9ff]'
                                        : 'border-dashed border-[#d4d4d4] bg-[#fafafa] hover:border-[#4169E1] hover:bg-[#f7f9ff]'
                                    }`}
                            >
                                {form.imageUrl ? (
                                    <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <svg className="mx-auto h-7 w-7 text-[#888888]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                                        <p className="mt-2 text-sm font-bold text-[#2b2b2b]">클릭하거나 이미지를 끌어다 놓으세요</p>
                                    </div>
                                )}
                                {coverUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#4169E1] border-t-transparent"></div>
                                    </div>
                                )}
                            </div>
                            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => void uploadCover(e.target.files?.[0])} />
                        </section>
                    )}

                    <section>
                        <FieldLabel label="제목" htmlFor="entry-title" right={`${(form.title || '').length}/100`} />
                        <input
                            id="entry-title"
                            value={form.title || ''}
                            maxLength={100}
                            onChange={e => update(prev => ({ ...prev, title: e.target.value }))}
                            className={`${inputClass} h-14 px-4 text-[22px] font-bold tracking-tight md:text-[24px]`}
                            placeholder="제목을 입력하세요"
                        />
                    </section>

                    <section>
                        <FieldLabel label={<>설명 <span className="font-medium text-[#888888]">(선택)</span></>} htmlFor="entry-subtitle" right={`${(form.subtitle || '').length}/200`} />
                        <textarea
                            id="entry-subtitle"
                            value={form.subtitle || ''}
                            maxLength={200}
                            rows={2}
                            onChange={e => update(prev => ({ ...prev, subtitle: e.target.value }))}
                            className={`${inputClass} resize-none px-4 py-3 text-[15px] leading-relaxed`}
                            placeholder="목록과 검색 결과에 보이는 한두 문장 요약"
                        />
                    </section>

                    {!isStaticPage && (
                        <section className="grid gap-4 md:grid-cols-3">
                            <div>
                                <FieldLabel
                                    label="게시 위치"
                                    right={secondaryType ? (
                                        <button
                                            type="button"
                                            onClick={swapPrimary}
                                            title="기본 유형은 글 주소와 검색 노출 형식의 기준이 됩니다."
                                            className="font-bold text-[#4169E1] hover:underline"
                                        >
                                            기본 {typeName(entryType)} · 바꾸기
                                        </button>
                                    ) : '둘 다 선택 가능'}
                                />
                                <div className="grid h-11 grid-cols-2 gap-1 rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-1" role="group" aria-label="게시 위치">
                                    {(['work', 'blog'] as ContentType[]).map(type => {
                                        const selected = placements.includes(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                role="checkbox"
                                                aria-checked={selected}
                                                onClick={() => {
                                                    if (selected && placements.length === 1) return; // keep at least one
                                                    togglePlacement(type);
                                                }}
                                                className={`flex items-center justify-center gap-1.5 rounded-md text-sm font-bold transition-colors ${selected ? 'bg-white text-[#111111] shadow-sm' : 'text-[#888888] hover:text-[#111111]'}`}
                                            >
                                                <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-[#4169E1] bg-[#4169E1] text-white' : 'border-[#cccccc] bg-white'}`} aria-hidden="true">
                                                    {selected && (
                                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                    )}
                                                </span>
                                                {typeName(type)}
                                                {secondaryType && type === entryType && (
                                                    <span className="rounded bg-[#eef2ff] px-1 text-[10px] font-bold text-[#4169E1]">기본</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <FieldLabel label="카테고리" htmlFor={`entry-category-${entryType}`} />
                                <div className={`grid gap-2 ${placements.length > 1 ? 'grid-cols-2' : ''}`}>
                                    {placements.map((type, index) => {
                                        const value = (index === 0 ? form.category : form.secondaryCategory) || '';
                                        const options = categoryOptionsFor(type);
                                        return (
                                            <div key={type} className="relative">
                                                {placements.length > 1 && (
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#888888]">{typeName(type)}</span>
                                                )}
                                                <select
                                                    id={`entry-category-${type}`}
                                                    aria-label={`${typeName(type)} 카테고리`}
                                                    value={value}
                                                    onChange={e => {
                                                        const next = e.target.value;
                                                        update(prev => (index === 0 ? { ...prev, category: next } : { ...prev, secondaryCategory: next }));
                                                    }}
                                                    className={`${inputClass} h-11 pr-2 text-sm font-bold ${placements.length > 1 ? 'pl-12' : 'pl-3'}`}
                                                >
                                                    {!options.some(option => option.name === value) && <option value={value}>{categoryLabel(value)}</option>}
                                                    {options.map(category => (
                                                        <option key={category.id} value={category.name}>{categoryLabel(category.name)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <FieldLabel label="공개일" htmlFor="entry-date" />
                                <input
                                    id="entry-date"
                                    type="date"
                                    value={form.date || ''}
                                    onChange={e => update(prev => ({ ...prev, date: e.target.value }))}
                                    className={`${inputClass} h-11 px-3 text-sm font-bold`}
                                />
                            </div>
                        </section>
                    )}

                    {!isStaticPage && (
                        <section className={`grid gap-4 ${placements.includes('work') ? 'md:grid-cols-2' : ''}`}>
                            <div>
                                <FieldLabel label="태그" htmlFor="entry-tags" right="Enter 또는 쉼표로 추가" />
                                <ChipInput
                                    id="entry-tags"
                                    values={form.tags || []}
                                    onChange={tags => update(prev => ({ ...prev, tags }))}
                                    placeholder="예: Claude, UI UX"
                                />
                            </div>
                            {placements.includes('work') && (
                                <div>
                                    <FieldLabel label="기술 스택" htmlFor="entry-tech" />
                                    <ChipInput
                                        id="entry-tech"
                                        values={form.tech || []}
                                        onChange={tech => update(prev => ({ ...prev, tech }))}
                                        placeholder="예: Figma, React"
                                    />
                                </div>
                            )}
                        </section>
                    )}

                    <section>
                        <FieldLabel
                            label="본문"
                            right={`${characterCount.toLocaleString('ko-KR')}자 · 약 ${readingMinutes}분 분량`}
                        />
                        <div className="sticky top-[136px] z-20 bg-white pb-3">
                            <MarkdownToolbar onImageUpload={onImageUpload} />
                        </div>
                        <RichEditor
                            key={editorKey}
                            editorRef={editorRef}
                            initialContent={form.content || ''}
                            onContentChange={syncContent}
                            onUserEdit={markEdited}
                        />
                    </section>
                </div>
            </div>
        </div>
    );
};
