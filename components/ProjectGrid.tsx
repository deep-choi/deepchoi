import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { ProjectCard } from './ProjectCard';
import { authService } from '../services/authService';

type Category = '전체보기' | 'UI/UX' | '바이브코딩';


export const ProjectGrid: React.FC<{ isPage?: boolean }> = ({ isPage = false }) => {
  const [activeTab, setActiveTab] = useState<Category>('전체보기');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isAdmin = authService.isAuthenticated();

  useEffect(() => {
    setIsLoading(true);
    projectService.getAllProjects().then(data => {
      const workProjects = data.filter(p => !p.type || p.type === 'work');
      setProjects(workProjects);
      setIsLoading(false);
    });
  }, []);

  const filteredProjects = activeTab === '전체보기'
    ? projects
    : projects.filter(p => p.category === (activeTab === 'UI/UX' ? 'UI UX' : activeTab));

  const tabs: Category[] = ['전체보기', 'UI/UX', '바이브코딩'];

  return (
    <section id="projects" className={`${isPage ? 'pt-32 pb-24' : 'py-12 md:py-24'} bg-[#ffffff]`}>
      <div className="max-w-[1440px] mx-auto px-4 md:px-[20px]">
        <div className="mb-4">
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
              <h2 className="text-[24px] md:text-[28px] leading-none font-medium text-[#111111] tracking-tight">프로젝트</h2>
              {location.pathname === '/' && (
                <Link to="/work" className="text-[#666666] hover:text-[#111111] transition-colors text-[15px] font-medium flex items-center gap-1">
                  전체보기
                </Link>
              )}
              {isPage && isAdmin && (
                <Link
                  to="/admin/create?type=work"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#4169E1] px-4 text-[13px] font-semibold text-white shadow-sm shadow-[#4169E1]/20 transition-all hover:bg-[#3458c7] active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  프로젝트 추가
                </Link>
              )}
            </div>

            {/* Apple Style Tabs - Full Width Line */}
            {/* Divider */}
            {/* Divider Removed */}

            {/* Pill Style Tabs */}
            <div className="flex gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all border ${activeTab === tab
                    ? 'bg-[#4169E1] border-[#4169E1] text-white'
                    : 'bg-white border-[#e5e5e5] text-[#666666] hover:border-[#4169E1] hover:text-[#111111]'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-12">
              {filteredProjects.map((p, index) => (
                <ProjectCard key={p.id} project={p} index={index + 1} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-[15px] font-medium text-[#888888]">
              표시할 프로젝트가 없습니다.
            </div>
          )
        )}
      </div>
    </section>
  );
};
