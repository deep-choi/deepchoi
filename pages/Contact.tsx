import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { authService } from '../services/authService';

export const Contact: React.FC = () => {
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const isAdmin = authService.isAuthenticated();

    useEffect(() => {
        setIsLoading(true);
        projectService.getProjectById('contact')
            .then(data => {
                setProject(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch Contact page data", err);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!project) return <div>Failed to load content</div>;

    return (
        <section className="py-32 bg-[#ffffff] min-h-screen overflow-x-hidden">
            <div className="max-w-[1200px] mx-auto px-4 md:px-[20px] space-y-16">

                {/* Intro */}
                <div className="space-y-6 text-left max-w-[700px] mx-auto">
                    <h1 className="text-3xl md:text-5xl font-medium text-[#111111] tracking-tight">
                        {project.title}
                    </h1>
                    {project.subtitle && (
                        <p className="text-lg text-[#666666] leading-relaxed whitespace-pre-line">
                            {project.subtitle}
                        </p>
                    )}
                </div>

                {/* Rich Content Area */}
                <div className="max-w-[700px] mx-auto">
                    <div
                        className="dual-prose [&_p]:text-[#2b2b2b] [&_li]:text-[#2b2b2b] [&_h1]:!text-[#111111] [&_h2]:!text-[#111111] [&_h3]:!text-[#111111] [&_strong]:!text-[#111111]"
                        dangerouslySetInnerHTML={{ __html: project.content || '' }}
                    />
                </div>

                {/* Edit Button */}
                {isAdmin && (
                    <button
                        onClick={() => navigate('/admin/edit/contact')}
                        className="fixed bottom-10 right-10 px-6 py-3 bg-[#4169E1] text-white rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all z-50 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit Page
                    </button>
                )}
            </div>
        </section>
    );
};
