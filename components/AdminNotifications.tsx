import React, { useState, useEffect } from 'react';
import { Bell, Mail, UserCheck, Trash2, CheckCircle, Clock } from 'lucide-react';
import { api } from '../services/gasApi';

const AdminNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await api.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa thông báo này?')) return;
        try {
            await api.deleteNotification(id);
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (error) {
            alert('Lỗi khi xóa thông báo');
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('vi-VN');
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <Bell className="h-7 w-7 text-amber-600" />
                        </div>
                        Thông báo & Yêu cầu
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Quản lý các yêu cầu cấp quyền từ người dùng</p>
                </div>
                <button
                    onClick={fetchNotifications}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
                >
                    Làm mới
                </button>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="p-20 text-center text-slate-400 font-bold">Đang tải thông báo...</div>
                ) : notifications.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold">Không có yêu cầu mới nào</p>
                    </div>
                ) : (
                    notifications.map((note, idx) => (
                        <div key={note.id || idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                                    {note.email?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-slate-800">{note.email}</h4>
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full uppercase">Yêu cầu cấp quyền</span>
                                    </div>
                                    <p className="text-slate-600 text-sm mt-2 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                        "{note.message}"
                                    </p>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" /> {formatDate(note.date)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    className="px-4 py-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-transparent hover:border-red-100 text-sm font-bold flex items-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" /> Xóa
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex gap-5">
                <div className="p-3 bg-indigo-100 rounded-2xl h-fit">
                    <Mail className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h5 className="font-bold text-indigo-900">Mẹo cho Admin</h5>
                    <p className="text-indigo-800 text-sm mt-1 leading-relaxed">
                        Bạn có thể xem các yêu cầu ở đây. Để cấp quyền, hãy sao chép email người dùng, chuyển sang tab <strong>Tài khoản</strong>, tìm email đó và thay đổi vai trò (Role) của họ. Hệ thống sẽ tự động gửi Mail thông báo cho họ sau khi bạn lưu.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;
