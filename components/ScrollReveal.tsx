import React, { useEffect, useRef } from 'react';

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
    const motionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const element = ref.current;
        const motionElement = motionRef.current;
        if (!element || !motionElement) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            motionElement.style.transform = 'translate3d(0, 0, 0) scale(1)';
            return;
        }

        let frameId = 0;
        let currentProgress = 0;
        let targetProgress = 0;
        const staggerOffset = Math.min(delay * 0.16, 64);

        const measureTarget = () => {
            const rect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const start = viewportHeight * 1.1 + staggerOffset;
            const end = viewportHeight * 0.34;
            const rawProgress = (start - rect.top) / (start - end);

            targetProgress = Math.min(Math.max(rawProgress, 0), 1);
        };

        const render = () => {
            measureTarget();
            currentProgress += (targetProgress - currentProgress) * 0.11;

            if (Math.abs(targetProgress - currentProgress) < 0.001) {
                currentProgress = targetProgress;
            }

            const easedProgress = currentProgress * currentProgress * (3 - 2 * currentProgress);
            const translateY = (1 - easedProgress) * 88;
            const scale = 0.9 + easedProgress * 0.1;

            motionElement.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
            frameId = window.requestAnimationFrame(render);
        };

        measureTarget();
        currentProgress = targetProgress;
        render();

        return () => {
            if (frameId) window.cancelAnimationFrame(frameId);
            motionElement.style.transform = '';
        };
    }, [delay]);

    return (
        <div
            ref={ref}
            className={className}
            data-scroll-reveal
            style={style}
            {...props}
        >
            <div
                ref={motionRef}
                className="transform-gpu will-change-transform"
                data-scroll-reveal-motion
            >
                {children}
            </div>
        </div>
    );
};
