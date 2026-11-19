import React, { useEffect } from 'react';
import { ProjectGrid } from '../components/ProjectGrid';
import { applyPageSeo } from '../utils/seo';

export const Work: React.FC = () => {
    useEffect(() => {
        applyPageSeo({
            title: 'Deepchoi 프로젝트 | UI/UX, 프론트엔드, 바이브코딩',
            description: 'UI/UX 디자인, 프론트엔드 구현, 바이브코딩으로 구축한 Deepchoi의 웹 서비스와 프로젝트 아카이브입니다.',
            path: '/work'
        });
    }, []);

    return (
        <div className="min-h-screen bg-white">
            <ProjectGrid isPage={true} />
        </div>
    );
};
