import React, { useState } from 'react';
import StudentSearch from './StudentSearch';
import { GraduationCap, ArrowRight, LayoutDashboard } from 'lucide-react';

interface LandingPageProps {
    onLoginClick: () => void;
    isAuthenticated?: boolean;
    onGoToDashboard?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, isAuthenticated = false, onGoToDashboard }) => {
    const [activeSection, setActiveSection] = useState<'home' | 'search'>('home');

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveSection('home')}>
                        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                            <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-lg text-slate-800 leading-none">TNTT Kim Thành</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Cổng Thông Tin Giáo Lý</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <button
                            onClick={() => setActiveSection('home')}
                            className={`text-sm font-bold transition-colors ${activeSection === 'home' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Trang Chủ
                        </button>
                        <button
                            onClick={() => setActiveSection('search')}
                            className={`text-sm font-bold transition-colors ${activeSection === 'search' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Tra Cứu Hồ Sơ
                        </button>
                    </div>

                    {isAuthenticated ? (
                        <button
                            onClick={onGoToDashboard}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full font-bold text-sm hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl active:scale-95"
                        >
                            <span>Vào trang quản lý</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-full font-bold text-sm hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl active:scale-95"
                        >
                            <span>Đăng nhập</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </nav>

            {/* Content Area */}
            <div className="min-h-[calc(100vh-80px)]">
                {activeSection === 'home' && (
                    <div className="relative pt-20 pb-32 overflow-hidden">
                        {/* Hero Background Elements */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-blue-50 to-transparent -z-10" />
                        <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-purple-200/30 rounded-full blur-[100px] animate-pulse" />
                        <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-blue-200/30 rounded-full blur-[100px] delay-700 animate-pulse" />

                        <div className="max-w-5xl mx-auto px-6 text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                                Hệ thống quản lý giáo lý 2026
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
                                Quản Lý & Tra Cứu <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                    Hồ Sơ Giáo Lý Sinh
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                Hệ thống trực tuyến tra cứu và quản lý tình hình học tập của các em thiếu nhi Giáo xứ Kim Thành.
                            </p>

                            <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                                <button
                                    onClick={() => setActiveSection('search')}
                                    className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all"
                                >
                                    Tra cứu ngay
                                </button>
                                {isAuthenticated ? (
                                    <button
                                        onClick={onGoToDashboard}
                                        className="w-full md:w-auto px-8 py-4 bg-white text-slate-700 border-2 border-slate-100 rounded-2xl font-bold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <LayoutDashboard className="h-5 w-5" />
                                        Vào Trang Quản Lý
                                    </button>
                                ) : (
                                    <button
                                        onClick={onLoginClick}
                                        className="w-full md:w-auto px-8 py-4 bg-white text-slate-700 border-2 border-slate-100 rounded-2xl font-bold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <LayoutDashboard className="h-5 w-5" />
                                        Khu vực Huynh trưởng
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'search' && (
                    <div className="h-[calc(100vh-80px)] flex flex-col pt-10 px-4">
                        <div className="max-w-4xl mx-auto w-full text-center space-y-4 mb-8">
                            <h2 className="text-3xl font-black text-slate-800">Tra Cứu Hồ Sơ</h2>
                            <p className="text-slate-500">Nhập mã số học sinh để xem bảng điểm và thông tin chi tiết.</p>
                        </div>
                        <div className="flex-1">
                            <StudentSearch isEmbedded={true} />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div>
                        <span className="font-extrabold text-slate-800 text-lg">TNTT Kim Thành</span>
                        <p className="text-sm text-slate-400 mt-2 font-medium">© 2026 Management System. All rights reserved.</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors"><span className="sr-only">Facebook</span>FB</a>
                        <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors"><span className="sr-only">Email</span>Email</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;