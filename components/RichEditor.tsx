import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { moveCarousel, setupCarousel } from '../utils/carousel';
import { ImageCarousel, ImageGrid, StyledHeading, StyledParagraph, Video } from './tiptapExtensions';

interface RichEditorProps {
    initialContent: string;
    onContentChange: (content: string) => void;
    className?: string;
    editorRef?: React.RefObject<HTMLDivElement | null>;
    onEditorReady?: (editor: TiptapEditor | null) => void;
}

const isIgnorableEmptyLineChild = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
        return !node.textContent?.replace(/\u00a0/g, ' ').trim();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return true;
    }

    const element = node as HTMLElement;
    if (element.matches('br')) {
        return true;
    }

    if (element.matches('span,b,strong,i,em,u,font')) {
        return Array.from(element.childNodes).every(isIgnorableEmptyLineChild);
    }

    return false;
};

const normalizeHtmlForTiptap = (html: string): string => {
    if (!html) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const emptyBlocks = Array.from(doc.body.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,blockquote,li')) as HTMLElement[];
    emptyBlocks.forEach(block => {
        if (
            block.closest('.image-grid,.image-carousel,.image-carousel-track,.image-carousel-slide') ||
            block.querySelector('img,video,hr')
        ) {
            return;
        }

        const isEmptyLine = Array.from(block.childNodes).every(isIgnorableEmptyLineChild);
        if (!isEmptyLine) return;

        const paragraph = doc.createElement('p');
        const style = block.getAttribute('style');
        if (style && /line-height\s*:/i.test(style)) {
            paragraph.setAttribute('style', style);
        }

        block.parentNode?.replaceChild(paragraph, block);
    });

    Array.from(doc.body.childNodes).forEach(node => {
        if (node.nodeName !== 'BR') return;
        const paragraph = doc.createElement('p');
        node.parentNode?.replaceChild(paragraph, node);
    });

    return doc.body.innerHTML;
};

export const RichEditor: React.FC<RichEditorProps> = ({
    initialContent,
    onContentChange,
    className = '',
    editorRef: externalEditorRef,
    onEditorReady,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const hasUserEditedRef = useRef(false);

    const syncHtml = (editor: TiptapEditor) => {
        const html = editor.getHTML();
        if (containerRef.current) {
            containerRef.current.dataset.editorHtml = html;
        }
        onContentChange(html);
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                paragraph: false,
            }),
            StyledParagraph,
            StyledHeading.configure({
                levels: [1, 2, 3],
            }),
            TextStyle,
            Color,
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank',
                },
            }),
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'full-width',
                },
            }),
            Video,
            ImageGrid,
            ImageCarousel,
        ],
        content: normalizeHtmlForTiptap(initialContent),
        editorProps: {
            attributes: {
                spellcheck: 'true',
            },
        },
        onCreate: ({ editor }) => {
            syncHtml(editor);
        },
        onUpdate: ({ editor }) => {
            hasUserEditedRef.current = true;
            syncHtml(editor);
        },
        onBlur: ({ editor }) => {
            syncHtml(editor);
        },
    });

    useEffect(() => {
        if (!editor) return;
        onEditorReady?.(editor);

        return () => {
            onEditorReady?.(null);
        };
    }, [editor, onEditorReady]);

    useEffect(() => {
        if (!externalEditorRef) return;
        (externalEditorRef as React.MutableRefObject<HTMLDivElement | null>).current = containerRef.current;

        return () => {
            (externalEditorRef as React.MutableRefObject<HTMLDivElement | null>).current = null;
        };
    }, [externalEditorRef]);

    useEffect(() => {
        if (!editor || hasUserEditedRef.current) return;
        const nextContent = normalizeHtmlForTiptap(initialContent);
        if (editor.getHTML() !== nextContent) {
            editor.commands.setContent(nextContent, { emitUpdate: false });
            syncHtml(editor);
        }
    }, [editor, initialContent]);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        let frame = 0;
        let cleanups: Array<() => void> = [];

        const refreshCarousels = () => {
            cleanups.forEach(cleanup => cleanup());
            cleanups = Array.from(root.querySelectorAll('.image-carousel')).map(carousel =>
                setupCarousel(carousel as HTMLElement)
            );
        };

        const scheduleRefresh = () => {
            if (frame) window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(refreshCarousels);
        };

        refreshCarousels();

        const observer = new MutationObserver(scheduleRefresh);
        observer.observe(root, { childList: true, subtree: true });

        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            observer.disconnect();
            cleanups.forEach(cleanup => cleanup());
        };
    }, []);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        const carouselNav = target.closest('.image-carousel-nav') as HTMLElement | null;
        if (!carouselNav) return;

        event.preventDefault();
        event.stopPropagation();

        const carousel = carouselNav.closest('.image-carousel') as HTMLElement | null;
        if (carousel) {
            const direction = carouselNav.dataset.carouselAction === 'prev' ? -1 : 1;
            moveCarousel(carousel, direction);
        }
    };

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            className={`editor-prose w-full min-h-[620px] p-5 md:p-8 rounded-2xl border border-[#e5e5e5] bg-[#ffffff] focus-within:outline-none focus-within:border-[#4169E1] focus-within:ring-2 focus-within:ring-[#4169E1]/20 transition-all ${className}`}
        >
            <EditorContent editor={editor} />
        </div>
    );
};
