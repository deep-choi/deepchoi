import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { ProjectCard } from './ProjectCard';

type Category = '전체보기' | 'UI/UX' | '바이브코딩';


export const ProjectGrid: React.FC<{ isPage?: boolean }> = ({ isPage = false }) => {
  const [activeTab, setActiveTab] = useState<Category>('전체보기');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
      <div className="max-w-[1440px] mx-auto px-[20px]">
        <div className="mb-4">
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
              <h2 className="text-[24px] md:text-[28px] leading-none font-medium text-[#111111] tracking-tight">프로젝트</h2>
              {location.pathname === '/' && (
                <Link to="/work" className="text-[#666666] hover:text-[#111111] transition-colors text-[15px] font-medium flex items-center gap-1">
                  전체보기
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
          <>
            {/* Featured Project (First Item) */}
            {filteredProjects.length > 0 && (
              <div
                className="mb-8 md:mb-12 cursor-pointer group"
                onClick={() => navigate(`/post/${filteredProjects[0].id}`)}
              >
                <div className="md:grid md:grid-cols-[1.5fr_1fr] md:rounded-2xl md:overflow-hidden md:bg-white md:border md:border-[#e5e5e5] md:group-hover:border-[#bdbdbd] md:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all">
                  {/* Image Side */}
                  <div className="relative aspect-[16/9] md:aspect-auto md:h-[420px] rounded-lg md:rounded-none overflow-hidden bg-[#f5f5f5] mb-3 md:mb-0">
                    <img
                      src={filteredProjects[0].imageUrl}
                      alt={filteredProjects[0].title}
                      className="w-full h-full object-cover transition-transform duration-1000 md:group-hover:scale-105"
                    />
                    {/* Category Tag Removed */}
                  </div>

                  {/* Content Side */}
                  <div className="md:p-10 flex flex-col justify-center relative md:bg-[#ffffff]">
                    <h3 className="text-lg md:text-4xl font-medium md:font-bold text-[#111111] mb-[6px] md:mb-4 leading-[1.2] md:leading-tight transition-colors">
                      {filteredProjects[0].title}
                    </h3>
                    <p className="text-[#666666] text-[14px] md:text-[16px] leading-[1.2] md:leading-relaxed line-clamp-2 md:line-clamp-3 w-full md:w-[90%] font-normal md:font-light">
                      {filteredProjects[0].subtitle}
                    </p>
                    <span className="text-[#888888] md:text-[#666666] text-[13px] md:text-[14px] mt-3 md:mt-0 md:mb-4 font-medium md:font-mono md:order-first">{filteredProjects[0].date}</span>

                    <div className="mt-auto hidden md:block">
                      <button className="px-5 md:px-6 py-2.5 md:py-3 rounded-full border border-[#e5e5e5] text-[#111111] hover:bg-[#4169E1] hover:text-white hover:border-[#4169E1] transition-all text-[13px] md:text-[14px] font-medium tracking-wide">
                        자세히보기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remaining Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-12">
              {filteredProjects.slice(1).map((p, index) => (
                <ProjectCard key={p.id} project={p} index={index + 1} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
