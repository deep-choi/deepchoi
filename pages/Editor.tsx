
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { isProjectAuthenticationError, projectService } from '../services/projectService';
import { Project } from '../types';
import { EntryEditor } from '../components/EntryEditor';
import { PublicationReview } from '../components/PublicationReview';
import { imageService } from '../services/imageService';
import { normalizeEditorHtml } from '../utils/contentProcessor';
import { categoryLabel, categoryService, CategoryRecord, EntryType, NEWS_GROUP } from '../services/categoryService';
import { useEntryEditor } from '../hooks/useEntryEditor';
import { isListedIn, placementSummary } from '../utils/entryPlacement';

const localDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isEdit = !!id;
    const requestedType = searchParams.get('type') === 'blog' ? 'blog' : 'work';

    const editor = useEntryEditor(isEdit ? `entry:${id}` : 'new');
    const { form, load, patch, clearDraft, editorRef } = editor;
    const isStaticPage = id === 'about' || id === 'contact' || form.type === 'page';

    const [reviewOpen, setReviewOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<CategoryRecord[]>([]);
    const entryLabel = form.type === 'blog' ? '블로그 글' : '프로젝트';
    // News categories are listed on /news, every other blog category on /blog.
    const blogListPath = (category?: string) =>
        categories.some(item => item.type === 'blog' && item.name === category && item.groupName === NEWS_GROUP) ? '/news' : '/blog';
    const cancelTarget = isEdit
        ? (id === 'about' ? '/about' : id === 'contact' ? '/contact' : `/post/${id}`)
        : (form.type === 'blog' ? blogListPath(form.category) : '/work');

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
                if (project) load(project);
            });
            return;
        }

        load({
            title: '',
            subtitle: '',
            description: '',
            tech: [],
            tags: [],
            imageUrl: '',
            category: requestedType === 'blog' ? 'AI' : 'UI UX',
            type: requestedType,
            date: localDate(),
            content: '',
        });
    }, [isEdit, id, requestedType, load]);

    useEffect(() => {
        if (isEdit || isStaticPage || categories.length === 0 || !form.type) return;
        const typeCategories = categories.filter(category => category.type === (form.type as EntryType));
        if (typeCategories.length > 0 && !typeCategories.some(category => category.name === form.category)) {
            patch(prev => ({ ...prev, category: typeCategories[0].name }));
        }
    }, [categories, form.category, form.type, isEdit, isStaticPage, patch]);

    const handleSave = () => {
        // The review confirms what goes public; a private entry skips it.
        if (isListedIn(form, 'blog') && !isStaticPage && !form.isPrivate) {
            setReviewOpen(true);
            return;
        }
        void saveProject();
    };

    const saveProject = async () => {
        if (saving) return;
        setSaving(true);
        const latestContent = editorRef.current?.innerHTML || form.content || '';
        const projectData: Project = {
            id: isEdit ? (id as string) : Date.now().toString(),
            ...form,
            tech: form.tech || [],
            tags: form.tags || [],
            author: form.author || {
                name: 'Choi',
                role: 'UI/UX Designer & Developer',
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
            },
            // Ensure we get the latest content from the ref if state is lagging
            content: normalizeEditorHtml(latestContent)
        } as Project;

        try {
            if (isEdit) {
                await projectService.updateProject(projectData);
            } else {
                await projectService.addProject(projectData);
            }
            clearDraft();
            if (id === 'about') {
                navigate('/about');
            } else if (id === 'contact') {
                navigate('/contact');
            } else if (projectData.type === 'blog') {
                navigate(blogListPath(projectData.category), {
                    state: {
                        publicationNotice: projectData.isPrivate
                            ? '비공개로 저장했습니다. 관리자에게만 보입니다.'
                            : isEdit ? '블로그 글을 저장했습니다.' : '블로그 글을 게시했습니다.'
                    }
                });
            } else if (projectData.type === 'work') {
                navigate('/work');
            } else {
                navigate('/');
            }
        } catch (error) {
            console.error('Save failed:', error);
            if (isProjectAuthenticationError(error)) {
                editor.flushDraft();
                alert('로그인 세션이 만료되었습니다. 다시 로그인한 뒤 저장해 주세요.\n작성 중인 내용은 이 기기에 임시저장되어 있습니다.');
                navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } });
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

    const handleThumbnailUpload = (file: File): Promise<string> => {
        // Optimized size for thumbnails (1200px/0.8) uploaded to R2
        return imageService.uploadImage(file, 1200, 0.8);
    };

    return (
        <>
            <EntryEditor
                state={editor}
                heading={isEdit ? `${entryLabel} 편집` : `${entryLabel} 작성`}
                categories={categories}
                isStaticPage={isStaticPage}
                saving={saving}
                saveLabel={isEdit || form.isPrivate ? '저장' : '게시'}
                onSave={handleSave}
                onExit={() => navigate(cancelTarget)}
                onImageUpload={handleImageUpload}
                onCoverUpload={handleThumbnailUpload}
            />
            {reviewOpen && <PublicationReview title={form.title || ''} category={placementSummary(form, categoryLabel)} date={form.date || ''} editing={isEdit} saving={saving} onCancel={() => setReviewOpen(false)} onConfirm={() => void saveProject()} />}
        </>
    );
};
