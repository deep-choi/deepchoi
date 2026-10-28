import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { isListedIn } from '../utils/entryPlacement';
import { commentService } from '../services/commentService';
import { authService } from '../services/authService';
import { PrivateBadge } from '../components/PrivateBadge';

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
        isPrivate?: number | boolean;
        date: string;
    }>;
    categories: Array<{
        id: string;
        name: string;
        category: string;
        type: EntryType;
        sortOrder: number;
        groupName?: string | null;
        section?: 'news' | null;
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
        botViews: number;
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
        countryBreakdown: AnalyticsMetric[];
        regionBreakdown: AnalyticsMetric[];
        campaignBreakdown: AnalyticsMetric[];
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

interface SearchConsoleMetric {
    key: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface SearchConsoleSummary {
    configured: boolean;
    message?: string;
    error?: string;
    rangeDays?: number;
    startDate?: string;
    endDate?: string;
    keywords?: SearchConsoleMetric[];
    pages?: SearchConsoleMetric[];
}

type ChartMetric = Record<string, string | number>;

type AdminCategory = AdminSummary['categories'][number];
type AdminTab = 'overview' | 'visitors' | 'search' | 'order' | 'categories' | 'comments';

const contentCategoryTypes = ['work', 'blog'] as const;

// Where a category's entries are listed: Work, Blog, or News (a blog category shown on /news).
type CategoryPlacement = 'work' | 'blog' | 'news';
const placementOf = (category: { type: EntryType; section?: 'news' | null }): CategoryPlacement =>
    category.type === 'work' ? 'work' : category.section === 'news' ? 'news' : 'blog';
const placementPayload = (placement: CategoryPlacement): { type: EntryType; section: 'news' | null } => ({
    type: placement === 'work' ? 'work' : 'blog',
    section: placement === 'news' ? 'news' : null
});
const placementOptions: Array<{ value: CategoryPlacement; label: string }> = [
    { value: 'work', label: 'Work' },
    { value: 'blog', label: 'Blog' },
    { value: 'news', label: 'News' }
];
const entryTypeLabels: Record<EntryType, string> = {
    work: 'Work',
    blog: 'Blog',
    page: 'Page'
};
const adminTabs: Array<{ id: AdminTab; label: string; description: string; icon: string }> = [
    {
        id: 'overview',
        label: '개요',
        description: '핵심 지표와 최근 활동을 한눈에 확인합니다.',
        icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z'
    },
    {
        id: 'visitors',
        label: '방문자 분석',
        description: '조회수, 유입 경로, 기기와 지역별 방문 현황입니다.',
        icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
    },
    {
        id: 'search',
        label: '검색 성과',
        description: 'Google 검색어와 검색 유입 페이지입니다.',
        icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z'
    },
    {
        id: 'order',
        label: '상단 순서',
        description: '홈과 Work 목록 맨 위에 보일 작업과 순서를 정합니다.',
        icon: 'M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25'
    },
    {
        id: 'categories',
        label: '카테고리',
        description: 'Work, Blog, News 카테고리를 추가하고 순서를 정리합니다.',
        icon: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z'
    },
    {
        id: 'comments',
        label: '댓글',
        description: '댓글을 확인하고 숨김·삭제를 관리합니다.',
        icon: 'M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z'
    }
];
const visitRanges = [
    { value: '7', label: '7일' },
    { value: '14', label: '14일' },
    { value: '30', label: '30일' },
    { value: 'all', label: '전체' }
] as const;
type VisitRange = typeof visitRanges[number]['value'];

const numberFormat = new Intl.NumberFormat('ko-KR');
const countryNameFormat = new Intl.DisplayNames(['ko-KR'], { type: 'region' });

const formatNumber = (value: number): string => numberFormat.format(value);
const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatLocation = (value: string): string => {
    const [country, ...details] = value.split(' · ');
    const countryLabel = /^[A-Z]{2}$/.test(country) ? (countryNameFormat.of(country) || country) : country;
    return [countryLabel, ...details].join(' · ');
};

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

const NavIcon: React.FC<{ d: string }> = ({ d }) => (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

const plusIcon = 'M12 4.5v15m7.5-7.5h-15';
const externalIcon = 'M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25';
const logoutIcon = 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9';

export const Admin: React.FC = () => {
    const [summary, setSummary] = useState<AdminSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchConsole, setSearchConsole] = useState<SearchConsoleSummary | null>(null);
    const [isSearchConsoleLoading, setIsSearchConsoleLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab: AdminTab = adminTabs.find(tab => tab.id === tabParam)?.id ?? 'overview';
    const setActiveTab = (tab: AdminTab) => {
        setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
    };
    const [visitRange, setVisitRange] = useState<VisitRange>('14');
    const [categoryName, setCategoryName] = useState('');
    const [categoryPlacement, setCategoryPlacement] = useState<CategoryPlacement>('work');
    const [categoryGroup, setCategoryGroup] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [editingCategoryPlacement, setEditingCategoryPlacement] = useState<CategoryPlacement>('work');
    const [editingCategoryGroup, setEditingCategoryGroup] = useState('');
    const [actionError, setActionError] = useState('');
    const [isSavingCategory, setIsSavingCategory] = useState(false);
    const [workEntries, setWorkEntries] = useState<Project[]>([]);
    const [topOrderIds, setTopOrderIds] = useState<string[]>([]);
    const [isTopOrderDirty, setIsTopOrderDirty] = useState(false);
    const [isSavingTopOrder, setIsSavingTopOrder] = useState(false);
    const [topOrderMessage, setTopOrderMessage] = useState('');

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

    const loadSearchConsole = async (range: VisitRange = visitRange): Promise<SearchConsoleSummary> => {
        const res = await fetch(`/api/admin/search-console?range=${encodeURIComponent(range)}`);
        return res.json() as Promise<SearchConsoleSummary>;
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

    useEffect(() => {
        let isMounted = true;
        setIsSearchConsoleLoading(true);

        loadSearchConsole(visitRange)
            .then(data => {
                if (isMounted) setSearchConsole(data);
            })
            .catch(() => {
                if (isMounted) setSearchConsole({ configured: true, error: 'Google 검색 성과를 불러오지 못했습니다.' });
            })
            .finally(() => {
                if (isMounted) setIsSearchConsoleLoading(false);
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

    const categoryGroupNames = useMemo(() => (
        Array.from(new Set((summary?.categories || []).map(category => category.groupName?.trim()).filter(Boolean))) as string[]
    ), [summary?.categories]);

    const handleCreateCategory = async (event: React.FormEvent) => {
        event.preventDefault();
        const name = categoryName.trim();
        if (!name) return;

        setIsSavingCategory(true);
        setActionError('');
        try {
            const { type, section } = placementPayload(categoryPlacement);
            await categoryService.createCategory(name, type, categoryGroup.trim(), section);
            setCategoryName('');
            setCategoryGroup('');
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
                ...placementPayload(editingCategoryPlacement),
                sortOrder: category.sortOrder,
                groupName: editingCategoryGroup.trim() || null
            });
            setEditingCategoryId('');
            setEditingCategoryName('');
            setEditingCategoryPlacement('work');
            setEditingCategoryGroup('');
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

    useEffect(() => {
        if (activeTab !== 'order') return;
        let isMounted = true;

        projectService.getAllProjects().then(projects => {
            if (!isMounted) return;
            const entries = projects.filter(project => isListedIn(project, 'work'));
            setWorkEntries(entries);
            // getAllProjects already puts ordered entries first, in order.
            setTopOrderIds(entries.filter(project => project.pinOrder !== null && project.pinOrder !== undefined).map(project => project.id));
            setIsTopOrderDirty(false);
        });

        return () => {
            isMounted = false;
        };
    }, [activeTab]);

    const updateTopOrder = (ids: string[]) => {
        setTopOrderIds(ids);
        setIsTopOrderDirty(true);
        setTopOrderMessage('');
    };

    const moveTopOrder = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= topOrderIds.length) return;
        const reordered = [...topOrderIds];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        updateTopOrder(reordered);
    };

    const handleSaveTopOrder = async () => {
        setIsSavingTopOrder(true);
        setTopOrderMessage('');
        try {
            await projectService.saveTopOrder(topOrderIds);
            setIsTopOrderDirty(false);
            setTopOrderMessage('저장했습니다.');
        } catch (err) {
            setTopOrderMessage(err instanceof Error ? err.message : '상단 순서 저장에 실패했습니다.');
        } finally {
            setIsSavingTopOrder(false);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        navigate('/');
        window.location.reload();
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
    const visitTrendTitle = visitRange === 'all' ? '전체 조회수 추이' : `최근 ${selectedVisitRangeLabel} 조회수 추이`;
    const sourceBreakdown = summary.analytics.sourceBreakdown || [];
    const referrerHosts = summary.analytics.referrerHosts || [];
    const deviceBreakdown = summary.analytics.deviceBreakdown || [];
    const browserBreakdown = summary.analytics.browserBreakdown || [];
    const osBreakdown = summary.analytics.osBreakdown || [];
    const countryBreakdown = summary.analytics.countryBreakdown || [];
    const regionBreakdown = summary.analytics.regionBreakdown || [];
    const campaignBreakdown = summary.analytics.campaignBreakdown || [];
    const countryMetrics = countryBreakdown.map(item => ({ ...item, label: formatLocation(item.key) }));
    const regionMetrics = regionBreakdown.map(item => ({ ...item, label: formatLocation(item.key) }));
    const sourceChartData = toChartMetrics(sourceBreakdown);
    const deviceChartData = toChartMetrics(deviceBreakdown);

    const rangeSelector = (
        <div className="flex rounded-[8px] border border-[#e5e5e5] bg-white p-1">
            {visitRanges.map(range => (
                <button
                    key={range.value}
                    type="button"
                    onClick={() => setVisitRange(range.value)}
                    className={`h-9 rounded-[6px] px-3 text-xs font-bold transition-colors ${visitRange === range.value
                        ? 'bg-[#4169E1] text-white'
                        : 'text-[#666666] hover:bg-[#f5f5f5] hover:text-[#111111]'
                        }`}
                >
                    {range.label}
                </button>
            ))}
        </div>
    );
    const activeTabMeta = adminTabs.find(tab => tab.id === activeTab) || adminTabs[0];
    const showsRange = activeTab === 'overview' || activeTab === 'visitors' || activeTab === 'search';
    const topEntries = summary.analytics.topEntries.slice(0, 5);
    const latestEntries = summary.recentEntries.slice(0, 6);
    const latestComments = summary.recentComments.slice(0, 5);
    const topKeywords = (searchConsole?.keywords || []).slice(0, 5);

    const trendPanel = (
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
                                        formatter={(value: number, name: string) => [formatNumber(Number(value)), name === 'views' ? '조회수' : '순 방문자 수']}
                                    />
                                    <Legend formatter={(value) => value === 'views' ? '조회수' : '순 방문자 수'} />
                                    <Line type="monotone" dataKey="views" stroke="#4169E1" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="uniqueVisitors" stroke="#34c759" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Panel>
    );
    const sourcePanel = (
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
                                        formatter={(value: number, name: string) => [formatNumber(Number(value)), name === 'views' ? '조회수' : '순 방문자 수']}
                                    />
                                    <Bar dataKey="views" fill="#4169E1" radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Panel>
    );

    return (
        <div className="min-h-screen bg-[#f6f7fb] lg:pl-[248px]">
            <aside className="border-b border-[#e5e5e5] bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[248px] lg:flex-col lg:border-b-0 lg:border-r">
                <div className="flex h-14 items-center justify-between px-4 lg:h-[72px] lg:px-5">
                    <Link to="/" className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-[#4169E1]" aria-hidden="true" />
                        <span className="text-[18px] font-bold tracking-tight text-[#111111]">Deepchoi</span>
                        <span className="rounded-full bg-[#f0f4ff] px-2 py-0.5 text-[10px] font-bold uppercase text-[#4169E1]">Admin</span>
                    </Link>
                    <div className="flex items-center gap-1 lg:hidden">
                        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#666666] hover:bg-[#f5f5f5]" aria-label="사이트 보기">
                            <NavIcon d={externalIcon} />
                        </Link>
                        <button type="button" onClick={handleLogout} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#666666] hover:bg-[#f5f5f5]" aria-label="로그아웃">
                            <NavIcon d={logoutIcon} />
                        </button>
                    </div>
                </div>

                <p className="hidden px-6 pb-2 pt-2 text-[11px] font-bold uppercase text-[#888888] lg:block">Menu</p>
                <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0" role="tablist" aria-label="관리자 섹션">
                    {adminTabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex h-10 shrink-0 items-center gap-2.5 rounded-[6px] px-3 text-sm font-bold transition-colors ${activeTab === tab.id
                                ? 'bg-[#f0f4ff] text-[#4169E1]'
                                : 'text-[#666666] hover:bg-[#f5f5f5] hover:text-[#111111]'
                                }`}
                        >
                            <NavIcon d={tab.icon} />
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="hidden lg:block">
                    <p className="px-6 pb-2 pt-6 text-[11px] font-bold uppercase text-[#888888]">Create</p>
                    <div className="flex flex-col gap-1 px-3">
                        <Link
                            to="/admin/create?type=work"
                            className="flex h-10 items-center gap-2.5 rounded-[6px] px-3 text-sm font-bold text-[#666666] transition-colors hover:bg-[#f5f5f5] hover:text-[#111111]"
                        >
                            <NavIcon d={plusIcon} />
                            프로젝트 작성
                        </Link>
                        <Link
                            to="/admin/create?type=blog"
                            className="flex h-10 items-center gap-2.5 rounded-[6px] px-3 text-sm font-bold text-[#666666] transition-colors hover:bg-[#f5f5f5] hover:text-[#111111]"
                        >
                            <NavIcon d={plusIcon} />
                            글 작성
                        </Link>
                    </div>
                </div>

                <div className="mt-auto hidden border-t border-[#f0f0f0] p-3 lg:block">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111111] text-sm font-bold text-white">
                            {summary.user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#111111]">{summary.user.name}</p>
                            <p className="truncate text-xs font-medium text-[#888888]">{summary.user.email}</p>
                        </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <Link
                            to="/"
                            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] text-xs font-bold text-[#111111] hover:bg-[#f5f5f5]"
                        >
                            사이트 보기
                        </Link>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] text-xs font-bold text-[#111111] hover:bg-[#f5f5f5]"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </aside>

            <main className="min-w-0 px-4 pb-16 pt-6 md:px-8 lg:pt-8">
                <div className="mx-auto max-w-[1280px]">
                    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-[26px] font-bold tracking-tight text-[#111111] md:text-[30px]">{activeTabMeta.label}</h1>
                            <p className="mt-1 text-sm font-medium text-[#666666]">{activeTabMeta.description}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {showsRange && rangeSelector}
                            {activeTab === 'overview' && (
                                <div className="flex gap-2 lg:hidden">
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
                            )}
                        </div>
                    </header>

                {activeTab === 'overview' && (
                    <>
                        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <AnalyticsStatCard
                                label="조회수"
                                value={summary.analytics.totalViews}
                                change={visitRange === 'all' ? undefined : summary.analytics.viewChangeRate}
                                helper={visitRange === 'all' ? '전체 누적 조회수' : '이전 같은 기간 대비'}
                                tone="blue"
                            />
                            <AnalyticsStatCard
                                label="순 방문자 수"
                                value={summary.analytics.uniqueVisitors}
                                change={visitRange === 'all' ? undefined : summary.analytics.uniqueVisitorChangeRate}
                                helper={visitRange === 'all' ? '전체 고유 방문자' : '이전 같은 기간 대비'}
                            />
                            <AnalyticsStatCard label="오늘 조회수" value={summary.analytics.todayViews} helper="오늘 수집된 일반 조회수" />
                            <AnalyticsStatCard
                                label="콘텐츠"
                                value={summary.totals.totalEntries}
                                helper={`Work ${formatNumber(summary.totals.workEntries)} · Blog ${formatNumber(summary.totals.blogEntries)}`}
                            />
                            <AnalyticsStatCard
                                label="댓글"
                                value={summary.totals.totalComments}
                                helper={`오늘 ${formatNumber(todayCommentCount)}개 · 숨김 ${formatNumber(summary.totals.hiddenComments)}개`}
                            />
                        </section>

                        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
                            {trendPanel}
                            {sourcePanel}
                        </section>

                        <section className="mt-6 grid gap-6 xl:grid-cols-2">
                            <Panel
                                title="인기 콘텐츠"
                                action={<button type="button" onClick={() => setActiveTab('visitors')} className="text-xs font-bold text-[#4169E1]">방문자 분석</button>}
                            >
                                <div className="divide-y divide-[#f0f0f0]">
                                    {topEntries.length === 0 ? (
                                        <EmptyState text="조회 데이터가 아직 없습니다." />
                                    ) : (
                                        topEntries.map((entry, index) => (
                                            <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                                                <span className="w-5 shrink-0 text-sm font-bold text-[#b0b0b0]">{index + 1}</span>
                                                <div className="min-w-0 flex-1">
                                                    <Link to={`/post/${entry.id}`} className="block truncate text-sm font-bold text-[#111111] hover:text-[#4169E1]">
                                                        {entry.title}
                                                    </Link>
                                                    <p className="mt-0.5 text-xs font-medium text-[#666666]">
                                                        {categoryLabel(entry.category)} · {entryTypeLabels[entry.type || 'work']}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-bold text-[#111111]">{formatNumber(entry.views)}</p>
                                                    <p className="text-xs font-bold text-[#666666]">{formatNumber(entry.uniqueVisitors)} UV</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Panel>

                            <Panel title="최근 콘텐츠">
                                <div className="divide-y divide-[#f0f0f0]">
                                    {latestEntries.length === 0 ? (
                                        <EmptyState text="작성된 콘텐츠가 없습니다." />
                                    ) : (
                                        latestEntries.map(entry => (
                                            <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                                                <div className="min-w-0 flex-1">
                                                    <Link to={`/post/${entry.id}`} className="block truncate text-sm font-bold text-[#111111] hover:text-[#4169E1]">
                                                        {entry.title}
                                                    </Link>
                                                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-[#666666]">
                                                        {Boolean(entry.isPrivate) && <PrivateBadge className="px-1.5 text-[10px]" />}
                                                        {categoryLabel(entry.category)} · {entryTypeLabels[entry.type || 'work']} · {new Date(entry.date).toLocaleDateString('ko-KR')}
                                                    </p>
                                                </div>
                                                <Link
                                                    to={`/admin/edit/${entry.id}`}
                                                    className="h-8 shrink-0 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold leading-8 text-[#111111] hover:bg-[#f5f5f5]"
                                                >
                                                    수정
                                                </Link>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Panel>
                        </section>

                        <section className="mt-6 grid gap-6 xl:grid-cols-2">
                            <Panel
                                title="최근 댓글"
                                action={<button type="button" onClick={() => setActiveTab('comments')} className="text-xs font-bold text-[#4169E1]">전체 보기</button>}
                            >
                                {actionError && (
                                    <div className="border-b border-[#ffd9d6] bg-[#fff5f5] px-5 py-3 text-xs font-bold text-[#ff3b30]">
                                        {actionError}
                                    </div>
                                )}
                                <div className="divide-y divide-[#f0f0f0]">
                                    {latestComments.length === 0 ? (
                                        <EmptyState text="아직 댓글이 없습니다." />
                                    ) : (
                                        latestComments.map(comment => (
                                            <div key={comment.id} className="flex items-start gap-4 px-5 py-3.5">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-bold text-[#111111]">{comment.author?.name || 'Unknown'}</p>
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
                                                    <p className="mt-1 line-clamp-2 text-sm font-medium text-[#2b2b2b]">{comment.content}</p>
                                                    <Link to={`/post/${comment.projectId}`} className="mt-1 inline-flex max-w-full text-xs font-bold text-[#4169E1]">
                                                        <span className="truncate">{comment.projectTitle || comment.projectId}</span>
                                                    </Link>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateCommentStatus(comment.id, comment.status === 'hidden' ? 'visible' : 'hidden')}
                                                    className="h-8 shrink-0 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold text-[#111111] hover:bg-[#f5f5f5]"
                                                >
                                                    {comment.status === 'hidden' ? '복구' : '숨김'}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Panel>

                            <Panel
                                title="상위 검색어"
                                action={<button type="button" onClick={() => setActiveTab('search')} className="text-xs font-bold text-[#4169E1]">전체 보기</button>}
                            >
                                {isSearchConsoleLoading ? (
                                    <EmptyState text="Google 검색 성과를 불러오는 중입니다." />
                                ) : !searchConsole?.configured ? (
                                    <EmptyState text={searchConsole?.message || 'Google Search Console을 연결하면 검색어를 볼 수 있습니다.'} />
                                ) : searchConsole.error ? (
                                    <EmptyState text={searchConsole.error} />
                                ) : topKeywords.length === 0 ? (
                                    <EmptyState text="표시할 검색어가 없습니다." />
                                ) : (
                                    <div className="divide-y divide-[#f0f0f0]">
                                        {topKeywords.map(item => (
                                            <div key={item.key} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[1fr_72px_64px] sm:items-center">
                                                <p className="truncate text-sm font-bold text-[#111111]">{item.key}</p>
                                                <span className="text-xs font-bold text-[#111111] sm:text-right">{formatNumber(item.clicks)} 클릭</span>
                                                <span className="text-xs font-bold text-[#666666] sm:text-right">{item.position.toFixed(1)}위</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Panel>
                        </section>
                    </>
                )}


                {activeTab === 'visitors' && (
                    <>
                        <div className="mb-4">
                            <p className="text-sm font-bold text-[#666666]">
                                관리자와 로그인/어드민 페이지 방문은 제외하고, 수집 기능 적용 이후의 일반 방문만 집계합니다.
                            </p>
                            <p className="mt-1 text-xs font-bold text-[#888888]">
                                마지막 수집: {formatDateTime(summary.analytics.lastTrackedAt)} · 봇 조회 {formatNumber(summary.analytics.botViews)}건은 방문 통계에서 제외
                            </p>
                        </div>
                        <section className="grid gap-3 md:grid-cols-4">
                            <AnalyticsStatCard
                                label="조회수"
                                value={summary.analytics.totalViews}
                                change={visitRange === 'all' ? undefined : summary.analytics.viewChangeRate}
                                helper={visitRange === 'all' ? '전체 누적 조회수' : '이전 같은 기간 대비'}
                                tone="blue"
                            />
                            <AnalyticsStatCard label="오늘 조회수" value={summary.analytics.todayViews} helper="오늘 수집된 일반 조회수" />
                            <AnalyticsStatCard
                                label="순 방문자 수"
                                value={summary.analytics.uniqueVisitors}
                                change={visitRange === 'all' ? undefined : summary.analytics.uniqueVisitorChangeRate}
                                helper={visitRange === 'all' ? '전체 고유 방문자' : '이전 같은 기간 대비'}
                            />
                            <AnalyticsStatCard label="이전 기간 조회수" value={summary.analytics.previousTotalViews} helper={visitRange === 'all' ? '전체 보기에서는 비교 없음' : `${selectedVisitRangeLabel} 전 구간`} />
                        </section>

                        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
                            {trendPanel}
                            {sourcePanel}
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

                        <section className="mt-6 grid gap-6 xl:grid-cols-2">
                            <Panel title="국가별 방문">
                                <MetricList items={countryMetrics} emptyText="지역 데이터는 수집 적용 이후부터 표시됩니다." />
                            </Panel>
                            <Panel title="시·도별 방문">
                                <MetricList items={regionMetrics} emptyText="시·도 데이터는 수집 적용 이후부터 표시됩니다." />
                            </Panel>
                        </section>

                        <section className="mt-6">
                            <Panel title="캠페인 유입" action={<span className="text-xs font-bold text-[#666666]">UTM Campaign</span>}>
                                <MetricList items={campaignBreakdown} emptyText="utm_campaign이 포함된 유입이 아직 없습니다." />
                            </Panel>
                        </section>

                    </>
                )}

                {activeTab === 'search' && (
                    <>
                        <section className="mt-6">
                            <Panel
                                title="Google 검색 성과"
                                action={searchConsole?.configured && searchConsole.startDate && searchConsole.endDate
                                    ? <span className="text-xs font-bold text-[#666666]">{searchConsole.startDate} - {searchConsole.endDate}</span>
                                    : undefined}
                            >
                                {isSearchConsoleLoading ? (
                                    <div className="px-5 py-12 text-center text-sm font-medium text-[#888888]">Google 검색 성과를 불러오는 중입니다.</div>
                                ) : !searchConsole?.configured ? (
                                    <div className="px-5 py-12 text-center text-sm font-medium text-[#888888]">{searchConsole?.message || 'Google Search Console을 연결하면 검색어와 검색 유입 페이지를 볼 수 있습니다.'}</div>
                                ) : searchConsole.error ? (
                                    <div className="px-5 py-12 text-center text-sm font-medium text-[#888888]">{searchConsole.error}</div>
                                ) : (
                                    <div className="grid divide-y divide-[#f0f0f0] xl:grid-cols-2 xl:divide-x xl:divide-y-0">
                                        <div>
                                            <div className="border-b border-[#f0f0f0] px-5 py-3 text-xs font-bold text-[#666666]">상위 검색어</div>
                                            {(searchConsole.keywords || []).length === 0 ? (
                                                <EmptyState text="표시할 검색어가 없습니다." />
                                            ) : searchConsole.keywords?.map(item => (
                                                <div key={item.key} className="grid gap-2 border-b border-[#f0f0f0] px-5 py-4 sm:grid-cols-[1fr_56px_56px_64px] sm:items-center">
                                                    <p className="truncate text-sm font-bold text-[#111111]">{item.key}</p>
                                                    <span className="text-xs font-bold text-[#111111] sm:text-right">{formatNumber(item.clicks)} 클릭</span>
                                                    <span className="text-xs font-bold text-[#666666] sm:text-right">{formatPercent(item.ctr)}</span>
                                                    <span className="text-xs font-bold text-[#666666] sm:text-right">{item.position.toFixed(1)}위</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <div className="border-b border-[#f0f0f0] px-5 py-3 text-xs font-bold text-[#666666]">Google 유입 페이지</div>
                                            {(searchConsole.pages || []).length === 0 ? (
                                                <EmptyState text="표시할 검색 유입 페이지가 없습니다." />
                                            ) : searchConsole.pages?.map(item => (
                                                <div key={item.key} className="grid gap-2 border-b border-[#f0f0f0] px-5 py-4 sm:grid-cols-[1fr_56px_56px_64px] sm:items-center">
                                                    <p className="truncate text-sm font-bold text-[#111111]">{item.key}</p>
                                                    <span className="text-xs font-bold text-[#111111] sm:text-right">{formatNumber(item.clicks)} 클릭</span>
                                                    <span className="text-xs font-bold text-[#666666] sm:text-right">{formatPercent(item.ctr)}</span>
                                                    <span className="text-xs font-bold text-[#666666] sm:text-right">{item.position.toFixed(1)}위</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Panel>
                        </section>
                    </>
                )}

                {activeTab === 'order' && (
                    <section className="grid gap-6 xl:grid-cols-2">
                        <Panel
                            title="상단 순서"
                            action={(
                                <div className="flex items-center gap-3">
                                    {topOrderMessage && <span className="text-xs font-bold text-[#666666]">{topOrderMessage}</span>}
                                    <button
                                        type="button"
                                        onClick={handleSaveTopOrder}
                                        disabled={!isTopOrderDirty || isSavingTopOrder}
                                        className="h-9 rounded-lg bg-[#4169E1] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-[#d1d1d1]"
                                    >
                                        {isSavingTopOrder ? '저장 중' : '저장'}
                                    </button>
                                </div>
                            )}
                        >
                            <p className="border-b border-[#f0f0f0] px-5 py-3 text-xs font-medium text-[#666666]">
                                여기 있는 작업이 홈과 Work 목록 맨 위에 이 순서대로 보입니다. 나머지는 날짜순으로 이어집니다.
                            </p>
                            <div className="divide-y divide-[#f0f0f0]">
                                {topOrderIds.length === 0 ? (
                                    <EmptyState text="오른쪽 목록에서 상단에 올릴 작업을 추가하세요." />
                                ) : (
                                    topOrderIds.map((id, index) => {
                                        const entry = workEntries.find(item => item.id === id);
                                        if (!entry) return null;
                                        return (
                                            <div key={id} className="flex items-center justify-between gap-3 px-5 py-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="w-5 shrink-0 text-sm font-bold text-[#4169E1]">{index + 1}</span>
                                                    <div className="min-w-0">
                                                        <p className="flex items-center gap-2 truncate text-sm font-bold text-[#111111]">
                                                            {entry.title}
                                                            {entry.isPrivate && <PrivateBadge />}
                                                        </p>
                                                        <p className="mt-1 text-xs font-medium text-[#666666]">{categoryLabel(entry.category)} · {entry.date}</p>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveTopOrder(index, -1)}
                                                        disabled={index === 0}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#111111] disabled:cursor-not-allowed disabled:opacity-35"
                                                        aria-label={`${entry.title} 위로 이동`}
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveTopOrder(index, 1)}
                                                        disabled={index === topOrderIds.length - 1}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#111111] disabled:cursor-not-allowed disabled:opacity-35"
                                                        aria-label={`${entry.title} 아래로 이동`}
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateTopOrder(topOrderIds.filter(item => item !== id))}
                                                        className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold text-[#111111]"
                                                    >
                                                        빼기
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Panel>

                        <Panel title="나머지 작업 (날짜순)">
                            <div className="divide-y divide-[#f0f0f0]">
                                {workEntries.filter(entry => !topOrderIds.includes(entry.id)).length === 0 ? (
                                    <EmptyState text="모든 작업이 상단 순서에 있습니다." />
                                ) : (
                                    workEntries
                                        .filter(entry => !topOrderIds.includes(entry.id))
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(entry => (
                                            <div key={entry.id} className="flex items-center justify-between gap-3 px-5 py-4">
                                                <div className="min-w-0">
                                                    <p className="flex items-center gap-2 truncate text-sm font-bold text-[#111111]">
                                                        {entry.title}
                                                        {entry.isPrivate && <PrivateBadge />}
                                                    </p>
                                                    <p className="mt-1 text-xs font-medium text-[#666666]">{categoryLabel(entry.category)} · {entry.date}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => updateTopOrder([...topOrderIds, entry.id])}
                                                    className="h-9 shrink-0 rounded-lg border border-[#4169E1]/40 px-3 text-xs font-bold text-[#4169E1]"
                                                >
                                                    상단에 추가
                                                </button>
                                            </div>
                                        ))
                                )}
                            </div>
                        </Panel>
                    </section>
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
                                <datalist id="category-group-names">
                                    {categoryGroupNames.map(name => <option key={name} value={name} />)}
                                </datalist>
                                <form onSubmit={handleCreateCategory} className="grid gap-2 border-b border-[#e5e5e5] p-5 sm:grid-cols-[1fr_160px_140px_90px]">
                                    <input
                                        value={categoryName}
                                        onChange={event => setCategoryName(event.target.value)}
                                        className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20"
                                        placeholder="새 카테고리"
                                    />
                                    <input
                                        value={categoryGroup}
                                        onChange={event => setCategoryGroup(event.target.value)}
                                        list="category-group-names"
                                        className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20"
                                        placeholder="1차 분류 (선택)"
                                    />
                                    <select
                                        value={categoryPlacement}
                                        onChange={event => setCategoryPlacement(event.target.value as CategoryPlacement)}
                                        className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1]"
                                    >
                                        {placementOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
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
                                                                <div className="grid gap-2 lg:grid-cols-[1fr_160px_140px_80px_80px]">
                                                                    <input
                                                                        value={editingCategoryName}
                                                                        onChange={event => setEditingCategoryName(event.target.value)}
                                                                        className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1]"
                                                                    />
                                                                    <input
                                                                        value={editingCategoryGroup}
                                                                        onChange={event => setEditingCategoryGroup(event.target.value)}
                                                                        list="category-group-names"
                                                                        className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1]"
                                                                        placeholder="1차 분류 (선택)"
                                                                    />
                                                                    <select
                                                                        value={editingCategoryPlacement}
                                                                        onChange={event => setEditingCategoryPlacement(event.target.value as CategoryPlacement)}
                                                                        className="h-10 rounded-lg border border-[#e5e5e5] px-3 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1]"
                                                                        title={category.entryCount > 0 ? '연결된 콘텐츠가 있으면 Work와 Blog·News 사이는 바꿀 수 없습니다.' : undefined}
                                                                    >
                                                                        {placementOptions.map(option => (
                                                                            <option
                                                                                key={option.value}
                                                                                value={option.value}
                                                                                // Moving entries between Work and Blog changes their type; only Blog↔News is free.
                                                                                disabled={category.entryCount > 0 && (option.value === 'work') !== (category.type === 'work')}
                                                                            >
                                                                                {option.label}
                                                                            </option>
                                                                        ))}
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
                                                                            setEditingCategoryPlacement('work');
                                                                            setEditingCategoryGroup('');
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
                                                                            {category.section === 'news' ? 'News' : entryTypeLabels[category.type]}{category.groupName ? ` · ${category.groupName}` : ''} · {category.entryCount}개 콘텐츠 · 순서 {index + 1}
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
                                                                                setEditingCategoryPlacement(placementOf(category));
                                                                                setEditingCategoryGroup(category.groupName || '');
                                                                            }}
                                                                            className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-xs font-bold text-[#111111]"
                                                                        >
                                                                            수정
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteCategory(category.id, category.entryCount)}
                                                                            disabled={category.entryCount > 0 || isSavingCategory}
                                                                            className="h-9 rounded-lg border border-[#ffd9d6] px-3 text-xs font-bold text-[#ff3b30] disabled:cursor-not-allowed disabled:opacity-50"
                                                                            title={category.entryCount > 0 ? '콘텐츠가 연결된 카테고리는 삭제할 수 없습니다.' : undefined}
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
                                                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-[#2b2b2b]">{comment.content}</p>
                                                    <Link
                                                        to={`/post/${comment.projectId}`}
                                                        className="mt-2 inline-flex max-w-full text-xs font-bold text-[#4169E1]"
                                                    >
                                                        <span className="truncate">{comment.projectTitle || comment.projectId}</span>
                                                    </Link>
                                                </div>
                                                <span className="text-xs font-bold text-[#666666] lg:text-right">{comment.projectId}</span>
                                                <div className="flex flex-wrap gap-2 lg:justify-end">
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
        </div>
    );
};
