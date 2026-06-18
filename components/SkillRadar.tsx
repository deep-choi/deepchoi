
import React from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';

const data = [
  { subject: 'UI Design', A: 95, fullMark: 100 },
  { subject: 'User Research', A: 85, fullMark: 100 },
  { subject: 'Interaction', A: 90, fullMark: 100 },
  { subject: 'Typography', A: 95, fullMark: 100 },
  { subject: 'Prototyping', A: 88, fullMark: 100 },
  { subject: 'Motion', A: 82, fullMark: 100 },
];

export const SkillRadar: React.FC = () => {
  return (
    <div className="w-full h-[350px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#e5e5e7" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#86868b', fontSize: 11, fontWeight: '600' }} />
          <Radar
            name="Skills"
            dataKey="A"
            stroke="#4169E1"
            fill="#4169E1"
            fillOpacity={0.1}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
