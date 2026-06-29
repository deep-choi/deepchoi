
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { authService } from '../services/authService';
import { commentService, Comment } from '../services/commentService';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { RichEditor } from '../components/RichEditor';
import { imageService } from '../services/imageService';
import { linkifyHtml, normalizeEditorHtml } from '../utils/contentProcessor';
import { CommentInput } from '../components/CommentInput';
import { moveCarousel, setupCarousel } from '../utils/carousel';

export const PostDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Project>>({});
    const [tagDraft, setTagDraft] = useState('');
    const contentEditorRef = useRef<HTMLDivElement>(null);
    const contentDisplayRef = useRef<HTMLDivElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [editSessionId, setEditSessionId] = useState(0); // Used as key for contentEditable remount
    const [isCoverUploading, setIsCoverUploading] = useState(false);
    const isAdmin = authService.isAuthenticated();

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const clickStartPosRef = useRef({ x: 0, y: 0 });

    // Comments Logic
    const [comments, setComments] = useState<Comment[]>([]);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        if (id) {
            setIsLoading(true);
            // Fetch Project
            projectService.getProjectById(id).then(data => {
                setProject(data);
                setIsLoading(false);
            });
            // Fetch Comments
            commentService.getComments(id).then(setComments);
        }
    }, [id]);

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

    const handleSave = async () => {
        if (!project || !project.id) return;

        const latestContent = contentEditorRef.current?.innerHTML || editForm.content || project.content || '';
        const updatedProject: Project = {
            ...project,
            ...editForm,
            content: normalizeEditorHtml(latestContent),
        };

        try {
            await projectService.updateProject(updatedProject);
            setProject(updatedProject);
            setIsEditing(false);
            // Clear editForm after a delay to let contentEditable unmount first
            setTimeout(() => setEditForm({}), 100);
        } catch (error) {
            console.error('Save failed:', error);
            alert(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleImageUpload = (file: File): Promise<string> => {
        // Upload to R2 via server API (High Quality 1920px/0.9)
        return imageService.uploadImage(file);
    };

    const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCoverUploading(true);
        try {
            const url = await handleImageUpload(file);
            setEditForm(prev => ({ ...prev, imageUrl: url }));
        } catch (error) {
            console.error('Cover image upload failed:', error);
            alert('커버 이미지 업로드에 실패했습니다.');
        } finally {
            setIsCoverUploading(false);
            if (coverInputRef.current) coverInputRef.current.value = '';
        }
    };

    const addTagsFromDraft = () => {
        const tags = tagDraft
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean);

        if (tags.length === 0) return;

        setEditForm(prev => {
            const currentTags = prev.tags || [];
            return {
                ...prev,
                tags: Array.from(new Set([...currentTags, ...tags]))
            };
        });
        setTagDraft('');
    };

    const removeTag = (tagToRemove: string) => {
        setEditForm(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
        }));
    };

    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

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

    return (
        <div className="bg-[#ffffff] min-h-screen pt-32 pb-20 px-4 animate-in fade-in duration-700" onClick={() => setIsMenuOpen(false)}>
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
                {isEditing && (
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#f5f5f5] px-1 py-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(false);
                                    setEditForm(project);
                                    setTagDraft('');
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e5e5] bg-[#ffffff] text-[#2b2b2b] hover:bg-[#f5f5f5] hover:text-[#111111] transition-colors"
                                aria-label="편집 종료"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-bold tracking-tight text-[#111111]">포스트 편집</h2>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSave();
                                }}
                                className="h-10 px-4 bg-[#4169E1] rounded-lg shadow-lg shadow-[#4169E1]/20 flex items-center gap-2 justify-center text-white font-bold text-sm hover:bg-[#3458c7] active:scale-95 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                저장
                            </button>
                        </div>
                    </div>
                )}

                {/* Meta Header */}
                <div className={`${isEditing ? 'mb-8 max-w-[1200px] mx-auto text-left' : 'mb-12 max-w-[800px] mx-auto text-center'} relative`}>
                    {/* ... (Admin Actions) ... */}
                    {isAdmin && !isEditing && (
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
                                            setEditSessionId(prev => prev + 1);
                                            setIsEditing(true);
                                            setEditForm(project);
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

                    {isEditing ? (
                        <div>
                            <div className="space-y-6">
                                <section className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-[#111111]">커버 이미지</label>
                                    </div>
                                    <div className="group relative overflow-hidden rounded-[8px] bg-[#ffffff] aspect-[16/3] min-h-[150px] ring-1 ring-white/5 md:rounded-[16px]">
                                        {editForm.imageUrl ? (
                                            <img src={editForm.imageUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm font-semibold text-[#666666]">
                                                커버 이미지를 추가하세요
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => coverInputRef.current?.click()}
                                            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg bg-[#ffffff]/85 px-3 py-2 text-sm font-bold text-[#111111] backdrop-blur-md ring-1 ring-white/10 hover:bg-[#f5f5f5] transition-colors"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4-4a2 2 0 012.8 0L14 15m-1-1l1-1a2 2 0 012.8 0L20 16M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                                            커버 변경
                                        </button>
                                        {editForm.imageUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setEditForm(prev => ({ ...prev, imageUrl: '' }))}
                                                className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[#ffffff]/85 text-[#2b2b2b] backdrop-blur-md ring-1 ring-white/10 hover:bg-[#2d1418] hover:text-[#ff7b72] transition-colors"
                                                aria-label="커버 삭제"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16m-9-3h2a1 1 0 011 1v2h-4V5a1 1 0 011-1z" /></svg>
                                            </button>
                                        )}
                                        {isCoverUploading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-[#ffffff]/70 backdrop-blur-sm">
                                                <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#4169E1] border-t-transparent"></div>
                                            </div>
                                        )}
                                    </div>
                                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverImageChange} />
                                </section>

                                <section className="space-y-2">
                                    <div className="flex items-end justify-between gap-3">
                                        <label className="text-sm font-bold text-[#111111]">제목</label>
                                        <span className="text-xs font-medium text-[#666666]">{(editForm.title || '').length}/100</span>
                                    </div>
                                    <input
                                        value={editForm.title || ''}
                                        maxLength={100}
                                        onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="h-14 w-full rounded-lg border border-[#e5e5e5]/70 bg-[#ffffff]/85 px-4 text-[24px] font-bold tracking-tight text-[#111111] placeholder:text-[#888888] outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
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
                                        className="min-h-[78px] w-full resize-none rounded-lg border border-[#e5e5e5]/70 bg-[#ffffff]/85 px-4 py-3 text-[15px] leading-relaxed text-[#111111] placeholder:text-[#888888] outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                        placeholder="설명"
                                    />
                                </section>

                                <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_minmax(260px,1fr)]">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#111111]">카테고리</label>
                                        <div className="flex h-12 items-center gap-2 rounded-lg border border-[#e5e5e5]/70 bg-[#ffffff]/85 px-2">
                                            <div className="flex bg-transparent">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, type: 'work', category: 'UI UX' }))}
                                                    className={`h-9 px-4 rounded-lg text-sm font-bold transition-all ${editForm.type === 'work' ? 'bg-[#4169E1] text-white shadow-sm' : 'text-[#666666] hover:text-[#111111]'}`}
                                                >
                                                    Work
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, type: 'blog', category: 'AI' }))}
                                                    className={`h-9 px-4 rounded-lg text-sm font-bold transition-all ${editForm.type === 'blog' ? 'bg-[#4169E1] text-white shadow-sm' : 'text-[#666666] hover:text-[#111111]'}`}
                                                >
                                                    Blog
                                                </button>
                                            </div>
                                            <select
                                                value={editForm.category || 'UI UX'}
                                                onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value as any }))}
                                                className="ml-auto h-9 min-w-[120px] rounded-lg border border-[#e5e5e5]/70 bg-[#ffffff] px-3 text-sm font-bold text-[#111111] outline-none focus:ring-2 focus:ring-[#4169E1]/30"
                                            >
                                                {editForm.type === 'blog' ? (
                                                    <>
                                                        <option value="AI">AI</option>
                                                        <option value="UI UX">UI UX</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="UI UX">UI/UX</option>
                                                        <option value="바이브코딩">바이브코딩</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#111111]">공개일</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={editForm.date}
                                                onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                                className="dark-date-input h-12 w-full rounded-lg border border-[#e5e5e5]/70 bg-[#ffffff]/85 px-4 pr-11 text-sm font-bold text-[#111111] outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                            />
                                            <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111111]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[#111111]">태그</label>
                                        <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-[#e5e5e5]/70 bg-[#ffffff]/85 px-3 py-2">
                                            {(editForm.tags || []).map(tag => (
                                                <span key={tag} className="inline-flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-1.5 text-xs font-bold text-[#111111]">
                                                    {tag}
                                                    <button type="button" onClick={() => removeTag(tag)} className="text-[#666666] hover:text-[#ff7b72]" aria-label={`${tag} 태그 삭제`}>
                                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </span>
                                            ))}
                                            <input
                                                value={tagDraft}
                                                onChange={e => setTagDraft(e.target.value)}
                                                onBlur={addTagsFromDraft}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' || e.key === ',') {
                                                        e.preventDefault();
                                                        addTagsFromDraft();
                                                    }
                                                }}
                                                className="h-7 min-w-[110px] flex-1 bg-transparent text-sm font-medium text-[#111111] placeholder:text-[#888888] outline-none"
                                                placeholder="+ 태그 추가"
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <h1 className="text-[28px] md:text-[40px] font-bold text-[#111111] tracking-tightest leading-[1.2] mb-3">
                                {project.title}
                            </h1>
                            {project.subtitle && (
                                <p className="text-[18px] md:text-[22px] text-[#666666] font-medium tracking-tightest leading-[1.4] mb-4">
                                    {project.subtitle}
                                </p>
                            )}
                            <p className="text-[15px] text-[#666666] font-medium tracking-tightest">{project.date}</p>
                        </div>
                    )}
                </div>

                {/* Cover Image */}
                {!isEditing && project.imageUrl && (
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
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <MarkdownToolbar
                                    onImageUpload={handleImageUpload}
                                />
                                <RichEditor
                                    key={editSessionId}
                                    editorRef={contentEditorRef}
                                    initialContent={editForm.content || ''}
                                    onContentChange={(content) => setEditForm(prev => ({ ...prev, content }))}
                                />
                            </div>
                        </div>
                    ) : (
                        <div ref={contentDisplayRef} className="markdown-body dual-prose prose prose-lg max-w-none prose-headings:text-[#111111] prose-p:text-[#2b2b2b] prose-strong:text-[#111111] prose-ul:text-[#2b2b2b] prose-ol:text-[#2b2b2b] prose-li:text-[#2b2b2b] prose-blockquote:text-[#2b2b2b] prose-a:text-[#4169E1] prose-img:rounded-[8px] md:prose-img:rounded-[16px] prose-headings:m-0 prose-p:m-0 prose-ul:m-0 prose-ol:m-0 prose-li:m-0 prose-blockquote:m-0 prose-pre:m-0" dangerouslySetInnerHTML={{ __html: linkifyHtml(project.content) }} />
                    )}
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
