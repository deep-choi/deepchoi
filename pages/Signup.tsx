
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const Signup: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        setTimeout(async () => {
            const success = await authService.signup(name, email, password);

            if (success) {
                alert('Account created successfully! Please sign in.');
                navigate('/login');
            } else {
                setError('Email already exists.');
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-6 selection:bg-[#1983FC] selection:text-white">
            <div className="w-full max-w-[400px] bg-[#161b22] rounded-[40px] p-12 shadow-sm animate-in fade-in zoom-in duration-700">
                <div className="text-center mb-10 space-y-4">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight text-[#f0f6fc]">Create Account</h1>
                        <p className="text-[15px] text-[#8b949e] font-medium tracking-tight">회원가입하고 커뮤니티에 참여하세요.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name"
                                className="w-full px-6 py-4 bg-[#0d1117] rounded-2xl border-2 border-transparent transition-all outline-none font-medium text-[#f0f6fc] focus:bg-[#0d1117] focus:border-[#1983FC]"
                                required
                            />
                        </div>
                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                }}
                                placeholder="Email"
                                className="w-full px-6 py-4 bg-[#0d1117] rounded-2xl border-2 border-transparent transition-all outline-none font-medium text-[#f0f6fc] focus:bg-[#0d1117] focus:border-[#1983FC]"
                                required
                            />
                        </div>
                        <div className="relative group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                placeholder="Password"
                                className="w-full px-6 py-4 bg-[#0d1117] rounded-2xl border-2 border-transparent transition-all outline-none font-medium text-[#f0f6fc] focus:bg-[#0d1117] focus:border-[#1983FC]"
                                required
                            />
                        </div>
                        {error && (
                            <p className="text-center text-[12px] font-bold text-[#ff3b30] animate-in fade-in">
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-[#1983FC] text-white rounded-full font-bold text-[15px] hover:bg-[#1570d9] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'Sign Up'
                            )}
                        </button>
                    </div>

                    <div className="text-center space-y-4 pt-2">
                        <p className="text-[14px] text-[#8b949e]">
                            이미 계정이 있으신가요?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-[#1983FC] font-semibold hover:underline"
                            >
                                로그인
                            </button>
                        </p>
                    </div>
                </form>
            </div >
        </div >
    );
};
