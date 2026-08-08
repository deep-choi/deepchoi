import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Project } from '../types';
import { projectService } from '../services/projectService';
import { ProjectCard } from '../components/ProjectCard';
import { categoryLabel, categoryService, findCategoryByQuery } from '../services/categoryService';
import { useAuthUser } from '../hooks/useAuthUser';

export const Blog: React.FC = () => {
    const [posts, setPosts] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('전체보기');
    const [tabs, setTabs] = useState<string[]>(['전체보기']);
    const location = useLocation();
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
            const blogPosts = data.filter(p => p.type === 'blog');
            setPosts(blogPosts);
            const categoryNames = Array.from(new Set([
                ...categories.map(category => category.name),
                ...blogPosts.map(post => post.category).filter(Boolean)
            ]));
            setTabs(['전체보기', ...categoryNames]);
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const queryCategory = new URLSearchParams(location.search).get('category');
        if (!queryCategory) {
            setActiveTab('전체보기');
            return;
        }

        const matchedCategory = findCategoryByQuery(tabs.filter(tab => tab !== '전체보기'), queryCategory);
        setActiveTab(matchedCategory || '전체보기');
    }, [location.search, tabs]);

    const filteredPosts = activeTab === '전체보기'
        ? posts
        : posts.filter(p => p.category === activeTab);

    return (
        <section className="py-32 bg-[#ffffff] min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 md:px-[20px]">
                <div className="mb-4">
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
                        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    aria-pressed={activeTab === tab}
                                    className={`shrink-0 whitespace-nowrap rounded-lg border px-4 py-2 text-[13px] font-medium transition-all ${activeTab === tab
                                        ? 'bg-[#4169E1] border-[#4169E1] text-white'
                                        : 'bg-white border-[#e5e5e5] text-[#666666] hover:border-[#4169E1] hover:text-[#111111]'
                                        }`}
                                >
                                    {tab === '전체보기' ? tab : categoryLabel(tab)}
                                </button>
                            ))}
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
