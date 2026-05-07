import React, { useState, useEffect } from 'react';
import { api } from '../services/gasApi';
import { User } from '../types';
import {
    Shield, Trash2, Edit2, Plus, X, Check, Search,
    AlertTriangle, UserCog, Mail, Users, ChevronRight,
    Loader2, BadgeCheck, ShieldAlert, Sparkles
} from 'lucide-react';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [allClasses, setAllClasses] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({
        email: '',
        role: 'GUEST',
        fullName: '',
        assignedClasses: ''
    });

    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRaw, classesRaw] = await Promise.all([
                api.getAllUsers(),
                api.getAllClasses()
            ]);

            setUsers(usersRaw);
            setAllClasses(classesRaw);
        } catch (e: any) {
            console.error(e);
            if (e.message && (e.message.includes('Function not found') || e.message.includes('script function not found'))) {
                setError('Vui lòng cập nhật Backend Google Apps Script để kích hoạt tính năng Quản lý User (Hàm getAllUsers bị thiếu).');
            } else {
                setError('Lỗi tải danh sách người dùng. ' + e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData(user);
            setSelectedClasses(user.assignedClasses === 'ALL' ? allClasses : user.assignedClasses.split(',').map(c => c.trim()).filter(Boolean));
        } else {
            setEditingUser(null);
            setFormData({ email: '', role: 'GUEST', fullName: '', assignedClasses: '' });
            setSelectedClasses([]);
        }
        setIsModalOpen(true);
    };

    const handleClassToggle = (cls: string) => {
        setSelectedClasses(prev =>
            prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
        );
    };

    const handleSelectAllClasses = () => {
        if (selectedClasses.length === allClasses.length) setSelectedClasses([]);
        else setSelectedClasses(allClasses);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalClasses = '';
        if (formData.role === 'ADMIN') finalClasses = 'ALL';
        else if (formData.role === 'TEACHER') {
            finalClasses = selectedClasses.join(',');
            if (!finalClasses) {
                alert('Giáo viên cần được phân công ít nhất 1 lớp.');
                return;
            }
        }

        const payload = { ...formData, assignedClasses: finalClasses };

        try {
            if (editingUser) {
                const res = await api.updateUser(editingUser.email, payload);
                if (res.success) alert('Cập nhật thành công');
                else alert(res.message);
            } else {
                const res = await api.addUser(payload);
                if (res.success) alert('Thêm người dùng thành công');
                else alert(res.message);
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            alert('Lỗi hệ thống');
        }
    };

    const handleDelete = async (email: string) => {
        if (!confirm(`Xóa vĩnh viễn quyền truy cập của người dùng ${email}?`)) return;
        try {
            const res = await api.deleteUser(email);
            if (res.success) setUsers(prev => prev.filter(u => u.email !== email));
            else alert(res.message);
        } catch (e) {
            alert('Lỗi xóa người dùng');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
            <p className="font-bold text-slate-600">Đang đồng bộ cơ sở dữ liệu người dùng...</p>
        </div>
    );

    if (error) return (
        <div className="max-w-2xl mx-auto mt-20 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-red-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full translate-x-16 -translate-y-16" />
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="p-4 bg-red-100 text-red-600 rounded-2xl mb-6 shadow-sm">
                        <ShieldAlert className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Backend Chưa Được Nâng Cấp</h3>
                    <p className="text-slate-500 font-bold mb-8 leading-relaxed px-6">{error}</p>
                    <div className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 text-left">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-tight">Hành động: Vui lòng yêu cầu Quản trị viên hệ thống cập nhật file Google Apps Script (.gs) lên phiên bản mới nhất.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
                <div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-100 w-fit">
                        <UserCog className="h-3 w-3" />
                        Người dùng trên hệ thống
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Quản Lý Thành Viên</h2>
                    <p className="text-slate-500 font-medium mt-1">Cấp quyền truy cập và phân bổ lớp học phụ trách cho thành viên</p>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72 group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Tìm email, tên..."
                            className="bg-white pl-12 pr-4 py-4 rounded-2xl w-full text-sm font-bold border border-slate-100 shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all placeholder:text-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all hover:-translate-y-0.5 active:scale-95 text-sm"
                    >
                        <Plus className="h-5 w-5" /> TẠO USER
                    </button>
                </div>
            </div>

            {/* User Matrix Card */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Tài khoản / Email</th>
                                <th className="px-6 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Thành viên</th>
                                <th className="px-6 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Vị thế</th>
                                <th className="px-6 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Phụ trách lớp</th>
                                <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Quản trị</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <Users className="h-16 w-16 text-slate-100 mb-4" />
                                            <p className="font-black text-slate-300 tracking-tight">Không tìm thấy thành viên phù hợp</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.email} className="group hover:bg-blue-50/30 transition-all duration-300">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-white group-hover:text-blue-500 transition-colors shadow-inner">
                                                    <Mail className="h-5 w-5" />
                                                </div>
                                                <span className="font-black text-slate-800 text-sm">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="font-bold text-slate-600">{user.fullName || <em className="text-slate-300 font-medium">Chưa cập nhật</em>}</span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border
                                                ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                    user.role === 'TEACHER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                {user.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : user.role === 'TEACHER' ? <BadgeCheck className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                                {user.role}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            {user.role === 'ADMIN' ? (
                                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Toàn quyền
                                                </span>
                                            ) : user.role === 'TEACHER' ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {user.assignedClasses.split(',').filter(Boolean).slice(0, 3).map(c =>
                                                        <span key={c} className="bg-white text-blue-600 px-2 py-0.5 rounded-lg border border-blue-50 text-[10px] font-black uppercase tracking-tighter shadow-sm">{c}</span>
                                                    )}
                                                    {user.assignedClasses.split(',').filter(Boolean).length > 3 && (
                                                        <span className="text-slate-300 font-black text-[10px] self-center ml-1">+{user.assignedClasses.split(',').filter(Boolean).length - 3} KHÁC</span>
                                                    )}
                                                    {user.assignedClasses.split(',').filter(Boolean).length === 0 && (
                                                        <span className="text-slate-300 italic text-xs">Chưa gán lớp</span>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleOpenModal(user)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all hover:shadow-md" title="Chỉnh sửa quyền">
                                                    <Edit2 className="h-5 w-5" />
                                                </button>
                                                <button onClick={() => handleDelete(user.email)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-white rounded-2xl transition-all hover:shadow-md" title="Xóa người dùng">
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal - Modern Experience */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
                        <div className="px-10 py-8 flex justify-between items-center bg-slate-50 border-b border-slate-100 shrink-0">
                            <div>
                                <h3 className="font-black text-2xl text-slate-900 tracking-tight">
                                    {editingUser ? 'Cập Nhật Hồ Sơ' : 'Thành Viên Mới'}
                                </h3>
                                <p className="text-sm font-bold text-slate-400 mt-0.5">{editingUser ? 'Thay đổi quyền hạn & phân lớp' : 'Khởi tạo tài khoản hệ thống'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all hover:rotate-90">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Địa chỉ Email Google <span className="text-red-500 font-black">*</span></label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-300" />
                                        <input
                                            type="email"
                                            required
                                            disabled={!!editingUser}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none disabled:opacity-50 font-bold text-slate-700 placeholder:text-slate-200"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="partner@gmail.com"
                                        />
                                    </div>
                                    {!editingUser && <p className="text-[10px] text-blue-500 font-bold mt-2 uppercase tracking-tight">Cần sử dụng email đã liên kết với Google Identity</p>}
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Định danh họ tên</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700 placeholder:text-slate-200"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="Tên đầy đủ của thành viên"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <RoleSelect
                                        label="Quản trị"
                                        role="ADMIN"
                                        active={formData.role === 'ADMIN'}
                                        icon={Shield}
                                        onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                                    />
                                    <RoleSelect
                                        label="Giáo viên"
                                        role="TEACHER"
                                        active={formData.role === 'TEACHER'}
                                        icon={BadgeCheck}
                                        onClick={() => setFormData({ ...formData, role: 'TEACHER' })}
                                    />
                                    <RoleSelect
                                        label="Khách"
                                        role="GUEST"
                                        active={formData.role === 'GUEST'}
                                        icon={Users}
                                        onClick={() => setFormData({ ...formData, role: 'GUEST' })}
                                    />
                                </div>

                                {formData.role === 'TEACHER' && (
                                    <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex justify-between items-center mb-6 px-1">
                                            <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Phân lớp phụ trách</label>
                                            <button
                                                type="button"
                                                onClick={handleSelectAllClasses}
                                                className="text-[10px] font-black text-indigo-500 hover:text-indigo-800 uppercase tracking-widest"
                                            >
                                                {selectedClasses.length === allClasses.length ? 'BỎ TẤT CẢ' : 'CHỌN TẤT CẢ'}
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {allClasses.map(cls => (
                                                <button
                                                    key={cls}
                                                    type="button"
                                                    onClick={() => handleClassToggle(cls)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border-2
                                                        ${selectedClasses.includes(cls)
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                            : 'bg-white text-slate-400 border-transparent hover:bg-white hover:text-indigo-500 hover:shadow-sm'}`}
                                                >
                                                    {selectedClasses.includes(cls) && <Check className="h-3.5 w-3.5" />}
                                                    {cls}
                                                </button>
                                            ))}
                                            {allClasses.length === 0 && <p className="text-slate-300 italic text-xs py-4 text-center w-full">Đang tải danh sách lớp...</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 flex flex-col sm:flex-row gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-8 py-4 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors text-sm"
                                >
                                    HUỶ BỎ
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 shadow-xl shadow-slate-200 transition-all hover:shadow-blue-200 hover:-translate-y-0.5 active:scale-95 text-sm"
                                >
                                    {editingUser ? 'LƯU THAY ĐỔI' : 'TẠO THÀNH VIÊN'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const RoleSelect = ({ label, role, active, icon: Icon, onClick }: any) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2
            ${active ? 'bg-white border-blue-600 shadow-lg shadow-blue-100 ring-1 ring-blue-600' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-100 group'}`}
    >
        <div className={`p-3 rounded-xl ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-300 group-hover:text-blue-400'}`}>
            <Icon className="h-5 w-5" />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-blue-900' : 'text-slate-400 group-hover:text-slate-600'}`}>{label}</span>
    </button>
);

export default UserManagement;