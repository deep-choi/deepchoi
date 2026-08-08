
import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { ScrollReveal } from './ScrollReveal';
import { getProjectPath } from '../utils/seo';

interface ProjectCardProps {
    project: Project;
    index: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, index }) => {
    return (
        <ScrollReveal
            delay={Math.min(index * 90, 360)}
        >
            <Link
                to={getProjectPath(project)}
                className="group block touch-manipulation"
                aria-label={`${project.title} 게시글 보기`}
            >
                <div className="relative aspect-[16/9] rounded-[8px] overflow-hidden bg-[#f5f5f5] mb-3 transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] md:mb-4 md:rounded-[16px] group-hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]">
                    <img
                        src={project.imageUrl}
                        alt={project.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-all duration-[1.5s] ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-110 opacity-0"
                        onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Category Tag Overlay */}
                    {/* Category Tag Overlay Removed */}
                </div>

                <div>
                    <h3 className="text-lg md:text-xl font-medium text-[#111111] tracking-tight leading-[1.2] transition-colors duration-500">
                        {project.title}
                    </h3>
                    <p className="text-[#666666] text-[14px] md:text-[15px] leading-[1.2] line-clamp-2 mt-[6px]">
                        {project.subtitle}
                    </p>
                    <p className="text-[13px] text-[#888888] font-medium mt-3">
                        {project.date}
                    </p>
                </div>
            </Link>
        </ScrollReveal>
    );
};
