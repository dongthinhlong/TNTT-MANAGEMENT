import React from 'react';
import {
    Users,
    Search,
    UserCheck,
    GraduationCap,
    BarChart2,
    ScanLine,
    QrCode,
    CreditCard,
    UserCog,
    Database,
    Bell,
    Download,
    ChevronRight
} from 'lucide-react';

interface HubProps {
    userRole: string;
    onTabChange: (tab: string) => void;
}

const Hub: React.FC<HubProps> = ({ userRole, onTabChange }) => {
    const isAdmin = userRole === 'ADMIN';
    const isTeacher = userRole === 'TEACHER' || isAdmin;
    const isGuest = userRole === 'GUEST';
    const currentYear = localStorage.getItem('tntt_academic_year') || '2025-2026';

    const groups = [
        {
            title: 'Quản lý Học viên',
            description: 'Quản lý thông tin, hồ sơ và tìm kiếm học viên',
            color: 'blue',
            items: [
                { id: 'students', label: 'Danh sách học sinh', icon: Users, show: !isGuest },
                { id: 'search', label: 'Tra cứu hồ sơ', icon: Search, show: true },
                { id: 'profile', label: 'Cấp quyền truy cập', icon: UserCheck, show: isGuest },
            ]
        },
        {
            title: 'Học tập & Kết quả',
            description: 'Theo dõi điểm số và phân tích tình hình học tập',
            color: 'purple',
            items: [
                { id: 'scores', label: 'Nhập điểm học tập', icon: GraduationCap, show: !isGuest },
                { id: 'summaries', label: 'Thống kê tổng quan', icon: BarChart2, show: !isGuest },
            ]
        },
        {
            title: 'Điểm danh & Công cụ',
            description: 'Hệ thống quét mã QR và in ấn thẻ học viên',
            color: 'green',
            items: [
                { id: 'attendance', label: 'Máy quét điểm danh', icon: ScanLine, show: isTeacher },
                { id: 'qrcodes', label: 'Quản lý mã QR', icon: QrCode, show: isTeacher },
                { id: 'badges', label: 'In thẻ đeo học viên', icon: CreditCard, show: isTeacher },
            ]
        },
        {
            title: 'Quản trị hệ thống',
            description: 'Quản lý dữ liệu, người dùng và thông báo hệ thống',
            color: 'indigo',
            items: [
                { id: 'users', label: 'Người dùng', icon: UserCog, show: isAdmin },
                { id: 'database', label: 'Cấu hình năm học', icon: Database, show: isAdmin },
                { id: 'notifications', label: 'Thông báo Admin', icon: Bell, show: isAdmin },
                { id: 'export', label: 'Xuất dữ liệu Excel', icon: Download, show: isAdmin },
            ]
        }
    ];

    const colorVariants: any = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white',
        purple: 'bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-600 group-hover:text-white',
        green: 'bg-green-50 text-green-600 border-green-100 group-hover:bg-green-600 group-hover:text-white',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white',
    };

    const titleColors: any = {
        blue: 'text-blue-700',
        purple: 'text-purple-700',
        green: 'text-green-700',
        indigo: 'text-indigo-700',
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header Hub — compact */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Bảng điều khiển</h1>
                <p className="text-slate-400 font-medium text-sm mt-0.5">Năm học <span className="text-blue-600 font-black">{currentYear}</span> · Chọn chức năng bên dưới</p>
            </div>

            {/* Functional Groups */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {groups.map((group, gIdx) => {
                    const visibleItems = group.items.filter(i => i.show);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={gIdx} className="space-y-4">
                            <div className="px-1 flex items-center gap-3">
                                <span className={`w-6 h-1 rounded-full ${group.color === 'blue' ? 'bg-blue-500' : group.color === 'purple' ? 'bg-purple-500' : group.color === 'green' ? 'bg-green-500' : 'bg-indigo-500'}`} />
                                <h2 className={`text-base font-black ${titleColors[group.color]}`}>{group.title}</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {visibleItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 text-left"
                                    >
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-200 flex-shrink-0 ${colorVariants[group.color]}`}>
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="block font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight group-hover:text-blue-600 transition-colors">
                                                {item.label}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                Truy cập <ChevronRight className="h-2.5 w-2.5 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Hub;
