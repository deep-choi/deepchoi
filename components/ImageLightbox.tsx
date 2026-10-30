import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { boundImagePan, clampZoom, pinchTransform, type ImageTransform, type Point } from '../utils/imageZoom';

type Gesture = {
    points: Point[];
    transform: ImageTransform;
};
const initialTransform = (): ImageTransform => ({ zoom: 1, pan: { x: 0, y: 0 } });
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const ImageLightbox: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
    const [transform, setTransform] = useState(initialTransform);
    const [interacting, setInteracting] = useState(false);
    const current = useRef(transform);
    const stage = useRef<HTMLDivElement>(null);
    const image = useRef<HTMLImageElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const pointers = useRef(new Map<number, Point>());
    const gesture = useRef<Gesture | null>(null);
    const moved = useRef(false);
    const startedOnBackground = useRef(false);

    const apply = (next: ImageTransform) => {
        const viewport = stage.current;
        const img = image.current;
        const zoom = clampZoom(next.zoom);
        const bounded = {
            zoom,
            pan: viewport && img ? boundImagePan(next.pan, zoom,
                { x: img.clientWidth, y: img.clientHeight },
                { x: viewport.clientWidth, y: viewport.clientHeight }) : next.pan,
        };
        current.current = bounded;
        setTransform(bounded);
    };

    const rebase = () => {
        gesture.current = { points: Array.from(pointers.current.values()).slice(0, 2), transform: current.current };
    };
    const point = (event: React.PointerEvent): Point => {
        const rect = event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
    };
    const start = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (pointers.current.size === 0) {
            moved.current = false;
            startedOnBackground.current = event.target === event.currentTarget;
        } else {
            moved.current = true;
        }
        pointers.current.set(event.pointerId, point(event));
        event.currentTarget.setPointerCapture(event.pointerId);
        setInteracting(true);
        rebase();
    };
    const move = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!pointers.current.has(event.pointerId) || !gesture.current) return;
        pointers.current.set(event.pointerId, point(event));
        const points = Array.from(pointers.current.values()).slice(0, 2);
        const start = gesture.current;
        if (points.length === 2 && start.points.length === 2) {
            moved.current = true;
            apply(pinchTransform(start.transform,
                midpoint(start.points[0], start.points[1]), midpoint(points[0], points[1]),
                distance(points[0], points[1]) / Math.max(1, distance(start.points[0], start.points[1]))));
        } else if (points.length === 1 && start.points.length === 1) {
            const dx = points[0].x - start.points[0].x;
            const dy = points[0].y - start.points[0].y;
            if (Math.hypot(dx, dy) > 4) moved.current = true;
            apply({ zoom: start.transform.zoom, pan: { x: start.transform.pan.x + dx, y: start.transform.pan.y + dy } });
        }
    };
    const end = (event: React.PointerEvent<HTMLDivElement>) => {
        pointers.current.delete(event.pointerId);
        setInteracting(pointers.current.size > 0);
        // Rebase after lifting one finger so the remaining finger can pan without a jump.
        rebase();
    };

    useEffect(() => {
        const previousFocus = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButton.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'Tab') {
                const buttons = stage.current?.parentElement?.querySelectorAll<HTMLButtonElement>('button');
                if (!buttons?.length) return;
                const first = buttons[0], last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        window.addEventListener('keydown', onKey);
        const onResize = () => apply(current.current);
        window.addEventListener('resize', onResize);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onResize);
            previousFocus?.focus({ preventScroll: true });
        };
    }, [onClose]);

    const zoomBy = (factor: number) => apply(pinchTransform(current.current, { x: 0, y: 0 }, { x: 0, y: 0 }, factor));
    const control = 'flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/15 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="이미지 확대 보기" className="fixed inset-0 z-[100] bg-black/95">
            <div ref={stage} className="absolute inset-x-0 bottom-24 top-16 flex items-center justify-center overflow-hidden"
                style={{ touchAction: 'none', userSelect: 'none', cursor: interacting ? 'grabbing' : transform.zoom > 1 ? 'grab' : 'default' }}
                onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
                onClick={() => { if (startedOnBackground.current && !moved.current) onClose(); }}>
                <img ref={image} src={src} alt="확대된 이미지" draggable={false} onLoad={() => apply(current.current)}
                    className="block max-h-full max-w-[92vw] rounded-lg object-contain"
                    style={{ transform: `translate3d(${transform.pan.x}px, ${transform.pan.y}px, 0) scale(${transform.zoom})`,
                        transformOrigin: 'center', transition: interacting ? 'none' : 'transform 160ms ease-out' }} />
            </div>
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#111111]/90 p-1.5 shadow-xl backdrop-blur-md" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                <button type="button" aria-label="이미지 축소" className={control} disabled={transform.zoom <= 1} onClick={() => zoomBy(0.5)}><span aria-hidden="true" className="text-2xl">−</span></button>
                <button type="button" aria-label="이미지 배율 초기화" className={`${control} min-w-[4.5rem] text-sm`} onClick={() => apply(initialTransform())}>{Math.round(transform.zoom * 100)}%</button>
                <button type="button" aria-label="이미지 확대" className={control} disabled={transform.zoom >= 4} onClick={() => zoomBy(2)}><span aria-hidden="true" className="text-2xl">+</span></button>
            </div>
            <button ref={closeButton} type="button" aria-label="이미지 닫기" className={`absolute right-4 top-4 bg-white/10 ${control}`} onClick={onClose}>
                <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>, document.body,
    );
};
