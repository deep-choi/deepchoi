
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { Editor } from './pages/Editor';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { About } from './pages/About';
import { Work } from './pages/Work';
import { Blog } from './pages/Blog';
import { Contact } from './pages/Contact';
import { authService } from './services/authService';

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
      <nav className={`fixed top-0 left-0 w-full z-50 transition-colors duration-200 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-md border-none text-white`}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-[24px] h-[64px] flex justify-between items-center relative">

          {/* Left Side: Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
              <span className="font-semibold text-[18px] tracking-tight">Choi Portfolio</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex gap-4 items-center">
              <Link to="/about" className="text-[16px] font-medium text-white/90 hover:text-white/70 transition-colors">About</Link>
              <Link to="/work" className="text-[16px] font-medium text-white/90 hover:text-white/70 transition-colors">Work</Link>
              <Link to="/blog" className="text-[16px] font-medium text-white/90 hover:text-white/70 transition-colors">Blog</Link>
              <Link to="/contact" className="text-[16px] font-medium text-white/90 hover:text-white/70 transition-colors">Contact</Link>
            </div>
          </div>

          {/* Right Side: Search & Auth */}
          <div className="hidden md:flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative group">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2.5 min-w-[300px] transition-colors focus-within:border-blue-500 focus-within:bg-black/40">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search or jump to..."
                  className="bg-transparent border-none text-white text-[14px] outline-none w-full placeholder-gray-500"
                />
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <span className="text-[14px] font-medium text-white">{authService.getCurrentUser()?.name}님</span>
                  <button onClick={handleLogout} className="text-[14px] font-medium text-white/70 hover:text-white transition-colors">로그아웃</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-[14px] font-medium text-white hover:text-white/70 transition-colors">로그인</Link>
                  <Link
                    to="/signup"
                    className="text-[14px] font-medium text-white border border-[rgba(240,246,252,0.1)] rounded-md px-3 py-1.5 hover:border-[#8b949e] hover:bg-[rgba(177,186,196,0.12)] transition-all"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0d1117] pt-[64px] md:hidden overscroll-none text-white">
          <div className="flex flex-col items-start gap-6 pt-8 px-6">
            <div className="w-full relative">
              <input
                type="text"
                placeholder="검색..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <Link to="/about" onClick={closeMobileMenu} className="text-xl font-semibold border-b border-[#30363d] w-full pb-3">About</Link>
            <Link to="/work" onClick={closeMobileMenu} className="text-xl font-semibold border-b border-[#30363d] w-full pb-3">Work</Link>
            <Link to="/blog" onClick={closeMobileMenu} className="text-xl font-semibold border-b border-[#30363d] w-full pb-3">Blog</Link>
            <Link to="/contact" onClick={closeMobileMenu} className="text-xl font-semibold border-b border-[#30363d] w-full pb-3">Contact</Link>

            <div className="flex flex-col gap-4 mt-2 w-full">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">{authService.getCurrentUser()?.name?.[0]}</div>
                    <span className="font-semibold">{authService.getCurrentUser()?.name}님</span>
                  </div>
                  <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="text-left text-lg text-gray-400">로그아웃</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobileMenu} className="text-xl font-semibold">로그인</Link>
                  <Link to="/signup" onClick={closeMobileMenu} className="text-xl font-semibold text-blue-400">회원가입</Link>
                </>
              )}
            </div>
          </div>
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

// Experience component removed as it is migrated to About page

const Footer: React.FC = () => (
  <footer className="relative py-32 bg-[#0d1117] overflow-hidden border-t border-[#30363d]/50">
    {/* Sunset Gradient Glow */}
    <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#ff6b2b]/20 via-[#ff6b2b]/5 to-transparent pointer-events-none" />

    <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 relative z-10">

      {/* Column 1: Main */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#8b949e] uppercase tracking-widest mb-6">Main</h4>
        <Link to="/" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">Home</Link>
        <Link to="/about" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">About</Link>
      </div>

      {/* Column 2: Project */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#8b949e] uppercase tracking-widest mb-6">Project</h4>
        <Link to="/work" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">전체보기</Link>
        <Link to="/work?category=uiux" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">UI/UX</Link>
        <Link to="/work?category=vibecoding" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">바이브코딩</Link>
      </div>

      {/* Column 3: Blog */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#8b949e] uppercase tracking-widest mb-6">Blog</h4>
        <Link to="/blog" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">전체보기</Link>
        <Link to="/blog?category=ai" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">AI</Link>
        <Link to="/blog?category=uiux" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">UI UX</Link>
      </div>

      {/* Column 4: Connect */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#8b949e] uppercase tracking-widest mb-6">Connect</h4>
        <a href="mailto:contact@example.com" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">Email</a>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="text-[14px] text-[#f0f6fc] mb-3 hover:text-white hover:underline transition-all w-fit">GitHub</a>
      </div>
    </div>
  </footer>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0d1117] selection:bg-[#1983FC] selection:text-white font-sans flex flex-col">
      <ScrollToTop />
      <Navbar isScrolled={isScrolled} />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
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
          <Route path="/about" element={<About />} />
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
