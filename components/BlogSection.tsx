
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { ProjectCard } from './ProjectCard';
import { categoryLabel, categoryService } from '../services/categoryService';
import { categoryIn, isListedIn } from '../utils/entryPlacement';

export const BlogSection: React.FC = () => {
    const [posts, setPosts] = useState<Project[]>([]);
    const [activeTab, setActiveTab] = useState('전체보기');
    const [tabs, setTabs] = useState<string[]>(['전체보기']);

    useEffect(() => {
        let isMounted = true;

        Promise.all([
            projectService.getAllProjects(),
            categoryService.getCategories('blog')
        ]).then(([data, categories]) => {
            if (!isMounted) return;
            // Home page section: private entries stay off it even for the admin.
            const blogPosts = data.filter(p => isListedIn(p, 'blog') && !p.isPrivate);
            setPosts(blogPosts);
            const categoryNames = Array.from(new Set([
                ...categories.map(category => category.name),
                ...blogPosts.map(post => categoryIn(post, 'blog')).filter(Boolean)
            ]));
            setTabs(['전체보기', ...categoryNames]);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredPosts = activeTab === '전체보기'
        ? posts.slice(0, 6)
        : posts.filter(p => categoryIn(p, 'blog') === activeTab).slice(0, 6);

    return (
        <section id="blog" className="py-16 md:py-32 bg-[#ffffff]">
            <div className="max-w-[1440px] mx-auto px-4 md:px-[20px]">
                <div className="mb-4">
                    <div className="flex flex-col gap-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-[24px] md:text-[28px] font-medium text-[#111111] tracking-tight">블로그</h2>
                            <Link to="/blog" className="text-[#666666] hover:text-[#111111] transition-colors text-[15px] font-medium flex items-center gap-1">
                                전체보기
                            </Link>
                        </div>

                        {/* Divider */}
                        {/* Divider Removed */}

                        {/* Pill Style Tabs */}
                        <div className="flex gap-3">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all border ${activeTab === tab
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-12">
                    {filteredPosts.map((p, index) => (
                        <ProjectCard key={p.id} project={p} index={index + 1} />
                    ))}
                </div>
            </div>
        </section>
    );
};
