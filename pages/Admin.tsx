import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { categoryLabel, categoryService, EntryType } from '../services/categoryService';
import { commentService } from '../services/commentService';

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
        hiddenComments: number;
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
        previousTotalViews: number;
        previousUniqueVisitors: number;
        viewChangeRate: number | null;
        uniqueVisitorChangeRate: number | null;
        lastTrackedAt?: string | null;
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
        sourceBreakdown: AnalyticsMetric[];
        referrerHosts: AnalyticsMetric[];
        deviceBreakdown: AnalyticsMetric[];
        browserBreakdown: AnalyticsMetric[];
        osBreakdown: AnalyticsMetric[];
    };
    recentComments: Array<{
        id: string;
        projectId: string;
        projectTitle?: string;
        content: string;
        author: {
            name?: string;
            email?: string;
            role?: 'admin' | 'user';
            avatarUrl?: string;
        };
        date: string;
        status?: 'visible' | 'hidden';
    }>;
}

interface AnalyticsMetric {
    key: string;
    label: string;
    views: number;
    uniqueVisitors: number;
}

type ChartMetric = Record<string, string | number>;

type AdminCategory = AdminSummary['categories'][number];
type AdminTab = 'visitors' | 'categories' | 'comments';

const contentCategoryTypes = ['work', 'blog'] as const;
const entryTypeLabels: Record<EntryType, string> = {
    work: 'Work',
    blog: 'Blog',
    page: 'Page'
};
const adminTabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'visitors', label: '방문자' },
    { id: 'categories', label: '카테고리' },
    { id: 'comments', label: '댓글' }
];
const visitRanges = [
    { value: '7', label: '7일' },
    { value: '14', label: '14일' },
    { value: '30', label: '30일' },
    { value: 'all', label: '전체' }
] as const;
type VisitRange = typeof visitRanges[number]['value'];

const numberFormat = new Intl.NumberFormat('ko-KR');

const formatNumber = (value: number): string => numberFormat.format(value);

const chartColors = ['#4169E1', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5ac8fa'];

const formatChange = (value: number | null): string => {
    if (value === null) return '신규';
    if (value > 0) return `+${value}%`;
    return `${value}%`;
};

const changeClassName = (value: number | null): string => {
    if (value === null || value > 0) return 'text-[#4169E1]';
    if (value < 0) return 'text-[#ff3b30]';
    return 'text-[#666666]';
};

const formatDateTime = (value?: string | null): string => {
    if (!value) return '아직 없음';
    return new Date(value).toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const AnalyticsStatCard: React.FC<{
    label: string;
    value: number;
    helper?: string;
    change?: number | null;
    tone?: 'blue' | 'light';
}> = ({ label, value, helper, change, tone = 'light' }) => (
    <div className={`rounded-[8px] border p-5 ${tone === 'blue' ? 'border-[#4169E1]/25 bg-[#f7f9ff]' : 'border-[#e5e5e5] bg-white'}`}>
        <div className="flex items-start justify-between gap-3">
            <p className={`text-[12px] font-bold uppercase ${tone === 'blue' ? 'text-[#4169E1]' : 'text-[#666666]'}`}>{label}</p>
            {change !== undefined && (
                <span className={`rounded-full bg-white px-2 py-1 text-[11px] font-bold ${changeClassName(change)}`}>
                    {formatChange(change)}
                </span>
            )}
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight text-[#111111]">{formatNumber(value)}</p>
        {helper && <p className="mt-2 text-xs font-bold text-[#888888]">{helper}</p>}
    </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex min-h-[180px] items-center justify-center px-5 py-10 text-center text-sm font-medium text-[#888888]">
        {text}
    </div>
);

const MetricList: React.FC<{ items: AnalyticsMetric[]; emptyText: string }> = ({ items, emptyText }) => (
    <div className="divide-y divide-[#f0f0f0]">
        {items.length === 0 ? (
            <EmptyState text={emptyText} />
        ) : (
            items.map(item => (
                <div key={item.key} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_80px_70px] sm:items-center">
                    <p className="truncate text-sm font-bold text-[#111111]">{item.label}</p>
                    <span className="text-sm font-bold text-[#111111] sm:text-right">{formatNumber(item.views)}</span>
                    <span className="text-xs font-bold text-[#666666] sm:text-right">{formatNumber(item.uniqueVisitors)} UV</span>
                </div>
            ))
        )}
    </div>
);

const toChartMetrics = (items: AnalyticsMetric[]): ChartMetric[] =>
    items.map(item => ({
        key: item.key,
        label: item.label,
        views: item.views,
        uniqueVisitors: item.uniqueVisitors
    }));

const StatCard: React.FC<{ label: string; value: number | string; tone?: 'blue' | 'dark' | 'light' }> = ({
    label,
    value,
    tone = 'light'
}) => {
    const styles = {
        blue: 'border-[#4169E1]/25 bg-[#f7f9ff] text-[#111111]',
        dark: 'border-[#4169E1]/25 bg-white text-[#111111] shadow-[inset_0_3px_0_0_#4169E1]',
        light: 'border-[#e5e5e5] bg-white text-[#111111]'
    };
    const labelClass = tone === 'light' ? 'text-[#666666]' : 'text-[#4169E1]';

    return (
        <div className={`rounded-[8px] border p-5 ${styles[tone]}`}>
            <p className={`text-[12px] font-bold uppercase ${labelClass}`}>
                {label}
            </p>
            <p className="mt-4 text-3xl font-bold tracking-tight">{typeof value === 'number' ? formatNumber(value) : value}</p>
        </div>
    );
};

const Panel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
    title,
    action,
    children,
    className = ''
}) => (
    <div className={`rounded-[8px] border border-[#e5e5e5] bg-white ${className}`}>
        <div className="flex min-h-[57px] items-center justify-between gap-4 border-b border-[#e5e5e5] px-5 py-4">
            <h2 className="text-sm font-bold text-[#111111]">{title}</h2>
            {action}
        </div>
        {children}
    </div>
);

export const Admin: React.FC = () => {
    const [summary, setSummary] = useState<AdminSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<AdminTab>('visitors');
    const [visitRange, setVisitRange] = useState<VisitRange>('14');
    const [categoryName, setCategoryName] = useState('');
    const [categoryType, setCategoryType] = useState<EntryType>('work');
    const [editingCategoryId, setEditingCategoryId] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [editingCategoryType, setEditingCategoryType] = useState<EntryType>('work');
    const [actionError, setActionError] = useState('');
    const [isSavingCategory, setIsSavingCategory] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState('');
    const [editingCommentContent, setEditingCommentContent] = useState('');
    const [savingCommentId, setSavingCommentId] = useState('');

    const loadSummary = async (range: VisitRange = visitRange): Promise<AdminSummary> => {
        const res = await fetch(`/api/admin/summary?range=${encodeURIComponent(range)}`);
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

        loadSummary(visitRange)
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
    }, [visitRange]);

    const dailyChartData = useMemo(() => (
        summary?.analytics.dailyViews.map(item => ({
            ...item,
            label: item.day.slice(5)
        })) || []
    ), [summary?.analytics.dailyViews]);

    const categoriesByType = useMemo(() => {
        const groups: Record<'work' | 'blog', AdminCategory[]> = { work: [], blog: [] };
        for (const category of summary?.categories || []) {
            if (category.type === 'work' || category.type === 'blog') {
                groups[category.type].push(category);
            }
        }
        return groups;
    }, [summary?.categories]);

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

    const handleUpdateCategory = async (category: AdminCategory) => {
        const name = editingCategoryName.trim();
        if (!name) return;

        setIsSavingCategory(true);
        setActionError('');
        try {
            await categoryService.updateCategory(category.id, {
                name,
                type: editingCategoryType,
                sortOrder: category.sortOrder
            });
            setEditingCategoryId('');
            setEditingCategoryName('');
            setEditingCategoryType('work');
            await refreshSummary();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : '카테고리 수정에 실패했습니다.');
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleMoveCategory = async (category: AdminCategory, direction: -1 | 1) => {
        const siblings = categoriesByType[category.type === 'blog' ? 'blog' : 'work'];
        const currentIndex = siblings.findIndex(item => item.id === category.id);
        const targetIndex = currentIndex + direction;
        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;

        const reordered = [...siblings];
        [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];

        setIsSavingCategory(true);
        setActionError('');
        try {
            await Promise.all(reordered.map((item, sortOrder) =>
                categoryService.updateCategory(item.id, {
                    name: item.name,
                    type: item.type,
                    sortOrder
                })
            ));
            await refreshSummary();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : '카테고리 순서 변경에 실패했습니다.');
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (category: AdminCategory) => {
        const siblings = categoriesByType[category.type === 'blog' ? 'blog' : 'work'];
        const replacement = siblings.find(item => item.id !== category.id);

        if (category.entryCount > 0 && !replacement) {
            setActionError('콘텐츠를 옮길 같은 타입의 카테고리가 하나 더 필요합니다.');
            return;
        }

        const message = category.entryCount > 0 && replacement
            ? `"${categoryLabel(category.name)}" 카테고리를 삭제하고 연결된 콘텐츠 ${category.entryCount}개를 "${categoryLabel(replacement.name)}"로 옮길까요?`
            : `"${categoryLabel(category.name)}" 카테고리를 삭제할까요?`;
        if (!window.confirm(message)) return;

        setIsSavingCategory(true);
        setActionError('');
        try {
            await categoryService.deleteCategory(category.id, replacement?.id);
            await refreshSummary();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : '카테고리 삭제에 실패했습니다.');
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('이 댓글을 삭제할까요?')) return;

        setActionError('');
        const success = await commentService.deleteComment(commentId);
        if (!success) {
            setActionError('댓글 삭제에 실패했습니다.');
            return;
        }
        await refreshSummary();
    };

    const handleUpdateCommentStatus = async (commentId: string, status: 'visible' | 'hidden') => {
        setActionError('');
        const success = await commentService.updateCommentStatus(commentId, status);
        if (!success) {
            setActionError('댓글 상태 변경에 실패했습니다.');
            return;
        }
        await refreshSummary();
    };

    const startEditingComment = (comment: AdminSummary['recentComments'][number]) => {
        setActionError('');
        setEditingCommentId(comment.id);
        setEditingCommentContent(comment.content);
    };

    const cancelEditingComment = () => {
        setEditingCommentId('');
        setEditingCommentContent('');
    };

    const handleUpdateComment = async (commentId: string) => {
        const content = editingCommentContent.trim();
        if (!content) {
            setActionError('댓글 내용을 입력해 주세요.');
            return;
        }

        setActionError('');
        setSavingCommentId(commentId);
        const updated = await commentService.updateComment(commentId, content);
        setSavingCommentId('');

        if (!updated) {
            setActionError('댓글 수정에 실패했습니다.');
            return;
        }

        setSummary(prev => prev ? {
            ...prev,
            recentComments: prev.recentComments.map(comment =>
                comment.id === commentId ? { ...comment, content: updated.content } : comment
            )
        } : prev);
        cancelEditingComment();
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
                        className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#4169E1] px-4 text-sm font-bold text-white"
                    >
                        로그인
                    </Link>
                </div>
            </main>
        );
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayCommentCount = summary.recentComments.filter(comment => comment.date?.slice(0, 10) === todayKey).length;
    const selectedVisitRangeLabel = visitRanges.find(range => range.value === visitRange)?.label || '14일';
    const visitTrendTitle = visitRange === 'all' ? '전체 방문 추이' : `최근 ${selectedVisitRangeLabel} 방문 추이`;
    const sourceBreakdown = summary.analytics.sourceBreakdown || [];
    const referrerHosts = summary.analytics.referrerHosts || [];
    const deviceBreakdown = summary.analytics.deviceBreakdown || [];
    const browserBreakdown = summary.analytics.browserBreakdown || [];
    const osBreakdown = summary.analytics.osBreakdown || [];
    const sourceChartData = toChartMetrics(sourceBreakdown);
    const deviceChartData = toChartMetrics(deviceBreakdown);

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

                <div className="mb-8 border-b border-[#e5e5e5]" role="tablist" aria-label="관리자 섹션">
                    <div className="flex min-w-max gap-1 overflow-x-auto">
                        {adminTabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex h-12 shrink-0 items-center gap-2 px-4 text-left transition-colors ${activeTab === tab.id
                                    ? 'text-[#111111]'
                                    : 'text-[#666666] hover:text-[#111111]'
                                    }`}
                            >
                                <span className="text-sm font-bold">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <span className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-[#4169E1]" aria-hidden="true" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'visitors' && (
                    <>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-[#666666]">
                                    관리자와 로그인/어드민 페이지 방문은 제외하고, 수집 기능 적용 이후의 일반 방문만 집계합니다.
                                </p>
                                <p className="mt-1 text-xs font-bold text-[#888888]">
                                    마지막 수집: {formatDateTime(summary.analytics.lastTrackedAt)}
                                </p>
                            </div>
                            <div className="flex rounded-[8px] border border-[#e5e5e5] bg-[#fafafa] p-1">
                                {visitRanges.map(range => (
                                    <button
                                        key={range.value}
                                        type="button"
                                        onClick={() => setVisitRange(range.value)}
                                        className={`h-9 rounded-[6px] px-3 text-xs font-bold transition-colors ${visitRange === range.value
                                            ? 'bg-[#4169E1] text-white'
                                            : 'text-[#666666] hover:bg-white hover:text-[#111111]'
                                            }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <section className="grid gap-3 md:grid-cols-4">
                            <AnalyticsStatCard
                                label="기간 방문"
                                value={summary.analytics.totalViews}
                                change={visitRange === 'all' ? undefined : summary.analytics.viewChangeRate}
                                helper={visitRange === 'all' ? '전체 누적' : '이전 같은 기간 대비'}
                                tone="blue"
                            />
                            <AnalyticsStatCard label="오늘 방문" value={summary.analytics.todayViews} helper="오늘 수집된 일반 방문" />
                            <AnalyticsStatCard
                                label="순 방문자"
                                value={summary.analytics.uniqueVisitors}
                                change={visitRange === 'all' ? undefined : summary.analytics.uniqueVisitorChangeRate}
                                helper={visitRange === 'all' ? '전체 고유 방문자' : '이전 같은 기간 대비'}
                            />
                            <AnalyticsStatCard label="이전 기간 방문" value={summary.analytics.previousTotalViews} helper={visitRange === 'all' ? '전체 보기에서는 비교 없음' : `${selectedVisitRangeLabel} 전 구간`} />
                        </section>

                        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
                            <Panel title={visitTrendTitle}>
                                <div className="h-[300px] px-3 py-5">
                                    {dailyChartData.length === 0 ? (
                                        <EmptyState text="아직 수집된 방문 데이터가 없습니다." />
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={dailyChartData} margin={{ top: 10, right: 18, left: -18, bottom: 0 }}>
                                                <CartesianGrid stroke="#f0f0f0" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fill: '#666666', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fill: '#888888', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{ border: '1px solid #e5e5e5', borderRadius: 8, boxShadow: '0 12px 28px rgba(17,17,17,0.08)' }}
                                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.day || ''}
                                                    formatter={(value: number, name: string) => [formatNumber(Number(value)), name === 'views' ? '방문' : '순 방문자']}
                                                />
                                                <Legend formatter={(value) => value === 'views' ? '방문' : '순 방문자'} />
                                                <Line type="monotone" dataKey="views" stroke="#4169E1" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                <Line type="monotone" dataKey="uniqueVisitors" stroke="#34c759" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </Panel>

                            <Panel title="유입 소스">
                                <div className="h-[300px] px-3 py-5">
                                    {sourceBreakdown.length === 0 ? (
                                        <EmptyState text="유입 데이터가 아직 없습니다." />
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sourceChartData} layout="vertical" margin={{ top: 0, right: 16, left: 28, bottom: 0 }}>
                                                <CartesianGrid stroke="#f0f0f0" horizontal={false} />
                                                <XAxis type="number" allowDecimals={false} tick={{ fill: '#888888', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="label" width={76} tick={{ fill: '#666666', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{ border: '1px solid #e5e5e5', borderRadius: 8, boxShadow: '0 12px 28px rgba(17,17,17,0.08)' }}
                                                    formatter={(value: number, name: string) => [formatNumber(Number(value)), name === 'views' ? '방문' : '순 방문자']}
                                                />
                                                <Bar dataKey="views" fill="#4169E1" radius={[0, 6, 6, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </Panel>
                        </section>

                        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                            <Panel title="기기 비율">
                                <div className="grid gap-4 p-5 lg:grid-cols-[180px_1fr] lg:items-center">
                                    {deviceBreakdown.length === 0 ? (
                                        <div className="lg:col-span-2">
                                            <EmptyState text="기기 데이터가 아직 없습니다." />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-[180px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={deviceChartData} dataKey="views" nameKey="label" innerRadius={48} outerRadius={76} paddingAngle={3}>
                                                            {deviceBreakdown.map((item, index) => (
                                                                <Cell key={item.key} fill={chartColors[index % chartColors.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{ border: '1px solid #e5e5e5', borderRadius: 8, boxShadow: '0 12px 28px rgba(17,17,17,0.08)' }}
                                                            formatter={(value: number) => [formatNumber(Number(value)), '방문']}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="divide-y divide-[#f0f0f0]">
                                                {deviceBreakdown.map((item, index) => (
                                                    <div key={item.key} className="flex items-center justify-between gap-3 py-3">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                                                            <span className="truncate text-sm font-bold text-[#111111]">{item.label}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-[#111111]">{formatNumber(item.views)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Panel>

                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
                                <Panel title="브라우저">
                                    <MetricList items={browserBreakdown} emptyText="브라우저 데이터가 아직 없습니다." />
                                </Panel>
                                <Panel title="운영체제">
                                    <MetricList items={osBreakdown} emptyText="운영체제 데이터가 아직 없습니다." />
                                </Panel>
                            </div>
                        </section>

                        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <Panel title="게시글별 조회수" action={<span className="text-xs font-bold text-[#666666]">Views</span>}>
                                <div className="divide-y divide-[#f0f0f0]">
                                    {summary.analytics.topEntries.length === 0 ? (
                                        <div className="px-5 py-12 text-center text-sm font-medium text-[#888888]">조회 데이터가 아직 없습니다.</div>
                                    ) : (
                                        summary.analytics.topEntries.map(entry => (
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
                                        ))
                                    )}
                                </div>
                            </Panel>

                            <Panel title="경로별 방문">
                                <div className="divide-y divide-[#f0f0f0]">
                                    {summary.analytics.popularPaths.length === 0 ? (
                                        <EmptyState text="방문 데이터가 아직 없습니다." />
                                    ) : (
                                        summary.analytics.popularPaths.map(path => (
                                            <div key={path.path} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_80px_70px] sm:items-center">
                                                <p className="truncate text-sm font-bold text-[#111111]">{path.path}</p>
                                                <span className="text-sm font-bold text-[#111111] sm:text-right">{formatNumber(path.views)}</span>
                                                <span className="text-xs font-bold text-[#666666] sm:text-right">{formatNumber(path.uniqueVisitors)} UV</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Panel>
                        </section>

                        <section className="mt-6">
                            <Panel title="외부 유입 도메인">
                                <MetricList items={referrerHosts} emptyText="외부 유입 도메인이 아직 없습니다." />
                            </Panel>
                        </section>
                    </>
                )}

                {activeTab === 'categories' && (
                    <>
                        <section className="grid gap-3 sm:grid-cols-3">
                            <StatCard label="전체 카테고리" value={summary.totals.categoryCount} tone="dark" />
                            <StatCard label="Work 카테고리" value={categoriesByType.work.length} />
                            <StatCard label="Blog 카테고리" value={categoriesByType.blog.length} />
                        </section>

                        <section className="mt-6">
                            <Panel
                                title="카테고리 관리"
                                action={isSavingCategory ? <span className="text-xs font-bold text-[#666666]">저장 중</span> : undefined}
                            >
                                <form onSubmit={handleCreateCategory} className="grid gap-2 border-b border-[#e5e5e5] p-5 sm:grid-cols-[1fr_140px_90px]">
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
                                        className="h-10 rounded-lg bg-[#4169E1] px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d1d1d1]"
                                    >
                                        추가
                                    </button>
                                </form>
                                {actionError && (
                                    <div className="border-b border-[#ffd9d6] bg-[#fff5f5] px-5 py-3 text-xs font-bold text-[#ff3b30]">
                                        {actionError}
                                    </div>
                                )}
                                <div>
                                    {contentCategoryTypes.map(type => (
                                        <div key={type} className="border-b border-[#f0f0f0] last:border-b-0">
                                            <div className="flex items-center justify-between bg-[#fafafa] px-5 py-3">
                                                <p className="text-xs font-bold uppercase text-[#666666]">{entryTypeLabels[type]}</p>
                                                <p className="text-xs font-bold text-[#888888]">{categoriesByType[type].length}개</p>
                                            </div>
                                            <div className="divide-y divide-[#f0f0f0]">
                                                {categoriesByType[type].length === 0 ? (
                                                    <div className="px-5 py-8 text-center text-sm font-medium text-[#888888]">
                                                        카테고리가 없습니다.
                                                    </div>
                                                ) : (
                                                    categoriesByType[type].map((category, index) => (
                                                        <div key={category.id} className="px-5 py-4">
                                                            {editingCategoryId === category.id ? (
                                                                <div className="grid gap-2 lg:grid-cols-[1fr_140px_80px_80px]">
                                                                    <input
                                                                        value={editingCategoryName}
                                                                        onChange={event => setEditingCategoryName(event.target.value)}
                                                                        className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1]"
                                                                    />
                                                                    <select
                                                                        value={editingCategoryType}
                                                                        onChange={event => setEditingCategoryType(event.target.value as EntryType)}
                                                                        disabled={category.entryCount > 0}
                                                                        className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1] disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-[#888888]"
                                                                        title={category.entryCount > 0 ? '연결된 콘텐츠가 있으면 타입을 바꿀 수 없습니다.' : undefined}
                                                                    >
                                                                        <option value="work">Work</option>
                                                                        <option value="blog">Blog</option>
                                                                    </select>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateCategory(category)}
                                                                        disabled={isSavingCategory || !editingCategoryName.trim()}
                                                                        className="h-10 rounded-lg bg-[#4169E1] text-sm font-bold text-white disabled:bg-[#d1d1d1]"
                                                                    >
                                                                        저장
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingCategoryId('');
                                                                            setEditingCategoryName('');
                                                                            setEditingCategoryType('work');
                                                                        }}
                                                                        className="h-10 rounded-lg border border-[#e5e5e5] text-sm font-bold text-[#111111]"
                                                                    >
                                                                        취소
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-bold text-[#111111]">{categoryLabel(category.name)}</p>
                                                                        <p className="mt-1 text-xs font-medium uppercase text-[#666666]">
                                                                            {entryTypeLabels[category.type]} · {category.entryCount}개 콘텐츠 · 순서 {index + 1}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleMoveCategory(category, -1)}
                                                                            disabled={isSavingCategory || index === 0}
                                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#111111] disabled:cursor-not-allowed disabled:opacity-35"
                                                                            aria-label={`${category.name} 위로 이동`}
                                                                        >
                                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleMoveCategory(category, 1)}
                                                                            disabled={isSavingCategory || index === categoriesByType[type].length - 1}
                                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#111111] disabled:cursor-not-allowed disabled:opacity-35"
                                                                            aria-label={`${category.name} 아래로 이동`}
                                                                        >
                                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setEditingCategoryId(category.id);
                                                                                setEditingCategoryName(category.name);
                                                                                setEditingCategoryType(category.type);
                                                                            }}
                                                                            className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold text-[#111111]"
                                                                        >
                                                                            수정
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteCategory(category)}
                                                                            disabled={isSavingCategory}
                                                                            className="h-9 rounded-lg border border-[#ffd9d6] px-3 text-xs font-bold text-[#ff3b30] disabled:cursor-not-allowed disabled:opacity-50"
                                                                            title={category.entryCount > 0 ? '연결된 콘텐츠는 같은 타입의 다른 카테고리로 이동됩니다.' : undefined}
                                                                        >
                                                                            삭제
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        </section>
                    </>
                )}

                {activeTab === 'comments' && (
                    <>
                        <section className="grid gap-3 sm:grid-cols-3">
                            <StatCard label="전체 댓글" value={summary.totals.totalComments} tone="dark" />
                            <StatCard label="오늘 댓글" value={todayCommentCount} tone="blue" />
                            <StatCard label="숨김 댓글" value={summary.totals.hiddenComments} />
                        </section>

                        <section className="mt-6">
                            <Panel title="댓글 관리">
                                {actionError && (
                                    <div className="border-b border-[#ffd9d6] bg-[#fff5f5] px-5 py-3 text-xs font-bold text-[#ff3b30]">
                                        {actionError}
                                    </div>
                                )}
                                <div className="divide-y divide-[#f0f0f0]">
                                    {summary.recentComments.length === 0 ? (
                                        <div className="px-5 py-16 text-center">
                                            <p className="text-sm font-bold text-[#111111]">아직 댓글이 없습니다.</p>
                                            <p className="mt-2 text-sm font-medium text-[#888888]">댓글이 작성되면 이곳에서 확인하고 관리할 수 있습니다.</p>
                                        </div>
                                    ) : (
                                        summary.recentComments.map(comment => (
                                            <div key={comment.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_160px_160px] lg:items-center">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-bold text-[#111111]">{comment.author?.name || 'Unknown'}</p>
                                                        {comment.author?.role === 'admin' && (
                                                            <span className="rounded-full bg-[#f0f4ff] px-2 py-0.5 text-[10px] font-bold text-[#4169E1]">AUTHOR</span>
                                                        )}
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${comment.status === 'hidden'
                                                            ? 'bg-[#fff5f5] text-[#ff3b30]'
                                                            : 'bg-[#f5f5f5] text-[#666666]'
                                                            }`}>
                                                            {comment.status === 'hidden' ? '숨김' : '노출'}
                                                        </span>
                                                        <span className="text-xs font-medium text-[#888888]">
                                                            {new Date(comment.date).toLocaleDateString('ko-KR')}
                                                        </span>
                                                    </div>
                                                    {editingCommentId === comment.id ? (
                                                        <div className="mt-3 space-y-3">
                                                            <textarea
                                                                value={editingCommentContent}
                                                                onChange={event => setEditingCommentContent(event.target.value)}
                                                                className="min-h-[96px] w-full resize-none rounded-lg border border-[#e5e5e5] bg-[#ffffff] px-3 py-2 text-sm font-medium leading-relaxed text-[#111111] outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20"
                                                            />
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUpdateComment(comment.id)}
                                                                    disabled={savingCommentId === comment.id || !editingCommentContent.trim()}
                                                                    className="h-9 rounded-lg bg-[#4169E1] px-3 text-xs font-bold text-white hover:bg-[#3458c7] disabled:opacity-50 disabled:hover:bg-[#4169E1]"
                                                                >
                                                                    {savingCommentId === comment.id ? '저장 중' : '저장'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelEditingComment}
                                                                    disabled={savingCommentId === comment.id}
                                                                    className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold text-[#111111] hover:bg-[#f5f5f5] disabled:opacity-50"
                                                                >
                                                                    취소
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-[#2b2b2b]">{comment.content}</p>
                                                    )}
                                                    <Link
                                                        to={`/post/${comment.projectId}`}
                                                        className="mt-2 inline-flex max-w-full text-xs font-bold text-[#4169E1]"
                                                    >
                                                        <span className="truncate">{comment.projectTitle || comment.projectId}</span>
                                                    </Link>
                                                </div>
                                                <span className="text-xs font-bold text-[#666666] lg:text-right">{comment.projectId}</span>
                                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditingComment(comment)}
                                                        className="h-9 rounded-lg border border-[#dbe3ff] px-3 text-xs font-bold text-[#4169E1] hover:bg-[#f0f4ff]"
                                                    >
                                                        수정
                                                    </button>
                                                    {comment.status === 'hidden' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateCommentStatus(comment.id, 'visible')}
                                                            className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold text-[#111111] hover:bg-[#f5f5f5]"
                                                        >
                                                            복구
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateCommentStatus(comment.id, 'hidden')}
                                                            className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold text-[#111111] hover:bg-[#f5f5f5]"
                                                        >
                                                            숨김
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="h-9 rounded-lg border border-[#ffd9d6] px-3 text-xs font-bold text-[#ff3b30] hover:bg-[#fff5f5]"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Panel>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
};
