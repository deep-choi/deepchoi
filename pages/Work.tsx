import React from 'react';
import { ProjectGrid } from '../components/ProjectGrid';

export const Work: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            <ProjectGrid isPage={true} />
        </div>
    );
};
