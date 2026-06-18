import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
    delay?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
    children,
    className = '',
    delay = 0,
    style,
    ...props
}) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setProgress(1);
            return;
        }

        let frameId = 0;
        const staggerOffset = Math.min(delay * 0.16, 64);

        const updateProgress = () => {
            frameId = 0;
            const rect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const start = viewportHeight * 1.08 + staggerOffset;
            const end = viewportHeight * 0.42;
            const rawProgress = (start - rect.top) / (start - end);

            setProgress(Math.min(Math.max(rawProgress, 0), 1));
        };

        const requestUpdate = () => {
            if (frameId) return;
            frameId = window.requestAnimationFrame(updateProgress);
        };

        updateProgress();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);

        return () => {
            if (frameId) window.cancelAnimationFrame(frameId);
            window.removeEventListener('scroll', requestUpdate);
            window.removeEventListener('resize', requestUpdate);
        };
    }, [delay]);

    const easedProgress = progress * progress * (3 - 2 * progress);
    const translateY = (1 - easedProgress) * 72;
    const scale = 0.88 + easedProgress * 0.12;

    return (
        <div
            ref={ref}
            className={`${className} transform-gpu will-change-transform`}
            data-scroll-reveal
            style={{
                ...style,
                transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
            }}
            {...props}
        >
            {children}
        </div>
    );
};
