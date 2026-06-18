import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../services/projectService';
import { ProjectCard } from '../components/ProjectCard';

type BlogCategory = '전체보기' | 'AI' | 'UI UX';

export const Blog: React.FC = () => {
    const [posts, setPosts] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<BlogCategory>('전체보기');

    useEffect(() => {
        setIsLoading(true);
        projectService.getAllProjects().then(data => {
            const blogPosts = data.filter(p => p.type === 'blog');
            setPosts(blogPosts);
            setIsLoading(false);
        });
    }, []);

    const filteredPosts = activeTab === '전체보기'
        ? posts
        : posts.filter(p => p.category === activeTab);

    const tabs: BlogCategory[] = ['전체보기', 'AI', 'UI UX'];

    return (
        <section className="py-32 bg-[#ffffff] min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 md:px-[20px]">
                <div className="mb-4">
                    <div className="flex flex-col gap-8">
                        <h1 className="text-[28px] font-medium text-[#111111] tracking-tight">블로그</h1>

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
