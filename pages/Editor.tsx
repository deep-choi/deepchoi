
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { ImageUploader } from '../components/ImageUploader';
import { imageService } from '../services/imageService';
import { normalizeEditorHtml } from '../utils/contentProcessor';


export const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;


    const [formData, setFormData] = useState<Partial<Project>>({
        title: '',
        subtitle: '',
        description: '',
        tech: [],
        tags: [],
        imageUrl: '',
        category: 'UI UX',
        type: 'work',
        date: new Date().toISOString().split('T')[0],
        content: '',
    });

    const isStaticPage = id === 'about' || id === 'contact' || formData.type === 'page';

    const [techInput, setTechInput] = useState('');
    const [tagInput, setTagInput] = useState('');

    const editorRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isEdit && id) {
            projectService.getProjectById(id).then(project => {
                if (project) {
                    setFormData(project);
                    setTechInput(project.tech.join(', '));
                    setTagInput(project.tags.join(', '));

                    // Explicitly set editor content when data is loaded
                    if (editorRef.current) {
                        editorRef.current.innerHTML = project.content || '<p><br></p>';
                    }
                }
            });
        }
    }, [isEdit, id]);

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
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error('Save failed:', error);
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

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'link', 'image'
    ];

    return (
        <div className="pt-32 pb-20 px-6 bg-[#ffffff] min-h-screen font-sans">
            <div className="max-w-[1200px] mx-auto bg-[#ffffff] rounded-[24px] p-6 md:p-10 border border-[#e5e5e5] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
                        {isEdit ? 'Post Edit' : 'New CMS Entry'}
                    </h1>
                    <button onClick={() => navigate('/admin')} className="text-[#666666] hover:text-[#111111] font-medium transition-colors">
                        Cancel
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
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
                                    {formData.type === 'blog' ? (
                                        <>
                                            <option value="AI">AI</option>
                                            <option value="UI UX">UI UX</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="UI UX">UI UX</option>
                                            <option value="바이브코딩">바이브코딩</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#86868b] uppercase tracking-tightest pl-1">Content Type</label>
                                <div className="flex bg-[#ffffff] p-1 rounded-2xl border border-[#e5e5e5]">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'work', category: 'UI UX' })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${formData.type === 'work' ? 'bg-[#4169E1] text-white shadow-sm' : 'text-[#666666] hover:text-[#111111]'}`}
                                    >
                                        Work
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'blog', category: 'AI' })}
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
                        <div
                            contentEditable
                            suppressContentEditableWarning
                            ref={editorRef}
                            onBlur={(e) => setFormData({ ...formData, content: e.currentTarget.innerHTML })}
                            onKeyDown={(e) => {
                                // Handle Enter key to create new p tags
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();

                                    // Use formatBlock to create new paragraph
                                    document.execCommand('insertParagraph', false);
                                }
                            }}
                            onClick={(e) => {
                                // Ensure clicks on empty areas still position cursor
                                const target = e.target as HTMLElement;
                                if (target.tagName === 'BR' || (!target.textContent?.trim() && target.tagName !== 'IMG')) {
                                    const selection = window.getSelection();
                                    if (selection) {
                                        const range = document.createRange();
                                        range.setStart(target, 0);
                                        range.collapse(true);
                                        selection.removeAllRanges();
                                        selection.addRange(range);
                                    }
                                }
                            }}
                            className="editor-prose w-full min-h-[620px] p-5 md:p-8 rounded-2xl border border-[#e5e5e5] bg-[#ffffff] shadow-[0_24px_80px_rgba(0,0,0,0.18)] focus:outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                        />
                        <p className="text-center text-xs text-[#86868b] mt-2">
                            * Click outside the editor to save changes. Editor supports rich text and inline images.
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-[#4169E1] text-white rounded-2xl font-bold text-[17px] hover:bg-[#3458c7] transition-all shadow-lg shadow-[#4169E1]/20 active:scale-[0.98]"
                    >
                        {isEdit ? 'Update Entry' : 'Publish Entry'}
                    </button>
                    <p className="text-center text-xs text-[#86868b]">
                        Note: Images uploaded in the editor are embedded directly.
                        For larger images, consider hosting them externally to improve load times.
                    </p>
                </form>
            </div>
        </div>
    );
};
