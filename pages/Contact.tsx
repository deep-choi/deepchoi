import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isProjectAuthenticationError, projectService } from '../services/projectService';
import { Project } from '../types';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { RichEditor } from '../components/RichEditor';
import { imageService } from '../services/imageService';
import { linkifyHtml, normalizeEditorHtml } from '../utils/contentProcessor';
import { moveCarousel, setupCarousel } from '../utils/carousel';
import { useAuthUser } from '../hooks/useAuthUser';

export const Contact: React.FC = () => {
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Project>>({});
    const [editSessionId, setEditSessionId] = useState(0);
    const editorRef = useRef<HTMLDivElement>(null);
    const contentDisplayRef = useRef<HTMLDivElement>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const currentUser = useAuthUser();
    const isAdmin = currentUser?.role === 'admin';

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

    useEffect(() => {
        if (isEditing) return;

        const root = contentDisplayRef.current;
        if (!root) return;

        const carousels = Array.from(root.querySelectorAll('.image-carousel')) as HTMLElement[];
        const cleanups = carousels.map(setupCarousel);

        return () => {
            cleanups.forEach(cleanup => cleanup());
        };
    }, [project?.content, isEditing]);

    const handleStartEdit = () => {
        if (!project) return;
        setEditSessionId(prev => prev + 1);
        setEditForm(project);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditForm(project || {});
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!project) return;

        const latestContent = editorRef.current?.innerHTML || editForm.content || project.content || '';
        const updatedProject: Project = {
            ...project,
            ...editForm,
            content: normalizeEditorHtml(latestContent),
        };

        try {
            await projectService.updateProject(updatedProject);
            setProject(updatedProject);
            setIsEditing(false);
            setTimeout(() => setEditForm({}), 100);
        } catch (error) {
            console.error('Save failed:', error);
            if (isProjectAuthenticationError(error)) {
                alert('로그인 세션이 만료되었습니다. 다시 로그인한 뒤 저장해 주세요.');
                navigate('/login', { state: { from: { pathname: '/contact', search: '?edit=1' } } });
                return;
            }
            alert(`Failed to save contact page: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleImageUpload = (file: File): Promise<string> => {
        return imageService.uploadImage(file);
    };

    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const carouselNav = target.closest('.image-carousel-nav') as HTMLElement | null;

        if (!carouselNav) return;

        e.preventDefault();
        e.stopPropagation();

        const carousel = carouselNav.closest('.image-carousel') as HTMLElement | null;
        if (!carousel) return;

        const direction = carouselNav.dataset.carouselAction === 'prev' ? -1 : 1;
        moveCarousel(carousel, direction);
    };

    useEffect(() => {
        if (!project || !isAdmin || isEditing || searchParams.get('edit') !== '1') return;

        setEditSessionId(prev => prev + 1);
        setEditForm(project);
        setIsEditing(true);
        setSearchParams({}, { replace: true });
    }, [project, isAdmin, isEditing, searchParams, setSearchParams]);

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
            <div className="max-w-[1200px] mx-auto px-4 md:px-[20px]">
                {isEditing && (
                    <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#f5f5f5] px-1 py-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e5e5] bg-[#ffffff] text-[#2b2b2b] transition-colors hover:bg-[#f5f5f5] hover:text-[#111111]"
                                aria-label="편집 종료"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-bold tracking-tight text-[#111111]">Contact 편집</h2>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4169E1] px-4 text-sm font-bold text-white shadow-lg shadow-[#4169E1]/20 transition-all hover:bg-[#3458c7] active:scale-95"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            저장
                        </button>
                    </div>
                )}

                {isEditing ? (
                    <div className="space-y-10">
                        <div className="mx-auto max-w-[1000px] space-y-6">
                            <section className="space-y-2">
                                <div className="flex items-end justify-between gap-3">
                                    <label className="text-sm font-bold text-[#111111]">제목</label>
                                    <span className="text-xs font-medium text-[#666666]">{(editForm.title || '').length}/100</span>
                                </div>
                                <input
                                    value={editForm.title || ''}
                                    maxLength={100}
                                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="h-14 w-full rounded-lg border border-[#e5e5e5]/70 bg-[#ffffff]/85 px-4 text-[24px] font-bold tracking-tight text-[#111111] outline-none transition-all placeholder:text-[#888888] focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20"
                                    placeholder="제목"
                                />
                            </section>

                            <section className="space-y-2">
                                <div className="flex items-end justify-between gap-3">
                                    <label className="text-sm font-bold text-[#111111]">설명 <span className="text-[#666666]">(선택)</span></label>
                                    <span className="text-xs font-medium text-[#666666]">{(editForm.subtitle || '').length}/200</span>
                                </div>
                                <textarea
                                    value={editForm.subtitle || ''}
                                    maxLength={200}
                                    onChange={e => setEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                                    className="min-h-[78px] w-full resize-none rounded-lg border border-[#e5e5e5]/70 bg-[#ffffff]/85 px-4 py-3 text-[15px] leading-relaxed text-[#111111] outline-none transition-all placeholder:text-[#888888] focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20"
                                    placeholder="설명"
                                />
                            </section>
                        </div>

                        <div className="mx-auto max-w-[1000px] space-y-2">
                            <MarkdownToolbar onImageUpload={handleImageUpload} />
                            <RichEditor
                                key={editSessionId}
                                editorRef={editorRef}
                                initialContent={editForm.content || ''}
                                onContentChange={(content) => setEditForm(prev => ({ ...prev, content }))}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* Intro */}
                        <div className="mx-auto max-w-[700px]">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-6 text-left">
                                    <h1 className="text-3xl md:text-5xl font-medium text-[#111111] tracking-tight">
                                        {project.title}
                                    </h1>
                                    {project.subtitle && (
                                        <p className="text-lg text-[#666666] leading-relaxed whitespace-pre-line">
                                            {project.subtitle}
                                        </p>
                                    )}
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={handleStartEdit}
                                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#4169E1] px-4 text-[13px] font-semibold text-white shadow-sm shadow-[#4169E1]/20 transition-all hover:bg-[#3458c7] active:scale-95"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Page
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Rich Content Area */}
                        <div className="max-w-[700px] mx-auto" onClick={handleContentClick}>
                            <div
                                ref={contentDisplayRef}
                                className="dual-prose [&_p]:text-[#2b2b2b] [&_li]:text-[#2b2b2b] [&_h1]:!text-[#111111] [&_h2]:!text-[#111111] [&_h3]:!text-[#111111] [&_strong]:!text-[#111111]"
                                dangerouslySetInnerHTML={{ __html: linkifyHtml(project.content || '') }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
