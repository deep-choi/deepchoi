import React, { useEffect, useRef, useState } from 'react';
import { imageService } from '../services/imageService';

interface MarkdownToolbarProps {
    onImageUpload?: (file: File) => Promise<string>;
    onInsertContent?: (content: string) => void;
}

type ToolbarMenu = 'code' | 'grid' | 'lineHeight' | 'color' | 'link' | null;

interface ActiveFormats {
    block: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    inlineCode: boolean;
    link: boolean;
}

const emptyFormats: ActiveFormats = {
    block: 'P',
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    inlineCode: false,
    link: false
};

const codeLanguages = [
    { value: 'plaintext', label: '텍스트' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'python', label: 'Python' },
    { value: 'bash', label: 'Bash' }
];

const icons = {
    undo: 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3',
    redo: 'M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3',
    inlineCode: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
    quote: 'M7.5 8.25h-3v4.5h3v-4.5zm0 0c0 3-1.5 4.5-3 5.25M16.5 8.25h-3v4.5h3v-4.5zm0 0c0 3-1.5 4.5-3 5.25',
    divider: 'M4 12h16',
    codeBlock: 'M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z',
    link: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
    image: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
    grid: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    slides: 'M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122',
    video: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z',
    lineHeight: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
    chevron: 'M19.5 8.25l-7.5 7.5-7.5-7.5'
};

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const selectionElement = (): HTMLElement | null => {
    const anchor = window.getSelection()?.anchorNode;
    if (!anchor) return null;
    return anchor.nodeType === Node.ELEMENT_NODE ? anchor as HTMLElement : anchor.parentElement;
};

const Icon: React.FC<{ d: string; className?: string }> = ({ d, className = 'h-[18px] w-[18px]' }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

const ToolButton: React.FC<{
    label: string;
    onPress: () => void;
    active?: boolean;
    wide?: boolean;
    children: React.ReactNode;
}> = ({ label, onPress, active = false, wide = false, children }) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        // mousedown keeps the editor selection; click with detail 0 is keyboard activation.
        onMouseDown={(e) => { e.preventDefault(); onPress(); }}
        onClick={(e) => { if (e.detail === 0) onPress(); }}
        className={`flex h-8 shrink-0 items-center justify-center gap-1 rounded-md text-[13px] font-semibold transition-colors ${wide ? 'px-2' : 'w-8'} ${active
            ? 'bg-[#eef2ff] text-[#4169E1]'
            : 'text-[#444444] hover:bg-[#f2f2f2] hover:text-[#111111]'
            }`}
    >
        {children}
    </button>
);

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-[#e5e5e5]" aria-hidden="true" />;

const MenuPanel: React.FC<{ align?: 'left' | 'right'; className?: string; children: React.ReactNode }> = ({ align = 'left', className = '', children }) => (
    <div className={`absolute top-full z-40 mt-2 rounded-xl border border-[#e5e5e5] bg-white p-1.5 shadow-[0_12px_32px_rgba(17,17,17,0.12)] ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}>
        {children}
    </div>
);

const MenuItem: React.FC<{ onPress: () => void; children: React.ReactNode }> = ({ onPress, children }) => (
    <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onPress(); }}
        onClick={(e) => { if (e.detail === 0) onPress(); }}
        className="flex h-9 w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 text-left text-sm font-medium text-[#111111] hover:bg-[#f5f5f5]"
    >
        {children}
    </button>
);

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onImageUpload, onInsertContent }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const gridInputRef = useRef<HTMLInputElement>(null);
    const carouselInputRef = useRef<HTMLInputElement>(null);
    const savedRangeRef = useRef<Range | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [gridColumns, setGridColumns] = useState<number>(2);
    const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [formats, setFormats] = useState<ActiveFormats>(emptyFormats);

    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        const range = savedRangeRef.current;
        const selection = window.getSelection();
        if (!range || !selection) return;
        const start = range.startContainer;
        const root = (start.nodeType === Node.ELEMENT_NODE ? start as HTMLElement : start.parentElement)
            ?.closest('[contenteditable="true"]') as HTMLElement | null;
        root?.focus({ preventScroll: true });
        selection.removeAllRanges();
        selection.addRange(range);
    };

    // Direct DOM edits (color, line height, code blocks) do not fire input events,
    // so tell the editor about them for dirty tracking and autosave.
    const notifyChange = () => {
        const root = selectionElement()?.closest('[contenteditable="true"]')
            ?? document.querySelector('.editor-prose[contenteditable="true"]');
        root?.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const runCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        refreshFormats();
    };

    const refreshFormats = () => {
        const element = selectionElement();
        if (!element?.closest('[contenteditable="true"]')) return;
        const block = element.closest('h1, h2, h3, blockquote, pre, p, li');
        setFormats({
            block: block?.tagName || 'P',
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strike: document.queryCommandState('strikeThrough'),
            inlineCode: Boolean(element.closest('code') && !element.closest('pre')),
            link: Boolean(element.closest('a'))
        });
    };

    useEffect(() => {
        document.addEventListener('selectionchange', refreshFormats);
        return () => document.removeEventListener('selectionchange', refreshFormats);
    }, []);

    useEffect(() => {
        if (!openMenu) return;
        const close = (event: MouseEvent) => {
            if (!toolbarRef.current?.contains(event.target as Node)) setOpenMenu(null);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [openMenu]);

    const toggleMenu = (menu: Exclude<ToolbarMenu, null>) => {
        saveSelection();
        setOpenMenu(current => (current === menu ? null : menu));
    };

    const openLinkMenu = () => {
        saveSelection();
        setLinkUrl(selectionElement()?.closest('a')?.getAttribute('href') || '');
        setOpenMenu('link');
    };

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
            if (!(document.activeElement as HTMLElement | null)?.isContentEditable) return;
            event.preventDefault();
            openLinkMenu();
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    const normalizeUrl = (value: string) => {
        const url = value.trim();
        if (!url) return '';
        if (/^(https?:|mailto:|\/|#)/i.test(url)) return url;
        return `https://${url}`;
    };

    const applyLink = () => {
        const url = normalizeUrl(linkUrl);
        setOpenMenu(null);
        if (!url) return;
        restoreSelection();
        const existing = selectionElement()?.closest('a');
        const range = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null;
        if (existing) {
            existing.setAttribute('href', url);
            notifyChange();
        } else if (!range || range.collapsed) {
            document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
        } else {
            document.execCommand('createLink', false, url);
        }
        savedRangeRef.current = null;
        refreshFormats();
    };

    const removeLink = () => {
        setOpenMenu(null);
        restoreSelection();
        const existing = selectionElement()?.closest('a');
        const selection = window.getSelection();
        if (existing && selection) {
            const range = document.createRange();
            range.selectNodeContents(existing);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        document.execCommand('unlink', false);
        savedRangeRef.current = null;
        refreshFormats();
    };

    const toggleInlineCode = () => {
        const element = selectionElement();
        const code = element?.closest('code');
        if (code && !code.closest('pre')) {
            code.replaceWith(...Array.from(code.childNodes));
            notifyChange();
            refreshFormats();
            return;
        }
        const selection = window.getSelection();
        if (!selection?.rangeCount || selection.getRangeAt(0).collapsed) return;
        document.execCommand('insertHTML', false, `<code>${escapeHtml(selection.toString())}</code>`);
        refreshFormats();
    };

    const insertContent = (content: string) => {
        if (onInsertContent) {
            onInsertContent(content);
            return;
        }

        const selection = window.getSelection();
        if (savedRangeRef.current && selection) {
            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);
        }

        document.execCommand('insertHTML', false, content);
        savedRangeRef.current = null;
    };

    // Apply color to the current block element (p, h1, h2, h3)
    const applyColorToBlock = (color: string) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);

        // Find the block element containing the selection
        let node: Node | null = range.startContainer;
        let blockElement: HTMLElement | null = null;

        while (node && node !== document.body) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const tagName = el.tagName.toLowerCase();

                // Skip contentEditable container
                if (el.getAttribute('contenteditable') === 'true') {
                    break;
                }

                if (['p', 'h1', 'h2', 'h3', 'div'].includes(tagName)) {
                    blockElement = el;
                    break;
                }
            }
            node = node.parentNode;
        }

        // If no block found or it's a div, first convert to P
        if (!blockElement || blockElement.tagName === 'DIV') {
            document.execCommand('formatBlock', false, 'P');
            // After formatBlock, find the new P element
            const newSelection = window.getSelection();
            if (newSelection && newSelection.rangeCount > 0) {
                const newRange = newSelection.getRangeAt(0);
                let newNode: Node | null = newRange.startContainer;
                while (newNode && newNode !== document.body) {
                    if (newNode.nodeType === Node.ELEMENT_NODE) {
                        const el = newNode as HTMLElement;
                        if (el.tagName === 'P') {
                            blockElement = el;
                            break;
                        }
                    }
                    newNode = newNode.parentNode;
                }
            }
        }

        // Apply color to the block
        if (blockElement && blockElement instanceof HTMLElement) {
            blockElement.style.color = color;
        }
    };

    // Apply block format (h1, h2, h3, p)
    // Partial selection: only selected text becomes new block type
    // Full selection or no selection: entire block changes
    const format = (tag: string) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) {
            document.execCommand('formatBlock', false, tag);
            return;
        }

        const range = selection.getRangeAt(0);

        // No selection (cursor only) - format entire block
        if (range.collapsed) {
            document.execCommand('formatBlock', false, tag);
            return;
        }

        // Get selected text
        const selectedText = range.toString();
        if (!selectedText.trim()) {
            document.execCommand('formatBlock', false, tag);
            return;
        }

        // Find the parent block element
        let node: Node | null = range.startContainer;
        let parentBlock: HTMLElement | null = null;

        while (node && node !== document.body) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                if (['P', 'H1', 'H2', 'H3', 'DIV'].includes(el.tagName)) {
                    // Skip if this is the contentEditable container
                    if (el.getAttribute('contenteditable') !== 'true') {
                        parentBlock = el;
                        break;
                    }
                }
            }
            node = node.parentNode;
        }

        // If entire block is selected, just use formatBlock
        if (parentBlock && parentBlock.textContent?.trim() === selectedText.trim()) {
            document.execCommand('formatBlock', false, tag);
            return;
        }

        // Partial selection: need to split the block
        if (parentBlock) {
            try {
                const grandParent = parentBlock.parentNode;
                if (!grandParent) {
                    document.execCommand('formatBlock', false, tag);
                    return;
                }

                // Get content before selection
                const beforeRange = document.createRange();
                beforeRange.setStart(parentBlock, 0);
                beforeRange.setEnd(range.startContainer, range.startOffset);
                const beforeText = beforeRange.toString();

                // Get content after selection
                const afterRange = document.createRange();
                afterRange.setStart(range.endContainer, range.endOffset);
                afterRange.setEndAfter(parentBlock.lastChild || parentBlock);
                const afterText = afterRange.toString();

                // Create new elements
                const beforeElement = beforeText.trim() ? document.createElement(parentBlock.tagName.toLowerCase()) : null;
                const selectedElement = document.createElement(tag.toLowerCase());
                const afterElement = afterText.trim() ? document.createElement(parentBlock.tagName.toLowerCase()) : null;

                // Copy content
                if (beforeElement) {
                    beforeElement.innerHTML = beforeRange.extractContents().textContent || '';
                }
                selectedElement.textContent = range.extractContents().textContent || '';
                if (afterElement) {
                    afterElement.innerHTML = afterRange.extractContents().textContent || '';
                }

                // Insert new elements
                if (beforeElement) grandParent.insertBefore(beforeElement, parentBlock);
                grandParent.insertBefore(selectedElement, parentBlock);
                if (afterElement) grandParent.insertBefore(afterElement, parentBlock);

                // Remove original
                grandParent.removeChild(parentBlock);

                // Select the new element
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNodeContents(selectedElement);
                selection.addRange(newRange);
            } catch (e) {
                console.warn('Partial format failed:', e);
                document.execCommand('formatBlock', false, tag);
            }
        } else {
            document.execCommand('formatBlock', false, tag);
        }
    };

    const handleImageClick = () => {
        saveSelection();
        if (onImageUpload && fileInputRef.current) {
            fileInputRef.current.click();
        } else {
            const url = prompt('Enter image URL:');
            if (url) {
                const imgHtml = `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />`;
                insertContent(imgHtml);
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onImageUpload) {
            try {
                const url = await onImageUpload(file);
                const imgHtml = `<img src="${url}" alt="Uploaded image" class="full-width" style="border-radius: 8px; margin: 16px 0;" />`;
                insertContent(imgHtml);
            } catch (error) {
                console.error('Image upload failed:', error);
                alert('Failed to upload image');
            }
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleGridClick = (columns: number) => {
        saveSelection();
        setGridColumns(columns);
        if (gridInputRef.current) {
            gridInputRef.current.click();
        }
    };

    const handleGridFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !onImageUpload) {
            if (gridInputRef.current) gridInputRef.current.value = '';
            return;
        }

        try {
            const urls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const url = await onImageUpload(files[i]);
                urls.push(url);
            }

            // Calculate width percentage based on grid columns
            const gridClass = gridColumns === 2 ? 'image-grid image-grid-2'
                : gridColumns === 3 ? 'image-grid image-grid-3'
                    : 'image-grid image-grid-4';

            // Create grid HTML with CSS classes for responsive behavior
            const imagesHtml = urls.map(url =>
                `<img src="${url}" alt="Grid image" />`
            ).join('');

            const gridHtml = `<div class="${gridClass}">${imagesHtml}</div>`;

            insertContent(gridHtml);
        } catch (error) {
            console.error('Grid image upload failed:', error);
            alert('이미지 업로드에 실패했습니다.');
        }

        if (gridInputRef.current) {
            gridInputRef.current.value = '';
        }
    };

    const handleCarouselClick = () => {
        saveSelection();
        if (carouselInputRef.current) {
            carouselInputRef.current.click();
        }
    };

    const handleCarouselFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!onImageUpload) {
            if (carouselInputRef.current) carouselInputRef.current.value = '';
            return;
        }

        if (files.length < 2) {
            alert('슬라이드는 이미지를 2장 이상 선택해야 합니다.');
            if (carouselInputRef.current) carouselInputRef.current.value = '';
            return;
        }

        if (files.length > 4) {
            alert('슬라이드는 최대 4장까지 선택할 수 있습니다.');
            if (carouselInputRef.current) carouselInputRef.current.value = '';
            return;
        }

        try {
            const urls: string[] = [];
            for (const file of files) {
                const url = await onImageUpload(file);
                urls.push(url);
            }

            const slidesHtml = urls.map((url, index) => (
                `<figure class="image-carousel-slide"><img src="${url}" alt="Slide image ${index + 1}" /></figure>`
            )).join('');
            const carouselHtml = `<div class="image-carousel" data-count="${urls.length}"><div class="image-carousel-track">${slidesHtml}</div><button type="button" class="image-carousel-nav image-carousel-prev" data-carousel-action="prev" aria-label="이전 이미지">&lsaquo;</button><button type="button" class="image-carousel-nav image-carousel-next" data-carousel-action="next" aria-label="다음 이미지">&rsaquo;</button></div>`;

            insertContent(carouselHtml);
        } catch (error) {
            console.error('Carousel image upload failed:', error);
            alert('슬라이드 이미지 업로드에 실패했습니다.');
        }

        if (carouselInputRef.current) {
            carouselInputRef.current.value = '';
        }
    };

    const handleVideoClick = () => {
        saveSelection();
        if (videoInputRef.current) {
            videoInputRef.current.click();
        }
    };

    const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const url = await imageService.uploadVideo(file);
                // Create video element with autoplay, loop, muted (GIF-like behavior)
                const videoHtml = `<video src="${url}" autoplay loop muted playsinline style="width: 100%; max-width: 100%; border-radius: 8px; margin: 16px 0;"></video>`;
                insertContent(videoHtml);
            } catch (error) {
                console.error('Video upload failed:', error);
                alert('동영상 업로드에 실패했습니다. 파일 크기를 확인해주세요.');
            }
        }
        if (videoInputRef.current) {
            videoInputRef.current.value = '';
        }
    };

    const applyLineHeight = (height: string) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);

        const isBlock = (node: Node | null): node is HTMLElement => {
            if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
            const tag = (node as HTMLElement).tagName.toLowerCase();
            return ['div', 'p', 'h1', 'h2', 'h3'].includes(tag);
        };

        if (range.collapsed || (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE)) {
            const parentBlock = range.startContainer.nodeType === Node.TEXT_NODE
                ? range.startContainer.parentElement
                : range.startContainer as HTMLElement;

            const target = parentBlock?.closest('div, p, h1, h2, h3') as HTMLElement;
            if (target) {
                target.style.lineHeight = height;
            } else {
                document.execCommand('formatBlock', false, 'p');
                setTimeout(() => applyLineHeight(height), 0);
            }
            return;
        }

        const ancestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
            ? range.commonAncestorContainer.parentElement
            : range.commonAncestorContainer as HTMLElement;

        if (!ancestor) return;

        const walker = document.createTreeWalker(
            ancestor,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => isBlock(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
            }
        );

        if (isBlock(ancestor)) {
            ancestor.style.lineHeight = height;
        }

        while (walker.nextNode()) {
            const node = walker.currentNode as HTMLElement;
            if (selection.containsNode(node, true)) {
                node.style.lineHeight = height;
            }
        }
    };

    const insertCodeBlock = (language: string) => {
        const selection = window.getSelection();
        if (!selection) return;

        if (savedRangeRef.current) {
            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);
        }

        if (!selection.rangeCount) return;

        // formatBlock keeps the browser's current paragraph selection intact.
        // We then normalize it to the semantic <pre><code> shape used by posts.
        document.execCommand('formatBlock', false, 'pre');

        const anchor = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
            ? selection.anchorNode as HTMLElement
            : selection.anchorNode?.parentElement;
        const pre = anchor?.closest('pre');
        if (!pre) return;

        pre.dataset.language = language;
        if (!pre.querySelector(':scope > code')) {
            const code = document.createElement('code');
            while (pre.firstChild) code.appendChild(pre.firstChild);
            pre.appendChild(code);
        }

        // Keep real, clickable writing space on both sides of a code block.
        // Without these paragraphs a contentEditable surface has no reliable
        // caret target when the author clicks directly above or below the block.
        const createEmptyParagraph = () => {
            const paragraph = document.createElement('p');
            paragraph.appendChild(document.createElement('br'));
            return paragraph;
        };

        if (pre.previousElementSibling?.tagName !== 'P') {
            pre.parentNode?.insertBefore(createEmptyParagraph(), pre);
        }

        if (pre.nextElementSibling?.tagName !== 'P') {
            pre.parentNode?.insertBefore(createEmptyParagraph(), pre.nextSibling);
        }

        savedRangeRef.current = null;
        notifyChange();
    };

    const editorColors = ['#111111', '#2b2b2b', '#666666', '#4169E1', '#3fb950'];
    const blockOptions = [
        { tag: 'P', label: '본문', text: '본문' },
        { tag: 'H1', label: '제목 1', text: 'H1' },
        { tag: 'H2', label: '제목 2', text: 'H2' },
        { tag: 'H3', label: '제목 3', text: 'H3' }
    ];
    const menuHeadingClass = 'px-3 pb-1 pt-1.5 text-[11px] font-bold text-[#888888]';

    return (
        <div
            ref={toolbarRef}
            role="toolbar"
            aria-label="본문 서식"
            className="flex flex-wrap items-center gap-y-1 rounded-xl border border-[#e5e5e5] bg-white/95 px-2 py-1.5 backdrop-blur-xl"
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.gif"
            />
            <input
                type="file"
                ref={videoInputRef}
                onChange={handleVideoChange}
                className="hidden"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            />
            <input
                type="file"
                ref={gridInputRef}
                onChange={handleGridFileChange}
                className="hidden"
                accept="image/*,.gif"
                multiple
            />
            <input
                type="file"
                ref={carouselInputRef}
                onChange={handleCarouselFileChange}
                className="hidden"
                accept="image/*,.gif"
                multiple
            />

            {/* History */}
            <ToolButton label="실행 취소 (Ctrl+Z)" onPress={() => runCommand('undo')}><Icon d={icons.undo} /></ToolButton>
            <ToolButton label="다시 실행 (Ctrl+Y)" onPress={() => runCommand('redo')}><Icon d={icons.redo} /></ToolButton>
            <Divider />

            {/* Block type */}
            {blockOptions.map(option => (
                <ToolButton
                    key={option.tag}
                    label={option.label}
                    wide
                    active={formats.block === option.tag}
                    onPress={() => { format(option.tag); notifyChange(); refreshFormats(); }}
                >
                    {option.text}
                </ToolButton>
            ))}
            <Divider />

            {/* Inline formatting */}
            <ToolButton label="굵게 (Ctrl+B)" active={formats.bold} onPress={() => runCommand('bold')}>
                <span className="text-[15px] font-bold">B</span>
            </ToolButton>
            <ToolButton label="기울임 (Ctrl+I)" active={formats.italic} onPress={() => runCommand('italic')}>
                <span className="font-serif text-[16px] italic">I</span>
            </ToolButton>
            <ToolButton label="밑줄 (Ctrl+U)" active={formats.underline} onPress={() => runCommand('underline')}>
                <span className="text-[15px] underline underline-offset-2">U</span>
            </ToolButton>
            <ToolButton label="취소선" active={formats.strike} onPress={() => runCommand('strikeThrough')}>
                <span className="text-[15px] line-through">S</span>
            </ToolButton>
            <ToolButton label="인라인 코드" active={formats.inlineCode} onPress={toggleInlineCode}><Icon d={icons.inlineCode} /></ToolButton>
            <Divider />

            {/* Blocks */}
            <ToolButton
                label="인용"
                active={formats.block === 'BLOCKQUOTE'}
                onPress={() => runCommand('formatBlock', formats.block === 'BLOCKQUOTE' ? 'P' : 'BLOCKQUOTE')}
            >
                <Icon d={icons.quote} />
            </ToolButton>
            <ToolButton label="구분선" onPress={() => runCommand('insertHorizontalRule')}><Icon d={icons.divider} /></ToolButton>
            <div className="relative">
                <ToolButton label="코드 블록" active={openMenu === 'code' || formats.block === 'PRE'} onPress={() => toggleMenu('code')}>
                    <Icon d={icons.codeBlock} />
                </ToolButton>
                {openMenu === 'code' && (
                    <MenuPanel className="w-44">
                        <p className={menuHeadingClass}>코드 언어</p>
                        {codeLanguages.map(language => (
                            <MenuItem key={language.value} onPress={() => { setOpenMenu(null); insertCodeBlock(language.value); }}>
                                {language.label}
                            </MenuItem>
                        ))}
                    </MenuPanel>
                )}
            </div>
            <Divider />

            {/* Link */}
            <div className="relative">
                <ToolButton
                    label="링크 (Ctrl+K)"
                    active={openMenu === 'link' || formats.link}
                    onPress={() => (openMenu === 'link' ? setOpenMenu(null) : openLinkMenu())}
                >
                    <Icon d={icons.link} />
                </ToolButton>
                {openMenu === 'link' && (
                    <MenuPanel className="w-[300px] p-3">
                        <label className="block text-[11px] font-bold text-[#666666]">
                            링크 주소
                            <input
                                autoFocus
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        applyLink();
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setOpenMenu(null);
                                        restoreSelection();
                                    }
                                }}
                                placeholder="https://"
                                className="mt-1 h-9 w-full rounded-lg border border-[#e5e5e5] px-3 text-sm font-medium text-[#111111] outline-none placeholder:text-[#aaaaaa] focus:border-[#4169E1]"
                            />
                        </label>
                        <div className="mt-2 flex justify-end gap-2">
                            {formats.link && (
                                <button type="button" onClick={removeLink} className="h-8 rounded-lg px-3 text-xs font-bold text-[#ff3b30] hover:bg-[#fff5f5]">
                                    링크 해제
                                </button>
                            )}
                            <button type="button" onClick={applyLink} className="h-8 rounded-lg bg-[#4169E1] px-3 text-xs font-bold text-white hover:bg-[#3458c7]">
                                적용
                            </button>
                        </div>
                    </MenuPanel>
                )}
            </div>
            <Divider />

            {/* Media */}
            <ToolButton label="이미지" onPress={handleImageClick}><Icon d={icons.image} /></ToolButton>
            <div className="relative">
                <ToolButton label="이미지 그리드" active={openMenu === 'grid'} onPress={() => toggleMenu('grid')}><Icon d={icons.grid} /></ToolButton>
                {openMenu === 'grid' && (
                    <MenuPanel className="w-48">
                        <p className={menuHeadingClass}>이미지 그리드 · 여러 장 선택</p>
                        {[2, 3, 4].map(columns => (
                            <MenuItem key={columns} onPress={() => { setOpenMenu(null); restoreSelection(); handleGridClick(columns); }}>
                                {columns}열 그리드
                            </MenuItem>
                        ))}
                    </MenuPanel>
                )}
            </div>
            <ToolButton label="슬라이드 (이미지 2~4장)" onPress={handleCarouselClick}><Icon d={icons.slides} /></ToolButton>
            <ToolButton label="동영상 (자동재생)" onPress={handleVideoClick}><Icon d={icons.video} /></ToolButton>
            <Divider />

            {/* Paragraph style */}
            <div className="relative">
                <ToolButton label="줄 간격" active={openMenu === 'lineHeight'} onPress={() => toggleMenu('lineHeight')}><Icon d={icons.lineHeight} /></ToolButton>
                {openMenu === 'lineHeight' && (
                    <MenuPanel align="right" className="w-36">
                        <p className={menuHeadingClass}>줄 간격</p>
                        {['1.5', '1.6', '1.8', '2.0', '2.5'].map(value => (
                            <MenuItem key={value} onPress={() => { setOpenMenu(null); restoreSelection(); applyLineHeight(value); notifyChange(); }}>
                                {value}
                            </MenuItem>
                        ))}
                    </MenuPanel>
                )}
            </div>
            <div className="relative">
                <ToolButton label="문단 색상" active={openMenu === 'color'} onPress={() => toggleMenu('color')}>
                    <span className="flex flex-col items-center leading-none">
                        <span className="text-[14px] font-bold">A</span>
                        <span className="mt-0.5 h-[3px] w-4 rounded-full bg-[#4169E1]" />
                    </span>
                </ToolButton>
                {openMenu === 'color' && (
                    <MenuPanel align="right" className="w-[196px] p-3">
                        <p className="pb-2 text-[11px] font-bold text-[#888888]">문단 색상</p>
                        <div className="flex items-center gap-2">
                            {editorColors.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    title={`색상 ${color}`}
                                    aria-label={`색상 ${color}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setOpenMenu(null);
                                        restoreSelection();
                                        applyColorToBlock(color);
                                        notifyChange();
                                    }}
                                    className="h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            <input
                                type="color"
                                title="직접 선택"
                                aria-label="직접 선택"
                                onChange={(e) => {
                                    restoreSelection();
                                    applyColorToBlock(e.target.value);
                                    notifyChange();
                                }}
                                className="h-6 w-6 cursor-pointer rounded-full border border-[#e5e5e5] bg-white p-0"
                            />
                        </div>
                    </MenuPanel>
                )}
            </div>
        </div>
    );
};
