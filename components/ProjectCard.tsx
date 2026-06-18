
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../types';

interface ProjectCardProps {
    project: Project;
    index: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, index }) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/post/${project.id}`)}
            className={`group cursor-pointer animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both`}
            style={{ animationDelay: `${index * 150}ms` }}
        >
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-[#161b22] mb-3 md:mb-4 transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
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
                <h3 className="text-lg md:text-xl font-medium text-[#f0f6fc] tracking-tight leading-[1.2] transition-colors duration-500">
                    {project.title}
                </h3>
                <p className="text-[#8b949e] text-[14px] md:text-[15px] leading-[1.2] line-clamp-2 mt-[6px]">
                    {project.subtitle}
                </p>
                <p className="text-[13px] text-[#6e7681] font-medium mt-3">
                    {project.date}
                </p>
            </div>
        </div>
    );
};
