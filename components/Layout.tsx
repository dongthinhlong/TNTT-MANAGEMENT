import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  UserCog,
  LogOut,
  ScanLine,
  LayoutDashboard,
  Home,
  Moon,
  Sun,
  Bell
} from 'lucide-react';
import { getDefaultAcademicYear } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: string;
  userEmail: string;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  userRole,
  userEmail,
  onLogout
}) => {
  const isAdmin = userRole === 'ADMIN';
  const isTeacher = userRole === 'TEACHER' || isAdmin;
  const isGuest = userRole === 'GUEST';

  const academicYear = localStorage.getItem('tntt_academic_year') || getDefaultAcademicYear();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const functionalGroups = [
    { id: 'hub',        label: 'Trang chủ', icon: Home,         color: 'blue',   show: true },
    { id: 'students',  label: 'Học viên',   icon: Users,        color: 'blue',   show: !isGuest },
    { id: 'scores',    label: 'Học tập',    icon: GraduationCap,color: 'purple', show: !isGuest },
    { id: 'attendance',label: 'Điểm danh',  icon: ScanLine,     color: 'green',  show: isTeacher },
    { id: 'users',     label: 'Hệ thống',   icon: UserCog,      color: 'indigo', show: isAdmin },
  ];

  const activeTextColor: any = {
    blue:   'text-blue-600',
    purple: 'text-purple-600',
    green:  'text-green-600',
    indigo: 'text-indigo-600',
  };

  const activeBorderColor: any = {
    blue:   'bg-blue-600',
    purple: 'bg-purple-600',
    green:  'bg-green-600',
    indigo: 'bg-indigo-600',
  };

  const visibleGroups = functionalGroups.filter(g => g.show);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 overflow-x-hidden">
      {/* Top Header — Facebook-style */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between flex-shrink-0 shadow-sm">

        {/* Left: Logo (flex-1) */}
        <div className="flex-1 flex items-center">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onTabChange('hub')}>
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-1.5 rounded-xl shadow-indigo-100 shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-sm sm:text-base tracking-tight text-slate-800 hidden lg:block">TNTT Kim Thành</span>
          </div>
        </div>

        {/* Center: Main Navigation */}
        <nav className="flex items-center h-full">
          {visibleGroups.map((group) => {
            const isActive =
              activeTab === group.id ||
              (group.id === 'students'  && (activeTab === 'search' || activeTab === 'profile')) ||
              (group.id === 'scores'    && activeTab === 'summaries') ||
              (group.id === 'attendance'&& (activeTab === 'qrcodes' || activeTab === 'badges')) ||
              (group.id === 'users'    && (activeTab === 'database' || activeTab === 'notifications' || activeTab === 'export'));

            const px = visibleGroups.length >= 5 ? 'px-3 sm:px-5 md:px-8' : 'px-4 sm:px-8 md:px-12';

            return (
              <button
                key={group.id}
                onClick={() => onTabChange(group.id)}
                title={group.label}
                className={`relative flex flex-col items-center justify-center h-full ${px} group transition-all`}
              >
                <group.icon
                  className={`h-5 w-5 sm:h-6 sm:w-6 transition-all duration-200
                    ${isActive
                      ? `${activeTextColor[group.color]} scale-110`
                      : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-110'}
                  `}
                />
                {isActive && (
                  <div className={`absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full ${activeBorderColor[group.color]}`} />
                )}
                {/* Tooltip */}
                <div className="absolute -bottom-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  {group.label}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Right: Year badge + Account (flex-1) */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
          {/* Admin Notifications Pin */}
          {isAdmin && (
            <button
              onClick={() => onTabChange('notifications')}
              className={`relative p-2 rounded-xl transition-all duration-200 group/bell ${activeTab === 'notifications' ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              title="Thông báo hệ thống"
            >
              <Bell className={`h-5 w-5 ${activeTab === 'notifications' ? 'fill-indigo-600' : ''} group-hover/bell:scale-110 transition-transform`} />
              {/* Optional: red dot for new notifications could be added here if we had state for it */}
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            </button>
          )}

          <div className="h-5 w-px bg-slate-200" />

          {/* User Account Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-700 hidden lg:block max-w-[100px] truncate">
                {userEmail?.split('@')[0]}
              </span>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm border-2 border-white shadow-sm flex-shrink-0">
                {userEmail?.charAt(0).toUpperCase() || 'G'}
              </div>
            </button>

            {/* Dropdown */}
            <div className={`absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 transition-all duration-200 z-50 ${dropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
              <div className="p-4 border-b border-slate-50 mb-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tài khoản</p>
                <p className="text-sm font-bold text-slate-800 truncate">{userEmail}</p>
                <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1 uppercase">{userRole}</p>
              </div>

              {/* Year selector */}
              <div className="p-2 border-b border-slate-50 mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-2">Năm học</label>
                <select
                  value={localStorage.getItem('tntt_academic_year') || getDefaultAcademicYear()}
                  onChange={(e) => {
                    localStorage.setItem('tntt_academic_year', e.target.value);
                    window.location.reload();
                  }}
                  className="w-full bg-slate-50 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 border border-slate-200"
                >
                  {(JSON.parse(localStorage.getItem('tntt_available_years') || '[]')).length > 0
                    ? (JSON.parse(localStorage.getItem('tntt_available_years') || '[]')).sort().map((year: string) => (
                        <option key={year} value={year}>{year}</option>
                      ))
                    : <option value={getDefaultAcademicYear()}>{getDefaultAcademicYear()}</option>
                  }
                </select>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full p-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 w-full overflow-y-auto">
        <div className="max-w-full lg:max-w-7xl 2xl:max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(1rem); } to { transform: translateY(0); } }
        .animate-in { animation-duration: 0.5s; animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-bottom-4 { animation-name: slide-in-from-bottom-4; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }

        body { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
};

export default Layout;