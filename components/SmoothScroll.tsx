import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface SmoothScrollProps {
    children: React.ReactNode;
    disabled?: boolean;
}

export const SmoothScroll: React.FC<SmoothScrollProps> = ({ children, disabled = false }) => {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const spacerRef = useRef<HTMLDivElement | null>(null);
    const currentYRef = useRef(0);
    const frameRef = useRef(0);
    const location = useLocation();
    const [canSmoothScroll, setCanSmoothScroll] = useState(false);

    useEffect(() => {
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const desktopQuery = window.matchMedia('(min-width: 1024px)');

        const syncSmoothScrollState = () => {
            setCanSmoothScroll(!disabled && !reducedMotionQuery.matches && desktopQuery.matches);
        };

        syncSmoothScrollState();
        reducedMotionQuery.addEventListener('change', syncSmoothScrollState);
        desktopQuery.addEventListener('change', syncSmoothScrollState);

        return () => {
            reducedMotionQuery.removeEventListener('change', syncSmoothScrollState);
            desktopQuery.removeEventListener('change', syncSmoothScrollState);
        };
    }, [disabled]);

    useLayoutEffect(() => {
        const content = contentRef.current;
        const spacer = spacerRef.current;

        if (!content || !spacer || !canSmoothScroll) {
            document.documentElement.classList.remove('smooth-scroll-enabled');
            if (content) content.style.transform = '';
            if (spacer) spacer.style.height = '0px';
            return;
        }

        let isMounted = true;
        currentYRef.current = window.scrollY;
        document.documentElement.classList.add('smooth-scroll-enabled');

        const syncHeight = () => {
            spacer.style.height = `${content.scrollHeight}px`;
        };

        const render = () => {
            if (!isMounted) return;

            const targetY = window.scrollY;
            const currentY = currentYRef.current;
            const nextY = Math.abs(targetY - currentY) < 0.08
                ? targetY
                : currentY + (targetY - currentY) * 0.13;

            currentYRef.current = nextY;
            content.style.transform = `translate3d(0, ${-nextY}px, 0)`;
            frameRef.current = window.requestAnimationFrame(render);
        };

        const resizeObserver = new ResizeObserver(syncHeight);
        resizeObserver.observe(content);
        syncHeight();
        frameRef.current = window.requestAnimationFrame(render);

        return () => {
            isMounted = false;
            resizeObserver.disconnect();
            if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
            document.documentElement.classList.remove('smooth-scroll-enabled');
            content.style.transform = '';
            spacer.style.height = '0px';
        };
    }, [canSmoothScroll, location.pathname]);

    useEffect(() => {
        if (!canSmoothScroll || !contentRef.current) return;
        currentYRef.current = window.scrollY;
        contentRef.current.style.transform = `translate3d(0, ${-window.scrollY}px, 0)`;
    }, [canSmoothScroll, location.pathname]);

    return (
        <>
            <div ref={spacerRef} className="smooth-scroll-spacer" aria-hidden="true" />
            <div ref={contentRef} className="smooth-scroll-content">
                {children}
            </div>
        </>
    );
};
