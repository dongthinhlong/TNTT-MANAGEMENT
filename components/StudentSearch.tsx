import React, { useState } from 'react';
import { Search, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';

interface StudentSearchProps {
    isEmbedded?: boolean;
    onSearch?: (id: string) => void;
}

const StudentSearch: React.FC<StudentSearchProps> = ({ isEmbedded = false, onSearch }) => {
    const [searchId, setSearchId] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchId.trim()) return;

        if (onSearch) {
            onSearch(searchId.trim().toUpperCase());
            return;
        }

        setIsAnimating(true);
        // Add a small delay for the animation effect
        setTimeout(() => {
            window.location.href = `/?view=profile&id=${searchId.trim().toUpperCase()}`;
        }, 800);
    };

    return (
        <div className={isEmbedded
            ? "flex items-center justify-center p-4 w-full h-full min-h-[60vh]"
            : "min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden"
        }>
            {/* Background Effects: Only show if NOT embedded */}
            {!isEmbedded && (
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[100px]" />
                </div>
            )}

            <div className={`
                relative z-10 w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden
                transition-all duration-700 transform
                ${isAnimating ? 'scale-90 opacity-0 translate-y-10' : 'animate-in fade-in slide-in-from-bottom-8'}
                ${isEmbedded ? 'shadow-xl border border-slate-100' : 'shadow-2xl'}
            `}>
                {/* Header */}
                <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden flex flex-col items-center justify-center text-center p-6">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-lg border border-white/20">
                            <GraduationCap className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            Tra Cứu Hồ Sơ
                        </h1>
                        <p className="text-blue-100 text-xs font-medium uppercase tracking-widest">
                            TNTT Kim Thanh
                        </p>
                    </div>
                </div>

                {/* Form Section */}
                <div className="p-8">
                    <form onSubmit={handleSearch} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="studentId" className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-1">
                                Mã Học Sinh
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    id="studentId"
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 font-bold placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    placeholder="VD: HS001"
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!searchId.trim()}
                            className={`
                                w-full py-4 rounded-2xl font-bold text-lg text-white shadow-xl flex items-center justify-center gap-2
                                transition-all duration-300 transform active:scale-95
                                ${searchId.trim()
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-200 hover:-translate-y-1'
                                    : 'bg-slate-300 cursor-not-allowed'}
                            `}
                        >
                            <span>Tìm Kiếm</span>
                            {searchId.trim() && <ArrowRight className="h-5 w-5 animate-pulse" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
                            <Sparkles className="h-3 w-3 text-yellow-500" />
                            <span>Nhập ID chính xác để xem chi tiết</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentSearch;
