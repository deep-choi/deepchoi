import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useGoogleLogin } from '@react-oauth/google';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('이메일 또는 비밀번호가 올바르지 않습니다.');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const isLocalDev = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
    const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
    const redirectTo = `${from?.pathname || '/admin'}${from?.search || ''}`;

    React.useEffect(() => {
        let isMounted = true;

        authService.getSession().then(user => {
            if (!isMounted || !user) return;
            navigate(user.role === 'admin' ? redirectTo : '/', { replace: true });
        });

        return () => {
            isMounted = false;
        };
    }, [navigate, redirectTo]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(false);

        // Simulate a bit of network delay for that premium feel
        setTimeout(async () => {
            const user = await authService.login(email, password);
            if (user?.role === 'admin') {
                navigate(redirectTo);
            } else {
                setErrorMessage(user ? '관리자 계정만 접근할 수 있습니다.' : '이메일 또는 비밀번호가 올바르지 않습니다.');
                setError(true);
                setIsLoading(false);
            }
        }, 800);
    };

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            try {
                const user = await authService.googleLogin(tokenResponse.access_token);

                if (user?.role === 'admin') {
                    navigate(redirectTo);
                } else {
                    setErrorMessage(user ? '관리자 계정만 접근할 수 있습니다.' : 'Google 로그인에 실패했습니다.');
                    setError(true);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Google Login Error", err);
                setIsLoading(false);
            }
        },
        onError: () => {
            console.log('Login Failed');
            setIsLoading(false);
        }
    });

    const handleLocalAdminLogin = async () => {
        setIsLoading(true);
        setError(false);

        const user = await authService.login('cryingonion77@gmail.com', 'google-auth-mock-token');
        if (user?.role === 'admin') {
            navigate(redirectTo);
        } else {
            setErrorMessage(user ? '관리자 계정만 접근할 수 있습니다.' : '로컬 관리자 로그인에 실패했습니다.');
            setError(true);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#ffffff] flex items-center justify-center px-4 md:px-6 selection:bg-[#4169E1] selection:text-white">
            <div className="w-full max-w-[400px] bg-white rounded-[32px] border border-[#e5e5e5] p-8 md:p-12 shadow-[0_18px_60px_rgba(0,0,0,0.06)] animate-in fade-in zoom-in duration-700">
                <div className="text-center mb-10 space-y-4">
                    <div className="w-20 h-20 bg-[#f5f5f5] rounded-3xl mx-auto flex items-center justify-center">
                        <span className="text-3xl font-bold text-[#111111]">C.</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Welcome Back</h1>
                        <p className="text-[15px] text-[#666666] font-medium tracking-tight">계정에 로그인하세요.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError(false);
                                }}
                                placeholder="Email"
                                className="w-full px-6 py-4 bg-[#f7f7f7] rounded-2xl border border-[#e5e5e5] transition-all outline-none font-medium text-[#111111] focus:bg-white focus:border-[#4169E1]"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="relative group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(false);
                                }}
                                placeholder="Password"
                                className={`w-full px-6 py-4 bg-[#f7f7f7] rounded-2xl border transition-all outline-none font-medium text-[#111111] focus:bg-white ${error ? 'border-[#ff3b30] bg-white animate-shake' : 'border-[#e5e5e5] focus:border-[#4169E1]'
                                    }`}
                                required
                            />
                            {error && (
                                <p className="absolute -bottom-6 left-0 w-full text-center text-[12px] font-bold text-[#ff3b30] animate-in fade-in slide-in-from-top-2">
                                    {errorMessage}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 space-y-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-[#4169E1] text-white rounded-full font-bold text-[15px] hover:bg-[#3458c7] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={isLocalDev ? handleLocalAdminLogin : () => googleLogin()}
                            disabled={isLoading}
                            className="w-full py-4 bg-white text-[#111111] border border-[#d2d2d7] rounded-full font-bold text-[15px] hover:bg-[#f5f5f7] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLocalDev ? (
                                <span className="h-5 w-5 rounded-full bg-[#4169E1]"></span>
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            )}
                            {isLocalDev ? '로컬 관리자 로그인' : 'Sign in with Google'}
                        </button>
                    </div>

                    <div className="text-center space-y-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="text-[13px] text-[#666666] font-medium hover:text-[#111111] transition-colors"
                        >
                            홈으로 돌아가기
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};
