import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Project } from '../types';
import { projectService } from '../services/projectService';
import { ProjectCard } from '../components/ProjectCard';
import { CategoryGroup, categoryLabel, categoryService, findCategoryByQuery, groupCategories, normalizeCategoryQuery } from '../services/categoryService';
import { useAuthUser } from '../hooks/useAuthUser';
import { categoryIn, isListedIn } from '../utils/entryPlacement';
import { categoryChipClassName, groupTabClassName } from '../utils/tabStyles';

const ALL = '전체보기';


export const Blog: React.FC = () => {
    const [posts, setPosts] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [groups, setGroups] = useState<CategoryGroup[]>([]);
    const [activeGroup, setActiveGroup] = useState(ALL);
    // Empty means every category in the active group.
    const [activeCategory, setActiveCategory] = useState('');
    const location = useLocation();
    const [publicationNotice, setPublicationNotice] = useState<string | null>(() => (location.state as { publicationNotice?: string } | null)?.publicationNotice || null);
    const currentUser = useAuthUser();
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        Promise.all([
            projectService.getAllProjects(),
            categoryService.getCategories('blog')
        ]).then(([data, categories]) => {
            if (!isMounted) return;
            const blogPosts = data.filter(p => isListedIn(p, 'blog'));
            setPosts(blogPosts);
            const knownNames = new Set(categories.map(category => category.name));
            const unlisted = Array.from(new Set(blogPosts.map(post => categoryIn(post, 'blog')).filter(name => name && !knownNames.has(name))));
            setGroups(groupCategories([...categories, ...unlisted.map(name => ({ name, groupName: null }))]));
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const queryGroup = params.get('group');
        const queryCategory = params.get('category');

        const matchedCategory = findCategoryByQuery(groups.flatMap(group => group.categories), queryCategory);
        if (matchedCategory) {
            setActiveGroup(groups.find(group => group.categories.includes(matchedCategory))?.name || ALL);
            setActiveCategory(matchedCategory);
            return;
        }

        const matchedGroup = queryGroup
            ? groups.find(group => normalizeCategoryQuery(group.name) === normalizeCategoryQuery(queryGroup))
            : undefined;
        setActiveGroup(matchedGroup?.name || ALL);
        setActiveCategory('');
    }, [location.search, groups]);

    const currentGroup = groups.find(group => group.name === activeGroup);
    const filteredPosts = !currentGroup
        ? posts
        : posts.filter(p => activeCategory
            ? categoryIn(p, 'blog') === activeCategory
            : currentGroup.categories.includes(categoryIn(p, 'blog')));

    const selectGroup = (groupName: string) => {
        setActiveGroup(groupName);
        setActiveCategory('');
    };

    return (
        <section className="py-32 bg-[#ffffff] min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 md:px-[20px]">
                {publicationNotice && <div role="status" className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-[#b9d5c3] bg-[#f0faf3] px-4 py-3 text-sm text-[#245c36]"><span>{publicationNotice}</span><button type="button" onClick={() => setPublicationNotice(null)} aria-label="알림 닫기">닫기</button></div>}
                <div className="mb-6">
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center justify-between">
                            <h1 className="text-[24px] md:text-[28px] leading-none font-medium text-[#111111] tracking-tight">블로그</h1>
                            {isAdmin && (
                                <Link
                                    to="/admin/create?type=blog"
                                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#4169E1] px-4 text-[13px] font-semibold text-white shadow-sm shadow-[#4169E1]/20 transition-all hover:bg-[#3458c7] active:scale-95"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    글 추가
                                </Link>
                            )}
                        </div>

                        {/* Divider */}
                        {/* Divider Removed */}

                        {/* Pill Style Tabs */}
                        <div className="flex flex-col gap-4">
                            <div className="-mx-4 flex gap-7 overflow-x-auto border-b border-[#ededed] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
                                {[ALL, ...groups.map(group => group.name)].map((groupName) => (
                                    <button
                                        key={groupName}
                                        onClick={() => selectGroup(groupName)}
                                        aria-pressed={activeGroup === groupName}
                                        className={groupTabClassName(activeGroup === groupName)}
                                    >
                                        {groupName === ALL ? groupName : categoryLabel(groupName)}
                                    </button>
                                ))}
                            </div>

                            {currentGroup && currentGroup.categories.length > 1 && (
                                <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
                                    {['', ...currentGroup.categories].map((category) => (
                                        <button
                                            key={category || 'all'}
                                            onClick={() => setActiveCategory(category)}
                                            aria-pressed={activeCategory === category}
                                            className={categoryChipClassName(activeCategory === category)}
                                        >
                                            {category ? categoryLabel(category) : '전체'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    filteredPosts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-12">
                            {filteredPosts.map((post, index) => (
                                <ProjectCard key={post.id} project={post} index={index + 1} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-[15px] font-medium text-[#888888]">
                            표시할 게시글이 없습니다.
                        </div>
                    )
                )}
            </div>
        </section>
    );
};
