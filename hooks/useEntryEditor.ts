import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Project } from '../types';

type EntryForm = Partial<Project>;

interface StoredDraft {
    form: EntryForm;
    savedAt: number;
}

const DRAFT_PREFIX = 'deepchoi:draft:';
const AUTOSAVE_DELAY = 1500;

const readDraft = (key: string): StoredDraft | null => {
    try {
        const raw = localStorage.getItem(DRAFT_PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredDraft;
        return parsed && typeof parsed.savedAt === 'number' && parsed.form ? parsed : null;
    } catch {
        return null;
    }
};

const writeDraft = (key: string, draft: StoredDraft) => {
    try {
        localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(draft));
        return true;
    } catch {
        // Storage can be full or blocked; the editor must keep working without drafts.
        return false;
    }
};

const removeDraft = (key: string) => {
    try {
        localStorage.removeItem(DRAFT_PREFIX + key);
    } catch {
        // Ignore blocked storage.
    }
};

const sameEntry = (a: EntryForm, b: EntryForm) =>
    (a.title || '') === (b.title || '')
    && (a.subtitle || '') === (b.subtitle || '')
    && (a.content || '') === (b.content || '');

/**
 * Shared state for the post editor: form data, dirty tracking, local drafts
 * and the browser leave warning. Used by both the create page and inline edit.
 */
export const useEntryEditor = (draftKey: string, enabled = true) => {
    const [form, setForm] = useState<EntryForm>({});
    const [dirty, setDirty] = useState(false);
    const [editorKey, setEditorKey] = useState(0);
    const [pendingDraft, setPendingDraft] = useState<StoredDraft | null>(null);
    const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    /** Replace the form with freshly loaded data and offer a newer local draft, if any. */
    const load = useCallback((data: EntryForm) => {
        setForm(data);
        setDirty(false);
        setDraftSavedAt(null);
        setEditorKey(key => key + 1);
        const stored = readDraft(draftKey);
        setPendingDraft(stored && !sameEntry(stored.form, data) ? stored : null);
    }, [draftKey]);

    /** Change form fields from a user action. */
    const update = useCallback((updater: (prev: EntryForm) => EntryForm) => {
        setForm(updater);
        setDirty(true);
    }, []);

    /** Adjust fields programmatically (e.g. default category) without marking the form dirty. */
    const patch = useCallback((updater: (prev: EntryForm) => EntryForm) => {
        setForm(updater);
    }, []);

    /** Sync body HTML without marking the form dirty (blur also reports content). */
    const syncContent = useCallback((content: string) => {
        setForm(prev => (prev.content === content ? prev : { ...prev, content }));
    }, []);

    const markEdited = useCallback(() => setDirty(true), []);

    const restoreDraft = useCallback(() => {
        if (!pendingDraft) return;
        setForm(prev => ({ ...prev, ...pendingDraft.form }));
        setEditorKey(key => key + 1);
        setDirty(true);
        setPendingDraft(null);
    }, [pendingDraft]);

    const discardDraft = useCallback(() => {
        removeDraft(draftKey);
        setPendingDraft(null);
    }, [draftKey]);

    /** Call after a successful save. */
    const clearDraft = useCallback(() => {
        removeDraft(draftKey);
        setDirty(false);
        setDraftSavedAt(null);
        setPendingDraft(null);
    }, [draftKey]);

    /** Write the local draft right away (autosave otherwise waits for a pause in typing). */
    const flushDraft = useCallback(() => {
        if (!enabled || !dirty) return;
        const savedAt = Date.now();
        const content = editorRef.current?.innerHTML ?? form.content ?? '';
        if (writeDraft(draftKey, { form: { ...form, content }, savedAt })) {
            setDraftSavedAt(savedAt);
        }
    }, [enabled, dirty, form, draftKey]);

    useEffect(() => {
        if (!enabled || !dirty) return;
        const timer = window.setTimeout(flushDraft, AUTOSAVE_DELAY);
        return () => window.clearTimeout(timer);
    }, [enabled, dirty, flushDraft]);

    useEffect(() => {
        if (!enabled || !dirty) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [enabled, dirty]);

    return {
        form,
        update,
        patch,
        load,
        syncContent,
        markEdited,
        dirty,
        editorKey,
        editorRef: editorRef as React.RefObject<HTMLDivElement>,
        pendingDraft,
        restoreDraft,
        discardDraft,
        clearDraft,
        flushDraft,
        draftSavedAt
    };
};

export type EntryEditorState = ReturnType<typeof useEntryEditor>;
