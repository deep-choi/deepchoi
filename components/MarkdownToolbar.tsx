import React, { useRef, useState } from 'react';
import { imageService } from '../services/imageService';

interface MarkdownToolbarProps {
    onImageUpload?: (file: File) => Promise<string>;
    onInsertContent?: (content: string) => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onImageUpload, onInsertContent }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const gridInputRef = useRef<HTMLInputElement>(null);
    const carouselInputRef = useRef<HTMLInputElement>(null);
    const savedRangeRef = useRef<Range | null>(null);
    const [gridColumns, setGridColumns] = useState<number>(2);
    const [codeLanguage, setCodeLanguage] = useState('plaintext');

    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        }
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

    const insertCodeBlock = () => {
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

        pre.dataset.language = codeLanguage;
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
    };

    const editorColors = ['#111111', '#2b2b2b', '#666666', '#4169E1', '#3fb950'];
    const groupClass = "flex gap-1 pr-2 border-r border-[#e5e5e5] items-center";
    const textButtonClass = "min-h-9 px-2.5 py-1.5 text-[#2b2b2b] hover:text-[#111111] hover:bg-[#f5f5f5] rounded-lg font-semibold transition-colors";
    const mediaButtonClass = "min-h-9 px-2.5 py-1.5 hover:bg-[#f5f5f5] rounded-lg font-semibold transition-colors flex items-center gap-1.5";

    return (
        <div className="flex flex-wrap gap-2 mb-3 p-2 bg-[#ffffff]/95 rounded-2xl border border-[#e5e5e5] backdrop-blur-xl">
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

            {/* Block Format: H1, H2, H3, P */}
            <div className={groupClass}>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); format('H1'); }}
                    className={`${textButtonClass} text-lg`}
                    title="제목 1"
                >
                    H1
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); format('H2'); }}
                    className={`${textButtonClass} text-base`}
                    title="제목 2"
                >
                    H2
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); format('H3'); }}
                    className={`${textButtonClass} text-sm`}
                    title="제목 3"
                >
                    H3
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); format('P'); }}
                    className={`${textButtonClass} text-sm`}
                    title="본문"
                >
                    P
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false); }}
                    className={textButtonClass}
                    title="볼드"
                >
                    B
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertHorizontalRule', false); }}
                    className={`${textButtonClass} flex items-center justify-center`}
                    title="구분선"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                </button>
                <select
                    value={codeLanguage}
                    onMouseDown={saveSelection}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="h-9 max-w-[112px] rounded-lg border border-[#e5e5e5] bg-[#ffffff] px-2 text-xs font-semibold text-[#2b2b2b] outline-none focus:border-[#4169E1]"
                    title="코드 언어"
                    aria-label="코드 언어"
                >
                    <option value="plaintext">텍스트</option>
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="python">Python</option>
                    <option value="bash">Bash</option>
                </select>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); saveSelection(); insertCodeBlock(); }}
                    className={`${textButtonClass} font-mono`}
                    title="현재 문단을 코드블럭으로 전환"
                    aria-label="코드블럭"
                >
                    {'</>'}
                </button>
            </div>

            {/* Line Height */}
            <div className={groupClass}>
                <span className="text-[10px] text-[#666666] font-bold uppercase mr-1">줄간격</span>
                {['1.5', '1.6', '1.8', '2.0', '2.5'].map(val => (
                    <button
                        key={val}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyLineHeight(val); }}
                        className="px-2 py-1.5 text-[11px] font-semibold text-[#2b2b2b] hover:text-[#111111] hover:bg-[#f5f5f5] rounded-md transition-colors"
                        title={`줄간격 ${val}`}
                    >
                        {val}
                    </button>
                ))}
            </div>

            {/* Color - applies to the current block (p, h1, h2, h3) */}
            <div className={groupClass}>
                <span className="text-[10px] text-[#666666] font-bold uppercase mr-1">색상</span>
                {editorColors.map(color => (
                    <button
                        key={color}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyColorToBlock(color); }}
                        className="w-6 h-6 rounded-full border border-[#e5e5e5] ring-1 ring-white/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={`색상 ${color}`}
                    />
                ))}
                <input
                    type="color"
                    onChange={(e) => applyColorToBlock(e.target.value)}
                    className="w-7 h-7 p-1 bg-white cursor-pointer rounded-full border border-[#e5e5e5] hover:bg-[#f5f5f5] transition-colors"
                    title="색상 선택"
                />
            </div>

            {/* Media: Image, Video & Link */}
            <div className="flex gap-1 flex-wrap">
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleImageClick(); }}
                    className={`${mediaButtonClass} text-[#111111]`}
                    title="이미지"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    이미지
                </button>
                {/* Grid Layout Buttons */}
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleGridClick(2); }}
                    className={`${mediaButtonClass} text-[#ffb454]`}
                    title="2열 그리드 (여러 이미지 선택)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="8" height="18" rx="1" strokeWidth={2} />
                        <rect x="13" y="3" width="8" height="18" rx="1" strokeWidth={2} />
                    </svg>
                    2열
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleGridClick(3); }}
                    className={`${mediaButtonClass} text-[#d2a8ff]`}
                    title="3열 그리드 (여러 이미지 선택)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="3" width="6" height="18" rx="1" strokeWidth={2} />
                        <rect x="9" y="3" width="6" height="18" rx="1" strokeWidth={2} />
                        <rect x="16" y="3" width="6" height="18" rx="1" strokeWidth={2} />
                    </svg>
                    3열
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleGridClick(4); }}
                    className={`${mediaButtonClass} text-[#ff7b72]`}
                    title="4열 그리드 (여러 이미지 선택)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="1" y="3" width="4.5" height="18" rx="1" strokeWidth={2} />
                        <rect x="6.5" y="3" width="4.5" height="18" rx="1" strokeWidth={2} />
                        <rect x="12" y="3" width="4.5" height="18" rx="1" strokeWidth={2} />
                        <rect x="17.5" y="3" width="4.5" height="18" rx="1" strokeWidth={2} />
                    </svg>
                    4열
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleCarouselClick(); }}
                    className={`${mediaButtonClass} text-[#4169E1]`}
                    title="슬라이드 (이미지 2-4장 선택)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="4" y="5" width="16" height="12" rx="2" strokeWidth={2} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 20h8M9 9h.01M15 9h.01" />
                    </svg>
                    슬라이드
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleVideoClick(); }}
                    className={`${mediaButtonClass} text-[#3fb950]`}
                    title="동영상 (자동재생)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    동영상
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const url = prompt('링크 URL 입력:');
                        if (url) document.execCommand('createLink', false, url);
                    }}
                    className={`${mediaButtonClass} text-[#111111]`}
                    title="링크"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    링크
                </button>
            </div>
        </div>
    );
};
