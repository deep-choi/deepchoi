
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { Editor } from './pages/Editor';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Work } from './pages/Work';
import { Blog } from './pages/Blog';
import { Contact } from './pages/Contact';
import { authService } from './services/authService';
import { SmoothScroll } from './components/SmoothScroll';

const Navbar: React.FC<{ isScrolled: boolean }> = ({ isScrolled }) => {
  const isLoggedIn = authService.isAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Don't show Navbar on Login/Signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  const handleLogout = () => {
    authService.logout();
    navigate('/');
    window.location.reload();
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed left-0 top-0 z-50 w-full bg-white text-[#111111]">
        <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-4 md:px-[20px]">

          {/* Left Side: Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
              <span className="h-3 w-3 rounded-full bg-[#4169E1]"></span>
              <span className="font-semibold text-[18px] tracking-tight">Choi Portfolio</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex gap-7 items-center">
              <Link to="/work" className="text-[14px] font-medium text-[#111111] hover:text-[#4169E1] transition-colors">Work</Link>
              <Link to="/blog" className="text-[14px] font-medium text-[#111111] hover:text-[#4169E1] transition-colors">Blog</Link>
              <Link to="/contact" className="text-[14px] font-medium text-[#111111] hover:text-[#4169E1] transition-colors">Contact</Link>
            </div>
          </div>

          {/* Right Side: Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <span className="text-[14px] font-medium text-[#111111]">{authService.getCurrentUser()?.name}님</span>
                  <button onClick={handleLogout} className="rounded-full bg-[#f5f5f5] px-5 py-2.5 text-[14px] font-medium text-[#111111] transition-colors hover:bg-[#ededed]">로그아웃</button>
                </>
              ) : (
                <Link to="/login" className="rounded-full bg-[#f5f5f5] px-5 py-2.5 text-[14px] font-medium text-[#111111] transition-colors hover:bg-[#ededed]">로그인</Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="relative flex h-10 w-10 items-center justify-center text-[#111111] md:hidden"
            aria-label="Menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu-drawer"
          >
            <span className="relative h-5 w-6" aria-hidden="true">
              <span className={`absolute left-0 top-[2px] h-[2px] w-6 rounded-full bg-current transition-all duration-300 ease-out ${isMobileMenuOpen ? 'translate-y-[8px] rotate-45' : ''}`}></span>
              <span className={`absolute left-0 top-[10px] h-[2px] w-6 rounded-full bg-current transition-all duration-200 ease-out ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`}></span>
              <span className={`absolute left-0 top-[18px] h-[2px] w-6 rounded-full bg-current transition-all duration-300 ease-out ${isMobileMenuOpen ? '-translate-y-[8px] -rotate-45' : ''}`}></span>
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-40 md:hidden overscroll-none text-[#111111]">
          <button
            type="button"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-[#ffffff]/25 backdrop-blur-[3px]"
            aria-label="모바일 메뉴 닫기"
          />
          <aside
            id="mobile-menu-drawer"
            className="mobile-menu-drawer absolute right-0 top-0 flex h-full w-[min(84vw,340px)] flex-col overflow-hidden border-l border-white/70 px-5 py-6 shadow-[-24px_0_70px_rgba(17,17,17,0.16)]"
          >
            <nav className="flex flex-col items-start gap-1">
              <Link to="/work" onClick={closeMobileMenu} className="w-full border-b border-[#d8d8d8]/70 py-5 text-lg font-semibold">Work</Link>
              <Link to="/blog" onClick={closeMobileMenu} className="w-full border-b border-[#d8d8d8]/70 py-5 text-lg font-semibold">Blog</Link>
              <Link to="/contact" onClick={closeMobileMenu} className="w-full border-b border-[#d8d8d8]/70 py-5 text-lg font-semibold">Contact</Link>
            </nav>

            <div className="mt-auto flex w-full flex-col gap-4 border-t border-[#d8d8d8]/70 pt-5">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4169E1] text-sm font-bold text-white">{authService.getCurrentUser()?.name?.[0]}</div>
                    <span className="text-sm font-semibold text-[#111111]">{authService.getCurrentUser()?.name}님</span>
                  </div>
                  <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="w-fit text-left text-[13px] font-medium text-[#86868b] transition-colors hover:text-[#111111]">로그아웃</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobileMenu} className="w-fit rounded-full bg-[#f5f5f5] px-4 py-2 text-[13px] font-semibold text-[#111111] transition-colors hover:bg-[#ededed]">로그인</Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

// ScrollToTop component - scrolls to top on every route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const Footer: React.FC = () => (
  <footer className="relative py-24 bg-white overflow-hidden">
    <div className="max-w-[1440px] mx-auto px-4 md:px-[20px] grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 relative z-10">

      {/* Column 1: Main */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#666666] uppercase tracking-widest mb-6">Main</h4>
        <Link to="/" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">Home</Link>
      </div>

      {/* Column 2: Project */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#666666] uppercase tracking-widest mb-6">Project</h4>
        <Link to="/work" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">전체보기</Link>
        <Link to="/work?category=uiux" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">UI/UX</Link>
        <Link to="/work?category=vibecoding" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">바이브코딩</Link>
      </div>

      {/* Column 3: Blog */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#666666] uppercase tracking-widest mb-6">Blog</h4>
        <Link to="/blog" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">전체보기</Link>
        <Link to="/blog?category=ai" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">AI</Link>
        <Link to="/blog?category=uiux" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">UI UX</Link>
      </div>

      {/* Column 4: Connect */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#666666] uppercase tracking-widest mb-6">Connect</h4>
        <a href="mailto:contact@example.com" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">Email</a>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">GitHub</a>
      </div>
    </div>
  </footer>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const shouldDisableSmoothScroll = location.pathname === '/login'
    || location.pathname === '/signup'
    || location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#ffffff] selection:bg-[#4169E1] selection:text-white font-sans flex flex-col">
      <ScrollToTop />
      <Navbar isScrolled={isScrolled} />
      <SmoothScroll disabled={shouldDisableSmoothScroll}>
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
      </SmoothScroll>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/work" element={<Work />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/admin" element={<Navigate to="/login" replace />} />
          <Route
            path="/admin/create"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/edit/about"
            element={
              <ProtectedRoute>
                <Navigate to="/" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/edit/contact"
            element={
              <ProtectedRoute>
                <Navigate to="/contact?edit=1" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/edit/:id"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
      <style>{`
        body { 
          -webkit-font-smoothing: antialiased;
          letter-spacing: -0.025em; 
        }
        html { }
        iframe { pointer-events: auto !important; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </BrowserRouter>
  );
}
