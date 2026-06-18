import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { projectService } from '../services/projectService';
import { Project } from '../types';

const Hero: React.FC = () => {
    return (
        <section className="relative w-full overflow-hidden bg-[#0d1117] px-4 pb-12 pt-28 md:px-6 md:pb-16 md:pt-36">
            <div className="mx-auto flex w-full max-w-[1120px] justify-center">
                <h1 className="max-w-[920px] text-center text-[42px] font-medium leading-[1.08] text-[#f0f6fc] tracking-normal md:text-[70px] lg:text-[82px]">
                    안녕하세요, 저는 사용자와 운영자를 위한 디지털 제품을 만드는 최동준입니다.
                </h1>
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
                setProjects(data.filter((project) => !project.type || project.type === 'work').slice(0, 3));
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <section id="projects" className="bg-[#0d1117] px-4 pb-12 pt-0 md:px-6 md:pb-20">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-16 md:gap-24">
                {isLoading ? (
                    <div className="flex min-h-[360px] items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-4 border-[#1983FC] border-t-transparent animate-spin" />
                    </div>
                ) : (
                    <div className="flex flex-col gap-20 md:gap-28">
                        {projects.map((project, index) => {
                            const visual = getProjectVisual(project, index);
                            const meta = project.tags.length > 0
                                ? project.tags.slice(0, 3).join(', ')
                                : project.category;

                            return (
                                <Link
                                    key={project.id}
                                    to={`/post/${project.id}`}
                                    className="group mx-auto block w-full max-w-[1200px]"
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#161b22] md:aspect-[16/7]">
                                        <img
                                            src={visual}
                                            alt={project.title}
                                            loading={index === 0 ? 'eager' : 'lazy'}
                                            decoding="async"
                                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                                        />
                                    </div>

                                    <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                                        <h3 className="text-lg font-medium leading-tight text-[#f0f6fc] md:text-xl">
                                            {project.title}
                                        </h3>
                                        <div className="flex flex-col gap-1 text-[12px] font-medium uppercase text-[#8b949e] md:items-end md:text-right">
                                            <span>{meta}</span>
                                            <span>{project.date}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

const ClosingStatement: React.FC = () => (
    <section className="bg-[#0d1117] px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-[1440px] border-t border-[#30363d] pt-8">
            <h2 className="max-w-[900px] text-4xl font-semibold leading-[1.08] text-[#f0f6fc] md:text-6xl">
                Making digital products clear, useful, and easy to operate.
            </h2>
        </div>
    </section>
);

const AdminCreateButton: React.FC = () => {
    const navigate = useNavigate();
    const isAdmin = authService.isAuthenticated();

    if (!isAdmin) {
        return null;
    }

    return (
        <button
            onClick={() => navigate('/admin/create')}
            className="fixed bottom-10 right-10 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#1983FC] text-white shadow-lg shadow-[#1983FC]/30 transition-all hover:scale-110 active:scale-95 animate-in fade-in zoom-in duration-300"
            title="무엇을 만들고 싶으신가요?"
        >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
    );
};

export const Home: React.FC = () => {
    return (
        <main className="relative bg-[#0d1117]">
            <Hero />
            <WorkShowcase />
            <ClosingStatement />
            <AdminCreateButton />
        </main>
    );
};
