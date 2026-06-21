import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { ScrollReveal } from '../components/ScrollReveal';

const HeroParticleField = React.lazy(() =>
    import('../components/HeroParticleField').then((module) => ({ default: module.HeroParticleField }))
);

const HERO_TEXT = '디자인과 개발로 더 나은 제품 경험을 만듭니다.';

const TypewriterHeadline: React.FC = () => {
    const [visibleLength, setVisibleLength] = useState(0);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setVisibleLength(HERO_TEXT.length);
            return;
        }

        let frameId = 0;
        const startDelay = 300;
        const typingDuration = 3700;
        const delayWeights = HERO_TEXT.split('').map((character) => {
            if (character === ' ') return 1.35;
            if (character === '.') return 1.7;
            return 1;
        });
        const totalDelayWeight = delayWeights.reduce((total, weight) => total + weight, 0);

        const startedAt = performance.now();
        const render = (now: number) => {
            const elapsed = now - startedAt - startDelay;

            if (elapsed <= 0) {
                setVisibleLength(0);
                frameId = window.requestAnimationFrame(render);
                return;
            }

            if (elapsed >= typingDuration) {
                setVisibleLength(HERO_TEXT.length);
                return;
            }

            const targetWeight = (elapsed / typingDuration) * totalDelayWeight;
            let accumulatedWeight = 0;
            let nextLength = 0;

            for (let i = 0; i < delayWeights.length; i += 1) {
                accumulatedWeight += delayWeights[i];
                if (accumulatedWeight > targetWeight) {
                    break;
                }
                nextLength = i + 1;
            }

            setVisibleLength(nextLength);
            frameId = window.requestAnimationFrame(render);
        };

        frameId = window.requestAnimationFrame(render);
        return () => window.cancelAnimationFrame(frameId);
    }, []);

    const visibleText = HERO_TEXT.slice(0, visibleLength);
    const isTyping = visibleLength < HERO_TEXT.length;

    return (
        <h1
            className="relative max-w-[760px] text-center text-[34px] font-medium leading-[1.12] text-[#111111] tracking-normal md:text-[52px] lg:text-[60px]"
            aria-label={HERO_TEXT}
        >
            <span className="invisible" aria-hidden="true">
                {HERO_TEXT}
            </span>
            <span className="absolute inset-0" aria-hidden="true">
                {visibleText}
                <span
                    className={`ml-[0.08em] inline-block h-[0.82em] w-[0.055em] translate-y-[0.08em] rounded-full bg-[#4169E1] ${isTyping ? 'animate-pulse' : 'opacity-0'}`}
                />
            </span>
        </h1>
    );
};

const Hero: React.FC = () => {
    return (
        <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden bg-[#ffffff] px-4 pb-16 pt-[72px] md:px-[20px]">
            <React.Suspense fallback={null}>
                <HeroParticleField />
            </React.Suspense>
            <div className="relative z-10 mx-auto flex w-full max-w-[1120px] justify-center">
                <TypewriterHeadline />
            </div>
        </section>
    );
};

const FALLBACK_VISUALS = [
    '/captures/company-projects/humanpartner-home-desktop.png',
    '/captures/company-projects/humanpartner-sign-home-desktop.png',
    '/captures/company-projects/micepartner-home-desktop.png',
    '/captures/company-projects/rentalpartner-home-desktop.png',
    '/captures/company-projects/miceday-home-desktop.png',
];

const getProjectVisual = (project: Project, index: number): string =>
    project.imageUrl || FALLBACK_VISUALS[index % FALLBACK_VISUALS.length];

const WorkShowcase: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        projectService.getAllProjects()
            .then((data) => {
                setProjects(data.filter((project) => !project.type || project.type === 'work'));
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <section id="projects" className="bg-[#ffffff] pb-12 pt-0 md:pb-20">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-16 px-4 md:gap-24 md:px-[20px]">
                {isLoading ? (
                    <div className="flex min-h-[360px] items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-4 border-[#4169E1] border-t-transparent animate-spin" />
                    </div>
                ) : (
                    <div className="flex flex-col gap-20 md:gap-28">
                        {projects.map((project, index) => {
                            const visual = getProjectVisual(project, index);
                            const meta = project.tags.length > 0
                                ? project.tags.slice(0, 3).join(', ')
                                : project.category;

                            return (
                                <ScrollReveal
                                    key={project.id}
                                    className="mx-auto w-full"
                                    delay={Math.min(index * 100, 400)}
                                >
                                    <Link
                                        to={`/post/${project.id}`}
                                        className="group block w-full"
                                    >
                                        <div className="relative aspect-[16/9] overflow-hidden rounded-[8px] bg-[#ffffff] md:rounded-[16px]">
                                            <img
                                                src={visual}
                                                alt={project.title}
                                                loading={index === 0 ? 'eager' : 'lazy'}
                                                decoding="async"
                                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                                            />
                                        </div>

                                        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                                            <h3 className="text-lg font-medium leading-tight text-[#111111] md:text-xl">
                                                {project.title}
                                            </h3>
                                            <div className="flex flex-col gap-1 text-[12px] font-medium uppercase text-[#666666] md:items-end md:text-right">
                                                <span>{meta}</span>
                                                <span>{project.date}</span>
                                            </div>
                                        </div>
                                    </Link>
                                </ScrollReveal>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

const AdminCreateButton: React.FC = () => {
    const navigate = useNavigate();
    const isAdmin = authService.isAuthenticated();

    if (!isAdmin) {
        return null;
    }

    return (
        <button
            onClick={() => navigate('/admin/create')}
            className="fixed bottom-10 right-10 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#4169E1] text-white shadow-lg shadow-[#4169E1]/30 transition-all hover:scale-110 active:scale-95 animate-in fade-in zoom-in duration-300"
            title="무엇을 만들고 싶으신가요?"
        >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
    );
};

export const Home: React.FC = () => {
    return (
        <main className="relative bg-[#ffffff]">
            <Hero />
            <WorkShowcase />
            <AdminCreateButton />
        </main>
    );
};
