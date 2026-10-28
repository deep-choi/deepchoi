import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { ProjectCard } from './ProjectCard';
import { categoryLabel, categoryService, findCategoryByQuery } from '../services/categoryService';
import { useAuthUser } from '../hooks/useAuthUser';
import { categoryIn, isListedIn } from '../utils/entryPlacement';
import { groupTabClassName } from '../utils/tabStyles';


export const ProjectGrid: React.FC<{ isPage?: boolean }> = ({ isPage = false }) => {
  const [activeTab, setActiveTab] = useState('전체보기');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tabs, setTabs] = useState<string[]>(['전체보기']);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const currentUser = useAuthUser();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      projectService.getAllProjects(),
      categoryService.getCategories('work')
    ]).then(([data, categories]) => {
      if (!isMounted) return;
      const workProjects = data.filter(p => isListedIn(p, 'work'));
      setProjects(workProjects);
      const categoryNames = Array.from(new Set([
        ...categories.map(category => category.name),
        ...workProjects.map(project => categoryIn(project, 'work')).filter(Boolean)
      ]));
      setTabs(['전체보기', ...categoryNames]);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const queryCategory = new URLSearchParams(location.search).get('category');
    if (!queryCategory) {
      setActiveTab('전체보기');
      return;
    }

    const matchedCategory = findCategoryByQuery(tabs.filter(tab => tab !== '전체보기'), queryCategory);
    setActiveTab(matchedCategory || '전체보기');
  }, [location.search, tabs]);

  const filteredProjects = activeTab === '전체보기'
    ? projects
    : projects.filter(p => categoryIn(p, 'work') === activeTab);

  return (
    <section id="projects" className={`${isPage ? 'pt-32 pb-24' : 'py-12 md:py-24'} bg-[#ffffff]`}>
      <div className="max-w-[1440px] mx-auto px-4 md:px-[20px]">
        <div className="mb-8">
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

            {/* Tabs share the Blog first-level style */}
            <div className="-mx-4 flex gap-7 overflow-x-auto border-b border-[#ededed] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className={groupTabClassName(activeTab === tab)}
                >
                  {tab === '전체보기' ? tab : categoryLabel(tab)}
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
