import React from 'react';
import { ProjectGrid } from '../components/ProjectGrid';

export const Work: React.FC = () => {
    return (
        <div className="bg-white min-h-screen">
            <ProjectGrid isPage={true} />
        </div>
    );
};
