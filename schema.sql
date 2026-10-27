
DROP TABLE IF EXISTS Project;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS Comment;
DROP TABLE IF EXISTS Category;
DROP TABLE IF EXISTS PageView;

CREATE TABLE Project (
    id TEXT PRIMARY KEY,
    slug TEXT,
    title TEXT,
    subtitle TEXT,
    description TEXT,
    seoTitle TEXT,
    seoDescription TEXT,
    seoImage TEXT,
    seoKeywords TEXT,
    noIndex INTEGER NOT NULL DEFAULT 0,
    tech TEXT, -- JSON string
    tags TEXT, -- JSON string
    imageUrl TEXT,
    category TEXT,
    type TEXT, -- 'work' or 'blog'
    secondaryType TEXT, -- optional: also list under the other type ('work' or 'blog')
    secondaryCategory TEXT, -- category within secondaryType
    date TEXT,
    content TEXT,
    author TEXT -- JSON string (Author object)
);

CREATE TABLE User (
    email TEXT PRIMARY KEY,
    name TEXT,
    password TEXT,
    role TEXT,
    avatarUrl TEXT
);

CREATE TABLE Comment (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    content TEXT,
    author TEXT, -- JSON string (User object)
    date TEXT,
    status TEXT NOT NULL DEFAULT 'visible',
    FOREIGN KEY(projectId) REFERENCES Project(id)
);

CREATE TABLE Category (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'work',
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(name, type)
);

CREATE TABLE PageView (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    path TEXT NOT NULL,
    referrer TEXT,
    referrerHost TEXT,
    source TEXT,
    deviceType TEXT,
    browser TEXT,
    os TEXT,
    utmSource TEXT,
    utmMedium TEXT,
    utmCampaign TEXT,
    country TEXT,
    region TEXT,
    ipHash TEXT,
    day TEXT NOT NULL,
    createdAt TEXT NOT NULL
);

CREATE INDEX idx_page_view_day ON PageView(day);
CREATE INDEX idx_page_view_project ON PageView(projectId);
CREATE INDEX idx_page_view_path ON PageView(path);
CREATE INDEX idx_page_view_source ON PageView(source);
CREATE INDEX idx_page_view_device ON PageView(deviceType);
CREATE INDEX idx_page_view_country ON PageView(country);
CREATE INDEX idx_page_view_region ON PageView(region);

-- Initial Data Seeding (Based on db.json)

INSERT INTO User (email, name, password, role, avatarUrl) VALUES
('cryingonion77@gmail.com', 'cryingonion77', 'google-oauth-user', 'admin', 'https://ui-avatars.com/api/?name=cryingonion77');

INSERT INTO Category (id, name, type, sortOrder, createdAt, updatedAt) VALUES
('work:ui-ux', 'UI UX', 'work', 0, datetime('now'), datetime('now')),
('work:바이브코딩', '바이브코딩', 'work', 1, datetime('now'), datetime('now')),
('blog:ai', 'AI', 'blog', 0, datetime('now'), datetime('now')),
('blog:ui-ux', 'UI UX', 'blog', 1, datetime('now'), datetime('now'));

INSERT INTO Project (id, title, subtitle, description, tech, tags, imageUrl, category, date, content, author) VALUES
('01', 'CogniFlow Interface', 'Neural Work Management', '인지 부하를 최소화하는 신경망 기반 작업 관리 모바일 앱 UI/UX 디자인입니다.', '["Figma", "Protopie"]', '["Mobile APP", "AI UI", "Productivity"]', 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800', 'UI UX', '2024.12.20', '
      ## Project Overview
      CogniFlow is a task management app designed for professionals who experience high cognitive load. 
      The interface focuses on minimalism and predictive task organization.

      ### Key Features
      - **Neural Priority**: AI-driven task sorting.
      - **Focus Mode**: Minimalistic UI to prevent distractions.
      - **Gesture-Based UX**: Intuitive controls for fast navigation.
    ', '{"name": "Choi", "role": "UI/UX Designer & Developer", "avatarUrl": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}'),
('02', 'Aether OS System', 'Spatial Computing Design System', '공간 컴퓨팅 환경을 위한 차세대 디자인 가이드라인 및 컴포넌트 라이브러리입니다.', '["Spline", "Three.js"]', '["Vision OS", "3D UI", "Design System"]', 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800', '바이브코딩', '2024.11.15', '
      ## Designing for the Spatial Era
      Aether OS is a design system exploration for AR/VR environments. 
      It prioritizes depth, translucency, and spatial hierarchy.

      ### Design Principles
      1. **Depth over Surface**: Using Z-axis for information hierarchy.
      2. **Adaptive Lighting**: Real-time shadows and reflections.
      3. **Spatial Typography**: Readability across various focal planes.
    ', '{"name": "Choi", "role": "UI/UX Designer & Developer", "avatarUrl": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}'),
('03', 'Quant-Trade Dashboard', 'Financial Data Visualization', '복잡한 금융 데이터를 직관적으로 시각화한 미니멀 데이터 대시보드입니다.', '["Information Architecture", "D3.js"]', '["Fintech", "Data Visualization", "Dashboard"]', 'https://images.unsplash.com/photo-1551288049-bbbda536339a?auto=format&fit=crop&q=80&w=800', 'UI UX', '2024.10.05', '
      ## Data-Driven Minimalism
      The Quant-Trade Dashboard simplifies high-frequency trading data into actionable insights 
      without overwhelming the user.

      ### Visualization Strategy
      - **Heatmaps**: Quick identification of market volatility.
      - **Streamline Trends**: Smooth animations for real-time price updates.
      - **Contextual Alerts**: Non-intrusive notifications for key market events.
    ', '{"name": "Choi", "role": "UI/UX Designer & Developer", "avatarUrl": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}'),
('04', 'Bio-Sync Wellness', 'Integrated Wellness Platform', '생체 데이터와 동기화되는 웰니스 플랫폼의 통합 사용자 경험 설계입니다.', '["User Research", "UI Design"]', '["Health Tech", "Wearables", "UX Design"]', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800', '바이브코딩', '2024.09.12', '
      ## Bio-Sync UX Case Study
      How can we make biological data understandable for the average user? 
      Bio-Sync bridges the gap between complex health metrics and daily habits.

      ### User Journey
      - **Morning Sync**: Immediate overview of sleep and readiness.
      - **Dynamic Activity**: Real-time workout adjustments based on HR.
      - **Recovery Insights**: Guided meditation and rest suggestions.
    ', '{"name": "Choi", "role": "UI/UX Designer & Developer", "avatarUrl": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}');

