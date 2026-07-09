import { Node, mergeAttributes } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';

type StyleMap = Record<string, string>;

const parseStyle = (style: string | null | undefined): StyleMap => {
    if (!style) return {};

    return style.split(';').reduce<StyleMap>((acc, declaration) => {
        const separatorIndex = declaration.indexOf(':');
        if (separatorIndex === -1) return acc;

        const key = declaration.slice(0, separatorIndex).trim().toLowerCase();
        const value = declaration.slice(separatorIndex + 1).trim();
        if (key && value) {
            acc[key] = value;
        }
        return acc;
    }, {});
};

const serializeStyle = (style: StyleMap): string | null => {
    const entries = Object.entries(style).filter(([, value]) => Boolean(value));
    if (entries.length === 0) return null;
    return entries.map(([key, value]) => `${key}: ${value}`).join('; ');
};

export const mergeStyle = (existingStyle: string | null | undefined, nextStyle: StyleMap): string | null => {
    return serializeStyle({
        ...parseStyle(existingStyle),
        ...nextStyle,
    });
};

const blockStyleAttributes = {
    style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: { style?: string | null }) => {
            return attributes.style ? { style: attributes.style } : {};
        },
    },
};

export const StyledParagraph = Paragraph.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            ...blockStyleAttributes,
        };
    },
});

export const StyledHeading = Heading.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            ...blockStyleAttributes,
        };
    },
});

export const Video = Node.create({
    name: 'video',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: {
                default: null,
                parseHTML: element => element.getAttribute('src'),
            },
            style: {
                default: null,
                parseHTML: element => element.getAttribute('style'),
            },
            autoplay: {
                default: true,
                parseHTML: element => element.hasAttribute('autoplay'),
            },
            loop: {
                default: true,
                parseHTML: element => element.hasAttribute('loop'),
            },
            muted: {
                default: true,
                parseHTML: element => element.hasAttribute('muted'),
            },
            playsinline: {
                default: true,
                parseHTML: element => element.hasAttribute('playsinline'),
            },
            controls: {
                default: false,
                parseHTML: element => element.hasAttribute('controls'),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'video' }];
    },

    renderHTML({ HTMLAttributes }) {
        const attrs = { ...HTMLAttributes };
        ['autoplay', 'loop', 'muted', 'playsinline', 'controls'].forEach(name => {
            if (!attrs[name]) {
                delete attrs[name];
            }
        });

        return ['video', mergeAttributes(attrs)];
    },
});

export const ImageGrid = Node.create({
    name: 'imageGrid',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            class: {
                default: 'image-grid image-grid-2',
                parseHTML: element => element.getAttribute('class') || 'image-grid image-grid-2',
            },
            images: {
                default: [],
                parseHTML: element => Array.from(element.querySelectorAll('img')).map(img => ({
                    src: img.getAttribute('src') || '',
                    alt: img.getAttribute('alt') || 'Grid image',
                })).filter(image => image.src),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div.image-grid' }];
    },

    renderHTML({ HTMLAttributes }) {
        const images = Array.isArray(HTMLAttributes.images) ? HTMLAttributes.images : [];
        const attrs = { ...HTMLAttributes };
        delete attrs.images;

        return [
            'div',
            mergeAttributes(attrs),
            ...images.map((image: { src: string; alt?: string }) => ['img', { src: image.src, alt: image.alt || 'Grid image' }]),
        ];
    },
});

export const ImageCarousel = Node.create({
    name: 'imageCarousel',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            images: {
                default: [],
                parseHTML: element => Array.from(element.querySelectorAll('.image-carousel-slide img')).map((img, index) => ({
                    src: img.getAttribute('src') || '',
                    alt: img.getAttribute('alt') || `Slide image ${index + 1}`,
                })).filter(image => image.src),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div.image-carousel' }];
    },

    renderHTML({ HTMLAttributes }) {
        const images = Array.isArray(HTMLAttributes.images) ? HTMLAttributes.images : [];

        return [
            'div',
            { class: 'image-carousel', 'data-count': String(images.length) },
            [
                'div',
                { class: 'image-carousel-track' },
                ...images.map((image: { src: string; alt?: string }, index: number) => [
                    'figure',
                    { class: 'image-carousel-slide' },
                    ['img', { src: image.src, alt: image.alt || `Slide image ${index + 1}` }],
                ]),
            ],
            ['button', { type: 'button', class: 'image-carousel-nav image-carousel-prev', 'data-carousel-action': 'prev', 'aria-label': '이전 이미지' }, '\u2039'],
            ['button', { type: 'button', class: 'image-carousel-nav image-carousel-next', 'data-carousel-action': 'next', 'aria-label': '다음 이미지' }, '\u203a'],
        ];
    },
});
