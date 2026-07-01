import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryLabel, categoryService, EntryType } from '../services/categoryService';

interface AdminSummary {
    user: {
        name: string;
        email: string;
        role: 'admin' | 'user';
    };
    totals: {
        totalEntries: number;
        workEntries: number;
        blogEntries: number;
        pageEntries: number;
        categoryCount: number;
        totalComments: number;
    };
    recentEntries: Array<{
        id: string;
        title: string;
        category: string;
        type?: 'work' | 'blog' | 'page';
        date: string;
    }>;
    categories: Array<{
        id: string;
        name: string;
        category: string;
        type: EntryType;
        sortOrder: number;
        entryCount: number;
    }>;
    analytics: {
        totalViews: number;
        uniqueVisitors: number;
        todayViews: number;
        topEntries: Array<{
            id: string;
            title: string;
            category: string;
            type?: 'work' | 'blog' | 'page';
            views: number;
            uniqueVisitors: number;
            lastViewedAt?: string;
        }>;
        dailyViews: Array<{
            day: string;
            views: number;
            uniqueVisitors: number;
        }>;
        popularPaths: Array<{
            path: string;
            views: number;
            uniqueVisitors: number;
            lastViewedAt?: string;
        }>;
    };
}

const numberFormat = new Intl.NumberFormat('ko-KR');

const formatNumber = (value: number): string => numberFormat.format(value);

const StatCard: React.FC<{ label: string; value: number | string; tone?: 'blue' | 'dark' | 'light' }> = ({
    label,
    value,
    tone = 'light'
}) => {
    const styles = {
        blue: 'border-[#4169E1]/20 bg-[#4169E1] text-white',
        dark: 'border-[#111111] bg-[#111111] text-white',
        light: 'border-[#e5e5e5] bg-white text-[#111111]'
    };

    return (
        <div className={`rounded-[8px] border p-5 ${styles[tone]}`}>
            <p className={`text-[12px] font-bold uppercase ${tone === 'light' ? 'text-[#666666]' : 'text-white/70'}`}>
                {label}
            </p>
            <p className="mt-4 text-3xl font-bold tracking-tight">{typeof value === 'number' ? formatNumber(value) : value}</p>
        </div>
    );
};

export const Admin: React.FC = () => {
    const [summary, setSummary] = useState<AdminSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [categoryName, setCategoryName] = useState('');
    const [categoryType, setCategoryType] = useState<EntryType>('work');
    const [editingCategoryId, setEditingCategoryId] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [actionError, setActionError] = useState('');
    const [isSavingCategory, setIsSavingCategory] = useState(false);

    const loadSummary = async (): Promise<AdminSummary> => {
        const res = await fetch('/api/admin/summary');
        if (!res.ok) {
            const payload = await res.json().catch(() => null) as { error?: string } | null;
            throw new Error(payload?.error || '관리자 정보를 불러오지 못했습니다.');
        }
        return res.json() as Promise<AdminSummary>;
    };

    const refreshSummary = async () => {
        setActionError('');
        const data = await loadSummary();
        setSummary(data);
    };

    useEffect(() => {
        let isMounted = true;

        loadSummary()
            .then(data => {
                if (isMounted) setSummary(data);
            })
            .catch(err => {
                if (isMounted) setError(err instanceof Error ? err.message : '관리자 정보를 불러오지 못했습니다.');
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const maxDailyViews = useMemo(() => {
        const values = summary?.analytics.dailyViews.map(item => item.views) || [];
        return Math.max(1, ...values);
    }, [summary?.analytics.dailyViews]);

    const handleCreateCategory = async (event: React.FormEvent) => {
        event.preventDefault();
        const name = categoryName.trim();
        if (!name) return;

        setIsSavingCategory(true);
        setActionError('');
        try {
            await categoryService.createCategory(name, categoryType);
            setCategoryName('');
            await refreshSummary();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : '카테고리 생성에 실패했습니다.');
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleUpdateCategory = async (categoryId: string) => {
        const name = editingCategoryName.trim();
        if (!name) return;

        setIsSavingCategory(true);
        setActionError('');
        try {
            await categoryService.updateCategory(categoryId, { name });
            setEditingCategoryId('');
            setEditingCategoryName('');
            await refreshSummary();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : '카테고리 수정에 실패했습니다.');
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (categoryId: string, entryCount: number) => {
        if (entryCount > 0) {
            setActionError('콘텐츠가 연결된 카테고리는 삭제할 수 없습니다. 먼저 글을 다른 카테고리로 옮겨주세요.');
            return;
        }
        if (!window.confirm('이 카테고리를 삭제할까요?')) return;

        setIsSavingCategory(true);
        setActionError('');
        try {
            await categoryService.deleteCategory(categoryId);
            await refreshSummary();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : '카테고리 삭제에 실패했습니다.');
        } finally {
            setIsSavingCategory(false);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#ffffff] px-4 pt-32 md:px-[20px]">
                <div className="mx-auto flex min-h-[420px] max-w-[1200px] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4169E1] border-t-transparent"></div>
                </div>
            </main>
        );
    }

    if (error || !summary) {
        return (
            <main className="min-h-screen bg-[#ffffff] px-4 pt-32 md:px-[20px]">
                <div className="mx-auto max-w-[720px] rounded-[8px] border border-[#ff3b30]/20 bg-[#fff5f5] p-6 text-[#111111]">
                    <h1 className="text-xl font-bold">접근할 수 없습니다</h1>
                    <p className="mt-2 text-sm font-medium text-[#666666]">{error || '관리자 세션을 확인해 주세요.'}</p>
                    <Link
                        to="/login"
                        className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#111111] px-4 text-sm font-bold text-white"
                    >
                        로그인
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#ffffff] px-4 pb-20 pt-32 md:px-[20px]">
            <div className="mx-auto max-w-[1200px]">
                <div className="mb-8 flex flex-col gap-5 border-b border-[#e5e5e5] pb-8 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[12px] font-bold uppercase text-[#666666]">Admin</p>
                        <h1 className="mt-2 text-[32px] font-bold tracking-tight text-[#111111] md:text-[44px]">
                            관리자 페이지
                        </h1>
                        <p className="mt-2 text-[15px] font-medium text-[#666666]">{summary.user.name}님으로 로그인됨</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            to="/admin/create?type=work"
                            className="inline-flex h-10 items-center rounded-lg bg-[#4169E1] px-4 text-sm font-bold text-white"
                        >
                            프로젝트 작성
                        </Link>
                        <Link
                            to="/admin/create?type=blog"
                            className="inline-flex h-10 items-center rounded-lg border border-[#e5e5e5] bg-white px-4 text-sm font-bold text-[#111111]"
                        >
                            글 작성
                        </Link>
                    </div>
                </div>

                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <StatCard label="전체 방문" value={summary.analytics.totalViews} tone="dark" />
                    <StatCard label="오늘 방문" value={summary.analytics.todayViews} tone="blue" />
                    <StatCard label="순 방문자" value={summary.analytics.uniqueVisitors} />
                    <StatCard label="전체 콘텐츠" value={summary.totals.totalEntries} />
                    <StatCard label="카테고리" value={summary.totals.categoryCount} />
                    <StatCard label="댓글" value={summary.totals.totalComments} />
                </section>

                <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <div className="rounded-[8px] border border-[#e5e5e5] bg-white">
                        <div className="border-b border-[#e5e5e5] px-5 py-4">
                            <h2 className="text-sm font-bold text-[#111111]">최근 14일 방문 추이</h2>
                        </div>
                        <div className="flex h-[220px] items-end gap-2 px-5 py-5">
                            {summary.analytics.dailyViews.length === 0 ? (
                                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[#888888]">
                                    아직 수집된 방문 데이터가 없습니다.
                                </div>
                            ) : (
                                summary.analytics.dailyViews.map(item => (
                                    <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                        <div className="flex h-[150px] w-full items-end rounded-[6px] bg-[#f5f5f5]">
                                            <div
                                                className="w-full rounded-[6px] bg-[#4169E1]"
                                                style={{ height: `${Math.max(8, (item.views / maxDailyViews) * 100)}%` }}
                                                title={`${item.day}: ${formatNumber(item.views)} views`}
                                            />
                                        </div>
                                        <span className="max-w-full truncate text-[11px] font-bold text-[#666666]">{item.day.slice(5)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-[8px] border border-[#e5e5e5] bg-white">
                        <div className="border-b border-[#e5e5e5] px-5 py-4">
                            <h2 className="text-sm font-bold text-[#111111]">콘텐츠 구성</h2>
                        </div>
                        <div className="divide-y divide-[#f0f0f0] px-5">
                            {[
                                ['Work', summary.totals.workEntries],
                                ['Blog', summary.totals.blogEntries],
                                ['Page', summary.totals.pageEntries]
                            ].map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between py-4">
                                    <span className="text-sm font-bold text-[#666666]">{label}</span>
                                    <span className="text-2xl font-bold text-[#111111]">{formatNumber(Number(value))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[8px] border border-[#e5e5e5] bg-white">
                        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
                            <h2 className="text-sm font-bold text-[#111111]">게시글별 조회수</h2>
                            <span className="text-xs font-bold text-[#666666]">Views</span>
                        </div>
                        <div className="divide-y divide-[#f0f0f0]">
                            {summary.analytics.topEntries.map(entry => (
                                <div key={entry.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_90px_80px] md:items-center">
                                    <div>
                                        <Link to={`/post/${entry.id}`} className="text-sm font-bold text-[#111111] hover:text-[#4169E1]">
                                            {entry.title}
                                        </Link>
                                        <p className="mt-1 text-xs font-medium text-[#666666]">{categoryLabel(entry.category)} · {entry.type || 'work'}</p>
                                    </div>
                                    <span className="text-sm font-bold text-[#111111] md:text-right">{formatNumber(entry.views)}</span>
                                    <span className="text-xs font-bold text-[#666666] md:text-right">{formatNumber(entry.uniqueVisitors)} UV</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[8px] border border-[#e5e5e5] bg-white">
                        <div className="border-b border-[#e5e5e5] px-5 py-4">
                            <h2 className="text-sm font-bold text-[#111111]">경로별 방문</h2>
                        </div>
                        <div className="divide-y divide-[#f0f0f0]">
                            {summary.analytics.popularPaths.length === 0 ? (
                                <div className="px-5 py-12 text-center text-sm font-medium text-[#888888]">방문 데이터가 아직 없습니다.</div>
                            ) : (
                                summary.analytics.popularPaths.map(path => (
                                    <div key={path.path} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_90px_80px] md:items-center">
                                        <p className="truncate text-sm font-bold text-[#111111]">{path.path}</p>
                                        <span className="text-sm font-bold text-[#111111] md:text-right">{formatNumber(path.views)}</span>
                                        <span className="text-xs font-bold text-[#666666] md:text-right">{formatNumber(path.uniqueVisitors)} UV</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
                    <div className="rounded-[8px] border border-[#e5e5e5] bg-white">
                        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
                            <h2 className="text-sm font-bold text-[#111111]">최근 콘텐츠</h2>
                            <Link to="/work" className="text-xs font-bold text-[#4169E1]">보기</Link>
                        </div>
                        <div className="divide-y divide-[#f0f0f0]">
                            {summary.recentEntries.map(entry => (
                                <div key={entry.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_120px_100px_80px] md:items-center">
                                    <div>
                                        <p className="text-sm font-bold text-[#111111]">{entry.title}</p>
                                        <p className="mt-1 text-xs font-medium text-[#666666]">{entry.id}</p>
                                    </div>
                                    <span className="text-xs font-bold text-[#666666]">{categoryLabel(entry.category)}</span>
                                    <span className="text-xs font-bold uppercase text-[#666666]">{entry.type || 'work'}</span>
                                    <Link to={`/admin/edit/${entry.id}`} className="text-xs font-bold text-[#4169E1] md:text-right">
                                        편집
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[8px] border border-[#e5e5e5] bg-white">
                        <div className="border-b border-[#e5e5e5] px-5 py-4">
                            <h2 className="text-sm font-bold text-[#111111]">카테고리 관리</h2>
                        </div>
                        <form onSubmit={handleCreateCategory} className="grid gap-2 border-b border-[#e5e5e5] p-5 sm:grid-cols-[1fr_110px_80px]">
                            <input
                                value={categoryName}
                                onChange={event => setCategoryName(event.target.value)}
                                className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20"
                                placeholder="새 카테고리"
                            />
                            <select
                                value={categoryType}
                                onChange={event => setCategoryType(event.target.value as EntryType)}
                                className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1]"
                            >
                                <option value="work">Work</option>
                                <option value="blog">Blog</option>
                            </select>
                            <button
                                type="submit"
                                disabled={isSavingCategory || !categoryName.trim()}
                                className="h-10 rounded-lg bg-[#111111] px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d1d1d1]"
                            >
                                추가
                            </button>
                        </form>
                        {actionError && (
                            <div className="border-b border-[#ffd9d6] bg-[#fff5f5] px-5 py-3 text-xs font-bold text-[#ff3b30]">
                                {actionError}
                            </div>
                        )}
                        <div className="divide-y divide-[#f0f0f0]">
                            {summary.categories.map(category => (
                                <div key={category.id} className="px-5 py-4">
                                    {editingCategoryId === category.id ? (
                                        <div className="grid gap-2 sm:grid-cols-[1fr_72px_72px]">
                                            <input
                                                value={editingCategoryName}
                                                onChange={event => setEditingCategoryName(event.target.value)}
                                                className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateCategory(category.id)}
                                                disabled={isSavingCategory}
                                                className="h-10 rounded-lg bg-[#4169E1] text-sm font-bold text-white disabled:bg-[#d1d1d1]"
                                            >
                                                저장
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingCategoryId('');
                                                    setEditingCategoryName('');
                                                }}
                                                className="h-10 rounded-lg border border-[#e5e5e5] text-sm font-bold text-[#111111]"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-[#111111]">{categoryLabel(category.name)}</p>
                                                <p className="mt-1 text-xs font-medium uppercase text-[#666666]">{category.type} · {category.entryCount}개 콘텐츠</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingCategoryId(category.id);
                                                        setEditingCategoryName(category.name);
                                                    }}
                                                    className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold text-[#111111]"
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCategory(category.id, category.entryCount)}
                                                    className="h-9 rounded-lg border border-[#ffd9d6] px-3 text-xs font-bold text-[#ff3b30] disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};
