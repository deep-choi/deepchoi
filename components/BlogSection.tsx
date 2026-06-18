
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { ProjectCard } from './ProjectCard';

type BlogCategory = '전체보기' | 'AI' | 'UI UX';

export const BlogSection: React.FC = () => {
    const [posts, setPosts] = useState<Project[]>([]);
    const [activeTab, setActiveTab] = useState<BlogCategory>('전체보기');

    useEffect(() => {
        projectService.getAllProjects().then(data => {
            const blogPosts = data.filter(p => p.type === 'blog');
            setPosts(blogPosts);
        });
    }, []);

    const filteredPosts = activeTab === '전체보기'
        ? posts.slice(0, 6)
        : posts.filter(p => p.category === activeTab).slice(0, 6);

    const tabs: BlogCategory[] = ['전체보기', 'AI', 'UI UX'];

    return (
        <section id="blog" className="py-16 md:py-32 bg-[#ffffff]">
            <div className="max-w-[1440px] mx-auto px-[20px]">
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
                                    {tab}
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
