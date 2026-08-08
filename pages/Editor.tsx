
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { isProjectAuthenticationError, projectService } from '../services/projectService';
import { Project } from '../types';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { ImageUploader } from '../components/ImageUploader';
import { RichEditor } from '../components/RichEditor';
import { imageService } from '../services/imageService';
import { normalizeEditorHtml } from '../utils/contentProcessor';
import { categoryLabel, categoryService, CategoryRecord, EntryType } from '../services/categoryService';


export const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isEdit = !!id;
    const requestedType = searchParams.get('type') === 'blog' ? 'blog' : 'work';


    const [formData, setFormData] = useState<Partial<Project>>({
        title: '',
        subtitle: '',
        description: '',
        tech: [],
        tags: [],
        imageUrl: '',
        category: requestedType === 'blog' ? 'AI' : 'UI UX',
        type: requestedType,
        date: new Date().toISOString().split('T')[0],
        content: '',
    });

    const isStaticPage = id === 'about' || id === 'contact' || formData.type === 'page';

    const [techInput, setTechInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [categories, setCategories] = useState<CategoryRecord[]>([]);
    const editorRef = React.useRef<HTMLDivElement>(null);
    const entryLabel = formData.type === 'blog' ? '블로그 글' : '프로젝트';
    const cancelTarget = isEdit
        ? (id === 'about' ? '/about' : id === 'contact' ? '/contact' : `/post/${id}`)
        : (formData.type === 'blog' ? '/blog' : '/work');

    useEffect(() => {
        let isMounted = true;

        categoryService.getCategories().then(data => {
            if (isMounted) setCategories(data);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (isEdit && id) {
            projectService.getProjectById(id).then(project => {
                if (project) {
                    setFormData(project);
                    setTechInput(project.tech.join(', '));
                    setTagInput(project.tags.join(', '));
                }
            });
        }
    }, [isEdit, id]);

    useEffect(() => {
        if (isEdit || isStaticPage || categories.length === 0) return;
        const type = (formData.type || requestedType) as EntryType;
        const typeCategories = categories.filter(category => category.type === type);
        if (typeCategories.length > 0 && !typeCategories.some(category => category.name === formData.category)) {
            setFormData(prev => ({ ...prev, category: typeCategories[0].name }));
        }
    }, [categories, formData.category, formData.type, isEdit, isStaticPage, requestedType]);

    const getCategoryOptions = (type?: string): CategoryRecord[] => {
        const entryType = (type === 'blog' ? 'blog' : 'work') as EntryType;
        return categories.filter(category => category.type === entryType);
    };

    const firstCategoryFor = (type: EntryType): string => {
        const option = getCategoryOptions(type)[0];
        if (option) return option.name;
        return type === 'blog' ? 'AI' : 'UI UX';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const latestContent = editorRef.current?.innerHTML || formData.content || '';
        const projectData: Project = {
            id: isEdit ? (id as string) : Date.now().toString(),
            ...formData,
            tech: techInput.split(',').map(s => s.trim()).filter(Boolean),
            tags: tagInput.split(',').map(s => s.trim()).filter(Boolean),
            author: formData.author || {
                name: 'Choi',
                role: 'UI/UX Designer & Developer',
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
            },
            // Ensure we get the latest content from the ref if state is lagging
            content: normalizeEditorHtml(latestContent)
        } as Project;

        console.log('=== SAVING PROJECT ===');
        console.log('Type:', projectData.type);
        console.log('Category:', projectData.category);
        console.log('Full data:', projectData);

        try {
            if (isEdit) {
                await projectService.updateProject(projectData);
            } else {
                await projectService.addProject(projectData);
            }
            if (id === 'about') {
                navigate('/about');
            } else if (id === 'contact') {
                navigate('/contact');
            } else if (projectData.type === 'blog') {
                navigate('/blog');
            } else if (projectData.type === 'work') {
                navigate('/work');
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error('Save failed:', error);
            if (isProjectAuthenticationError(error)) {
                alert('로그인 세션이 만료되었습니다. 다시 로그인한 뒤 저장해 주세요.');
                navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } });
                return;
            }
            alert(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleImageUpload = (file: File): Promise<string> => {
        // Upload to R2 via server API (High Quality 1920px/0.9)
        return imageService.uploadImage(file);
    };

    const handleThumbnailUpload = (file: File): Promise<string> => {
        // Optimized size for thumbnails (1200px/0.8) uploaded to R2
        return imageService.uploadImage(file, 1200, 0.8);
    };

    return (
        <div className="min-h-screen bg-[#ffffff] px-4 pb-20 pt-32 font-sans md:px-[20px]">
            <div className="mx-auto max-w-[1200px]">
                <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#f5f5f5] px-1 py-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(cancelTarget)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e5e5] bg-[#ffffff] text-[#2b2b2b] transition-colors hover:bg-[#f5f5f5] hover:text-[#111111]"
                            aria-label="편집 종료"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-[#111111]">
                                    {isEdit ? `${entryLabel} 편집` : `${entryLabel} 작성`}
                                </h1>
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        form="entry-editor-form"
                        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4169E1] px-4 text-sm font-bold text-white shadow-lg shadow-[#4169E1]/20 transition-all hover:bg-[#3458c7] active:scale-95"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isEdit ? '저장' : '게시'}
                    </button>
                </div>

                <form id="entry-editor-form" onSubmit={handleSubmit} className="space-y-8">
                    {/* Thumbnail Uploader */}
                    {!isStaticPage && (
                        <div className="space-y-2">
                            <ImageUploader
                                imageUrl={formData.imageUrl}
                                onImageUpload={handleThumbnailUpload}
                                onUrlChange={(url) => setFormData({ ...formData, imageUrl: url })}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-tightest pl-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-6 py-4 bg-[#ffffff] rounded-2xl border border-[#e5e5e5] text-[#111111] focus:ring-2 focus:ring-[#4169E1]/30 transition-all outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-tightest pl-1">Subtitle</label>
                            <input
                                type="text"
                                value={formData.subtitle}
                                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                                className="w-full px-6 py-4 bg-[#ffffff] rounded-2xl border border-[#e5e5e5] text-[#111111] focus:ring-2 focus:ring-[#4169E1]/30 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {!isStaticPage && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-tightest pl-1">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                    className="w-full px-6 py-4 bg-[#ffffff] rounded-2xl border border-[#e5e5e5] text-[#111111] focus:ring-2 focus:ring-[#4169E1]/30 transition-all outline-none"
                                >
                                    {getCategoryOptions(formData.type).map(category => (
                                        <option key={category.id} value={category.name}>{categoryLabel(category.name)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-tightest pl-1">Content Type</label>
                                <div className="flex bg-[#ffffff] p-1 rounded-2xl border border-[#e5e5e5]">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'work', category: firstCategoryFor('work') })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${formData.type === 'work' ? 'bg-[#4169E1] text-white shadow-sm' : 'text-[#666666] hover:text-[#111111]'}`}
                                    >
                                        Work
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'blog', category: firstCategoryFor('blog') })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${formData.type === 'blog' ? 'bg-[#4169E1] text-white shadow-sm' : 'text-[#666666] hover:text-[#111111]'}`}
                                    >
                                        Blog
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-tightest pl-1">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-6 py-4 bg-[#ffffff] rounded-2xl border border-[#e5e5e5] text-[#111111] focus:ring-2 focus:ring-[#4169E1]/30 transition-all outline-none"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {!isStaticPage && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-tightest pl-1">Tech Stack</label>
                                <input
                                    type="text"
                                    value={techInput}
                                    onChange={e => setTechInput(e.target.value)}
                                    className="w-full px-6 py-4 bg-[#ffffff] rounded-2xl border border-[#e5e5e5] text-[#111111] placeholder:text-[#888888] focus:ring-2 focus:ring-[#4169E1]/30 transition-all outline-none"
                                    placeholder="Figma, React, Tailwind"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-tightest pl-1">Tags</label>
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    className="w-full px-6 py-4 bg-[#ffffff] rounded-2xl border border-[#e5e5e5] text-[#111111] placeholder:text-[#888888] focus:ring-2 focus:ring-[#4169E1]/30 transition-all outline-none"
                                    placeholder="App, Web, Case Study"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <MarkdownToolbar
                            onImageUpload={handleImageUpload}
                        />
                        <RichEditor
                            editorRef={editorRef}
                            initialContent={formData.content || ''}
                            onContentChange={(content) => setFormData(prev => ({ ...prev, content }))}
                        />
                    </div>

                    <div className="flex justify-end border-t border-[#f5f5f5] pt-6">
                        <button
                            type="submit"
                            className="flex h-11 items-center justify-center rounded-lg bg-[#4169E1] px-5 text-sm font-bold text-white shadow-lg shadow-[#4169E1]/20 transition-all hover:bg-[#3458c7] active:scale-[0.98]"
                        >
                            {isEdit ? '저장' : '게시'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
