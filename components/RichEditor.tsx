import React, { useRef, useEffect, useCallback, useState } from 'react';

interface RichEditorProps {
    initialContent: string;
    onContentChange: (content: string) => void;
    className?: string;
}

export const RichEditor: React.FC<RichEditorProps> = ({
    initialContent,
    onContentChange,
    className = ''
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);
    const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);

    // Set initial content only once on mount
    useEffect(() => {
        if (editorRef.current && !initializedRef.current && initialContent) {
            editorRef.current.innerHTML = initialContent;
            initializedRef.current = true;
        }
    }, [initialContent]);

    // Reset initialization flag when component unmounts
    useEffect(() => {
        return () => {
            initializedRef.current = false;
        };
    }, []);

    // Handle click outside to deselect media
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectedMedia && !selectedMedia.contains(e.target as Node)) {
                // Check if click is on delete button
                const target = e.target as HTMLElement;
                if (!target.closest('.media-delete-btn')) {
                    setSelectedMedia(null);
                }
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [selectedMedia]);

    const handleBlur = useCallback(() => {
        if (editorRef.current) {
            onContentChange(editorRef.current.innerHTML);
        }
    }, [onContentChange]);

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // Remove previous selection highlight
        if (selectedMedia) {
            selectedMedia.classList.remove('selected-media');
        }

        // Check if clicked on video or image
        if (target.tagName === 'VIDEO' || target.tagName === 'IMG') {
            e.preventDefault();
            e.stopPropagation();
            target.classList.add('selected-media');
            setSelectedMedia(target);
        } else if (!target.closest('.media-delete-btn')) {
            setSelectedMedia(null);
        }
    };

    const handleDeleteMedia = () => {
        if (selectedMedia) {
            selectedMedia.parentNode?.removeChild(selectedMedia);
            setSelectedMedia(null);
            // Trigger content change
            if (editorRef.current) {
                onContentChange(editorRef.current.innerHTML);
            }
        }
    };

    // Calculate delete button position
    const getDeleteButtonPosition = () => {
        if (!selectedMedia || !editorRef.current) return null;

        const editorRect = editorRef.current.getBoundingClientRect();
        const mediaRect = selectedMedia.getBoundingClientRect();

        return {
            top: mediaRect.top - editorRect.top + 8,
            right: editorRect.right - mediaRect.right + 8
        };
    };

    const deleteButtonPos = getDeleteButtonPosition();

    return (
        <div className="relative">
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={handleBlur}
                onClick={handleEditorClick}
                onKeyDown={(e) => {
                    // Handle deletion of media elements (video, img)
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                        if (selectedMedia) {
                            e.preventDefault();
                            handleDeleteMedia();
                            return;
                        }

                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);

                            // Check if selection is collapsed (cursor position)
                            if (range.collapsed) {
                                // Get the node before cursor for Backspace, after for Delete
                                let targetNode: Node | null = null;

                                if (e.key === 'Backspace') {
                                    // Check previous sibling or parent's previous content
                                    let node = range.startContainer;
                                    if (node.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
                                        // At start of text node, check previous sibling
                                        targetNode = node.previousSibling;
                                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                                        const element = node as HTMLElement;
                                        if (range.startOffset > 0) {
                                            targetNode = element.childNodes[range.startOffset - 1];
                                        }
                                    }
                                } else {
                                    // Delete key - check next sibling
                                    let node = range.startContainer;
                                    if (node.nodeType === Node.TEXT_NODE && range.startOffset === node.textContent?.length) {
                                        targetNode = node.nextSibling;
                                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                                        const element = node as HTMLElement;
                                        targetNode = element.childNodes[range.startOffset];
                                    }
                                }

                                // If target is a video or image, delete it
                                if (targetNode && targetNode.nodeType === Node.ELEMENT_NODE) {
                                    const el = targetNode as HTMLElement;
                                    if (el.tagName === 'VIDEO' || el.tagName === 'IMG') {
                                        e.preventDefault();
                                        el.parentNode?.removeChild(el);
                                        return;
                                    }
                                }
                            } else {
                                // Selection is not collapsed - check if it contains media
                                const container = range.commonAncestorContainer;
                                if (container.nodeType === Node.ELEMENT_NODE) {
                                    const el = container as HTMLElement;
                                    if (el.tagName === 'VIDEO' || el.tagName === 'IMG') {
                                        e.preventDefault();
                                        el.parentNode?.removeChild(el);
                                        return;
                                    }
                                }
                            }
                        }
                    }

                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        document.execCommand('insertParagraph', false);
                    }
                }}
                className={`editor-prose w-full min-h-[620px] p-5 md:p-8 rounded-2xl border border-[#e5e5e5] bg-[#ffffff] focus:outline-none focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/20 transition-all ${className}`}
            />

            {/* Delete button overlay for selected media */}
            {selectedMedia && deleteButtonPos && (
                <button
                    className="media-delete-btn absolute z-50 w-9 h-9 bg-[#ff453a] text-white rounded-full shadow-lg shadow-[#ff453a]/20 flex items-center justify-center hover:bg-[#ff6961] hover:scale-105 transition-all"
                    style={{
                        top: deleteButtonPos.top,
                        right: deleteButtonPos.right
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteMedia();
                    }}
                    title="삭제"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Selection highlight style */}
            <style>{`
                [contenteditable] img.selected-media,
                [contenteditable] video.selected-media {
                    outline: 3px solid #4169E1;
                    outline-offset: 2px;
                }
            `}</style>
        </div>
    );
};
