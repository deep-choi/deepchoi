
import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { isProjectAuthenticationError, projectService } from '../services/projectService';
import { Project } from '../types';
import { commentService, Comment } from '../services/commentService';
import { EntryEditor } from '../components/EntryEditor';
import { useEntryEditor } from '../hooks/useEntryEditor';
import { PublicationReview } from '../components/PublicationReview';
import { imageService } from '../services/imageService';
import { linkifyHtml, normalizeEditorHtml } from '../utils/contentProcessor';
import { CommentInput } from '../components/CommentInput';
import { moveCarousel, setupCarousel } from '../utils/carousel';
import { categoryLabel, categoryService, CategoryRecord } from '../services/categoryService';
import { isListedIn, placementSummary } from '../utils/entryPlacement';
import { applyDefaultSeo, applyProjectSeo } from '../utils/seo';
import { useAuthUser } from '../hooks/useAuthUser';

const dismissInitialPostLoader = () => {
    const loader = document.getElementById('post-initial-loader');
    const root = document.getElementById('root');

    document.documentElement.removeAttribute('data-post-loading');
    root?.removeAttribute('aria-busy');

    if (!loader) return;

    loader.setAttribute('data-ready', 'true');
    const removeLoader = () => loader.remove();
    loader.addEventListener('transitionend', removeLoader, { once: true });
    window.setTimeout(removeLoader, 260);
};

export const PostDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categories, setCategories] = useState<CategoryRecord[]>([]);
    const contentDisplayRef = useRef<HTMLDivElement>(null);
    const editor = useEntryEditor(`entry:${id}`, isEditing);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState('');
    const currentUser = useAuthUser();
    const isAdmin = currentUser?.role === 'admin';

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const clickStartPosRef = useRef({ x: 0, y: 0 });

    // Comments Logic
    const [comments, setComments] = useState<Comment[]>([]);
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
        if (id) {
            setIsLoading(true);
            // Fetch Project
            projectService.getProjectById(id).then(data => {
                setProject(data);
                setIsLoading(false);
                if (data) {
                    commentService.getComments(data.id).then(setComments);
                } else {
                    setComments([]);
                }
            });
        }
    }, [id]);

    useLayoutEffect(() => {
        if (isLoading) return;
        dismissInitialPostLoader();
    }, [isLoading]);

    useEffect(() => {
        if (project) {
            applyProjectSeo(project);
            return;
        }

        applyDefaultSeo();
    }, [project]);

    useEffect(() => {
        if (!selectedImage) {
            setZoomLevel(1);
            setPanPosition({ x: 0, y: 0 });
        }
    }, [selectedImage]);

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

    useEffect(() => {
        if (isEditing) return;

        const root = contentDisplayRef.current;
        if (!root) return;

        root.querySelectorAll('pre').forEach(pre => {
            if (pre.querySelector(':scope > .code-copy-button')) return;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'code-copy-button';
            button.textContent = '복사';
            button.setAttribute('aria-label', '코드 복사');
            pre.appendChild(button);
        });
    }, [project?.content, isEditing]);

    const handleMouseDown = (e: React.MouseEvent) => {
        clickStartPosRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault();
            setPanPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch event handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            clickStartPosRef.current = { x: touch.clientX, y: touch.clientY };
            setIsDragging(true);
            setDragStart({ x: touch.clientX - panPosition.x, y: touch.clientY - panPosition.y });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging && e.touches.length === 1) {
            e.preventDefault();
            const touch = e.touches[0];
            setPanPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleCommentAdded = useCallback((comment: Comment) => {
        setComments(prev => [comment, ...prev]);
    }, []);

    const handleDeleteComment = async (commentId: string) => {
        if (window.confirm('Delete this comment?')) {
            const success = await commentService.deleteComment(commentId);
            if (success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            } else {
                alert('댓글 삭제에 실패했습니다. 다시 시도해 주세요.');
            }
        }
    };

    const handleDelete = () => {
        console.log('=== DELETE BUTTON CLICKED - OPENING MODAL ===');
        setIsMenuOpen(false);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        console.log('=== CONFIRM DELETE CLICKED ===');
        setIsDeleteModalOpen(false);
        if (project) {
            try {
                console.log('Deleting project with id:', project.id);
                const success = await projectService.deleteProject(project.id);
                console.log('Delete result:', success);
                if (success) {
                    navigate('/');
                } else {
                    alert('삭제에 실패했습니다. 다시 시도해 주세요.');
                }
            } catch (error) {
                console.error('Delete error:', error);
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    const handleSave = () => {
        if (isListedIn({ ...project, ...editor.form }, 'blog')) setReviewOpen(true);
        else void saveProject();
    };

    const saveProject = async () => {
        if (!project || !project.id) return;
        if (saving) return;
        setSaving(true);

        const latestContent = editor.editorRef.current?.innerHTML || editor.form.content || project.content || '';
        const updatedProject: Project = {
            ...project,
            ...editor.form,
            content: normalizeEditorHtml(latestContent),
        };

        try {
            await projectService.updateProject(updatedProject);
            editor.clearDraft();
            setProject(updatedProject);
            setIsEditing(false);
            setReviewOpen(false);
            setSaveNotice('변경사항을 저장했습니다.');
            window.scrollTo({ top: 0 });
        } catch (error) {
            console.error('Save failed:', error);
            if (isProjectAuthenticationError(error)) {
                editor.flushDraft();
                alert('로그인 세션이 만료되었습니다. 다시 로그인한 뒤 저장해 주세요.\n작성 중인 내용은 이 기기에 임시저장되어 있습니다.');
                navigate('/login', {
                    state: { from: { pathname: `/post/${encodeURIComponent(id || project.id)}` } }
                });
                return;
            }
            alert(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = (file: File): Promise<string> => {
        // Upload to R2 via server API (High Quality 1920px/0.9)
        return imageService.uploadImage(file);
    };

    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        const copyButton = target.closest('.code-copy-button') as HTMLButtonElement | null;
        if (copyButton) {
            e.preventDefault();
            e.stopPropagation();

            const code = copyButton.closest('pre')?.querySelector('code')?.textContent || '';
            if (!code) return;

            const markCopied = () => {
                copyButton.textContent = '복사됨';
                window.setTimeout(() => {
                    copyButton.textContent = '복사';
                }, 1600);
            };

            const fallbackCopy = () => {
                const textarea = document.createElement('textarea');
                textarea.value = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
                markCopied();
            };

            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(code).then(markCopied).catch(fallbackCopy);
            } else {
                fallbackCopy();
            }
            return;
        }

        const carouselNav = target.closest('.image-carousel-nav') as HTMLElement | null;
        if (carouselNav) {
            e.preventDefault();
            e.stopPropagation();

            const carousel = carouselNav.closest('.image-carousel') as HTMLElement | null;
            if (!carousel) return;

            const direction = carouselNav.dataset.carouselAction === 'prev' ? -1 : 1;
            moveCarousel(carousel, direction);
            return;
        }

        if (target.tagName === 'IMG') {
            setSelectedImage((target as HTMLImageElement).src);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <p className="text-[#86868b] text-xl font-medium tracking-tight">Project not found.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-[#4169E1] text-white rounded-full font-semibold hover:bg-[#3458c7] transition-all"
                >
                    Go back home
                </button>
            </div>
        );
    }

    if (isEditing) {
        return (
            <>
                <EntryEditor
                    state={editor}
                    heading="포스트 편집"
                    categories={categories}
                    saving={saving}
                    saveLabel="저장"
                    onSave={handleSave}
                    onExit={() => {
                        setIsEditing(false);
                        window.scrollTo({ top: 0 });
                    }}
                    onImageUpload={handleImageUpload}
                    onCoverUpload={handleImageUpload}
                />
                {reviewOpen && <PublicationReview title={editor.form.title || ''} category={placementSummary(editor.form, categoryLabel)} date={editor.form.date || ''} editing saving={saving} onCancel={() => setReviewOpen(false)} onConfirm={() => void saveProject()} />}
            </>
        );
    }

    return (
        <div className="bg-[#ffffff] min-h-screen pt-32 pb-20 px-4 animate-in fade-in duration-700" onClick={() => setIsMenuOpen(false)}>
            {saveNotice && !isEditing && <div role="status" className="mx-auto mb-6 flex max-w-[800px] items-center justify-between rounded-xl border border-[#b9d5c3] bg-[#f0faf3] px-4 py-3 text-sm text-[#245c36]"><span>{saveNotice}</span><button type="button" onClick={() => setSaveNotice('')} aria-label="알림 닫기">닫기</button></div>}
            {/* Image Lightbox Modal */}
            {selectedImage && createPortal(
                <div
                    className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center overflow-hidden"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="relative w-full h-full flex items-start justify-center pt-10"
                        style={{
                            cursor: isDragging ? 'grabbing' : 'grab',
                            touchAction: 'none'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <img
                            src={selectedImage}
                            alt="Zoomed view"
                            className="max-w-[80vw] w-auto h-auto rounded-[8px] object-contain transition-transform duration-200 ease-out select-none md:rounded-[16px]"
                            style={{
                                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                                transformOrigin: 'top center'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                // Click to zoom disabled, only drag allowed
                            }}
                            draggable={false}
                        />
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 rounded-full border border-white/15 bg-[#111111]/90 px-6 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-md z-[110]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => {
                                const newZoom = Math.max(1, zoomLevel / 2);
                                setZoomLevel(newZoom);
                                if (newZoom <= 1.5) setPanPosition({ x: 0, y: 0 })
                            }}
                            className="rounded-full p-1 text-white transition-colors hover:bg-white/15"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                        </button>
                        <span className="text-white font-medium min-w-[4ch] text-center">{Math.round(zoomLevel * 100)}%</span>
                        <button
                            onClick={() => setZoomLevel(Math.min(4, zoomLevel * 2))}
                            className="rounded-full p-1 text-white transition-colors hover:bg-white/15"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-5 right-5 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors z-[110]"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>,
                document.body
            )}

            {/* Custom Delete Confirmation Modal */}
            {isDeleteModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200" onClick={() => setIsDeleteModalOpen(false)}>
                    <div className="bg-[#ffffff] rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-[#e5e5e5] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-[#ff3b30]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[#ff3b30]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-[#111111] mb-2">게시글 삭제</h3>
                            <p className="text-[#86868b]">정말로 이 게시글을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-3 bg-[#f5f5f5] text-[#111111] rounded-xl font-semibold hover:bg-[#e5e5e5] transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3 bg-[#ff3b30] text-white rounded-xl font-semibold hover:bg-[#e5342b] transition-colors"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="max-w-[1200px] mx-auto relative group/page">
                {/* Meta Header */}
                <div className={`mb-12 max-w-[800px] mx-auto text-center relative`}>
                    {/* ... (Admin Actions) ... */}
                    {isAdmin && (
                        <div className="absolute right-0 top-0">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(!isMenuOpen);
                                }}
                                className="p-2 text-[#666666] hover:bg-[#ffffff] hover:text-[#111111] rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#ffffff] rounded-xl shadow-xl shadow-black/30 border border-[#e5e5e5] overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200 text-left">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            editor.load(project);
                                            setIsEditing(true);
                                            window.scrollTo({ top: 0 });
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 text-[14px] font-medium text-[#111111] hover:bg-[#f5f5f5] flex items-center justify-between group"
                                    >
                                        수정하기
                                        <svg className="w-4 h-4 text-[#666666] group-hover:text-[#111111]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <div className="h-[1px] bg-[#e5e5e5] mx-4"></div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleDelete();
                                        }}
                                        className="w-full text-left px-4 py-3 text-[14px] font-medium text-[#ff7b72] hover:bg-[#2d1418] flex items-center justify-between"
                                    >
                                        삭제하기
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                        <div className="flex flex-col items-center">
                            <h1 className="mb-3 text-[28px] font-semibold leading-[1.2] tracking-tightest text-[#111111] md:text-[40px]">
                                {project.title}
                            </h1>
                            {project.subtitle && (
                                <p className="text-[18px] md:text-[22px] text-[#666666] font-medium tracking-tightest leading-[1.4] mb-4">
                                    {project.subtitle}
                                </p>
                            )}
                            <p className="text-[15px] text-[#666666] font-medium tracking-tightest">{project.date}</p>
                        </div>
                </div>

                {/* Cover Image */}
                {project.imageUrl && (
                    <div
                        className="cover-image-container mb-16 w-full max-w-[1000px] mx-auto bg-[#ffffff] rounded-[8px] overflow-hidden shadow-sm cursor-zoom-in md:rounded-[16px]"
                        onClick={() => setSelectedImage(project.imageUrl)}
                    >
                        <img
                            src={project.imageUrl}
                            alt={project.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-auto object-cover transition-opacity duration-1000 opacity-0 hover:scale-[1.01] transition-transform duration-300"
                            onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                        />
                    </div>
                )}

                {/* Content Body */}
                <div
                    className="max-w-[1000px] mx-auto [&_img]:cursor-zoom-in [&_img]:hover:opacity-95 [&_img]:transition-opacity"
                    onClick={handleContentClick}
                >
                        <div ref={contentDisplayRef} className="markdown-body dual-prose prose prose-lg max-w-none prose-headings:text-[#111111] prose-p:text-[#2b2b2b] prose-strong:text-[#111111] prose-ul:text-[#2b2b2b] prose-ol:text-[#2b2b2b] prose-li:text-[#2b2b2b] prose-blockquote:text-[#2b2b2b] prose-a:text-[#4169E1] prose-img:rounded-[8px] md:prose-img:rounded-[16px] prose-headings:m-0 prose-p:m-0 prose-ul:m-0 prose-ol:m-0 prose-li:m-0 prose-blockquote:m-0 prose-pre:m-0" dangerouslySetInnerHTML={{ __html: linkifyHtml(project.content) }} />
                </div>

                {/* Comments Section */}
                <div className="mt-32 max-w-[1200px] mx-auto border-t border-[#e5e5e5] pt-20">
                    {/* ... (existing comments code) ... */}
                    <h3 className="text-2xl font-bold text-[#111111] mb-8">Comments <span className="text-[#666666] text-lg font-normal ml-2">{comments.length}</span></h3>

                    {/* Input Form - Isolated component to prevent re-renders */}
                    <CommentInput
                        projectId={id || ''}
                        currentUser={currentUser}
                        onCommentAdded={handleCommentAdded}
                        onNavigateLogin={() => navigate('/login')}
                    />

                    {/* List */}
                    <div className="space-y-10">
                        {comments.length === 0 && (
                            <p className="text-center text-[#86868b] py-10">No comments yet. Be the first to share!</p>
                        )}
                        {comments.map(comment => (
                            <div key={comment.id} className="flex gap-4 group/comment animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <img src={comment.author.avatarUrl || 'https://ui-avatars.com/api/?name=' + comment.author.name} className="w-10 h-10 rounded-full bg-[#f5f5f7] object-cover" alt="" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#111111] text-[15px]">{comment.author.name}</span>
                                            {comment.author.role === 'admin' && <span className="text-[10px] bg-[#111111] text-[#ffffff] px-2 py-0.5 rounded-full font-bold tracking-wider">AUTHOR</span>}
                                        </div>
                                        {isAdmin && (
                                            <button onClick={() => handleDeleteComment(comment.id)} className="text-[#ff3b30] text-xs font-bold opacity-0 group-hover/comment:opacity-100 transition-all hover:bg-[#ff3b30]/10 px-3 py-1 rounded-full">
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <span className="text-[12px] text-[#666666] font-medium whitespace-nowrap">{new Date(comment.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[#2b2b2b] leading-relaxed text-[15px]">{comment.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
};
