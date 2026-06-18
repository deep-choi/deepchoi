
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
      <nav className="fixed left-0 top-0 z-50 w-full bg-white text-[#111111]">
        <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-[20px]">

          {/* Left Side: Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
              <span className="h-3 w-3 rounded-full bg-[#4169E1]"></span>
              <span className="font-semibold text-[18px] tracking-tight">Choi Portfolio</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex gap-7 items-center">
              <Link to="/about" className="text-[14px] font-medium text-[#111111] hover:text-[#4169E1] transition-colors">About</Link>
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
            className="md:hidden p-2 text-[#111111]"
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
        <div className="fixed inset-0 z-40 bg-[#ffffff] pt-[84px] md:hidden overscroll-none text-[#111111]">
          <div className="flex flex-col items-start gap-6 pt-8 px-6">
            <Link to="/about" onClick={closeMobileMenu} className="text-xl font-semibold border-b border-[#e5e5e5] w-full pb-3">About</Link>
            <Link to="/work" onClick={closeMobileMenu} className="text-xl font-semibold border-b border-[#e5e5e5] w-full pb-3">Work</Link>
            <Link to="/blog" onClick={closeMobileMenu} className="text-xl font-semibold border-b border-[#e5e5e5] w-full pb-3">Blog</Link>
            <Link to="/contact" onClick={closeMobileMenu} className="text-xl font-semibold border-b border-[#e5e5e5] w-full pb-3">Contact</Link>

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
  <footer className="relative py-24 bg-white overflow-hidden">
    <div className="max-w-[1440px] mx-auto px-[20px] grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 relative z-10">

      {/* Column 1: Main */}
      <div className="flex flex-col">
        <h4 className="text-[11px] font-bold text-[#666666] uppercase tracking-widest mb-6">Main</h4>
        <Link to="/" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">Home</Link>
        <Link to="/about" className="text-[14px] text-[#111111] mb-3 hover:text-[#666666] hover:underline transition-all w-fit">About</Link>
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
