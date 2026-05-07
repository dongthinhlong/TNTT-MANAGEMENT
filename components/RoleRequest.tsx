import React, { useState } from 'react';
import { UserCheck, ShieldCheck, Send, Info, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../services/gasApi';

interface RoleRequestProps {
    userEmail: string;
    currentRole: string;
}

const RoleRequest: React.FC<RoleRequestProps> = ({ userEmail, currentRole }) => {
    const [requestRole, setRequestRole] = useState('TEACHER');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Chúng ta sẽ sử dụng api.sendSupportTicket nhưng gửi với định dạng đặc biệt 
            // để Admin biết đây là yêu cầu cấp quyền
            await api.sendSupportTicket({
                subject: `[YỀU CẦU CẤP QUYỀN] - ${requestRole}`,
                message: `User: ${userEmail}\nRole mong muốn: ${requestRole}\nLý do: ${reason}`
            });
            setSubmitted(true);
        } catch (error) {
            alert('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Yêu cầu đã được gửi!</h2>
                <p className="text-slate-500 mb-8 font-medium">
                    Ban quản trị đã nhận được yêu cầu cấp quyền của bạn. Chúng tôi sẽ xem xét và phản hồi qua email hoặc cập nhật trực tiếp trên hệ thống sớm nhất có thể.
                </p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                    Quay lại
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Side: Info */}
                <div className="flex-1">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <UserCheck className="h-7 w-7 text-blue-600" />
                        </div>
                        Cấp quyền Tài khoản
                    </h1>
                    <p className="text-slate-500 font-medium mb-8">
                        Bạn đang đăng nhập dưới quyền <span className="text-blue-600 font-bold px-2 py-0.5 bg-blue-50 rounded-lg">{currentRole}</span>.
                        Để truy cập các chức năng nhập điểm hoặc quản lý, vui lòng gửi yêu cầu nâng cấp tài khoản.
                    </p>

                    <div className="space-y-4">
                        <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                            <div className="p-2 bg-amber-50 rounded-lg h-fit">
                                <ShieldCheck className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Quyền Teacher (Giáo lý viên)</h4>
                                <p className="text-slate-500 text-xs mt-1">Cho phép nhập điểm, chỉnh sửa thông tin học sinh và xuất báo cáo lớp học.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                            <div className="p-2 bg-indigo-50 rounded-lg h-fit">
                                <Clock className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Thời gian xử lý</h4>
                                <p className="text-slate-500 text-xs mt-1">Yêu cầu thường được duyệt trong vòng 24-48h sau khi Ban Quản trị xác minh danh tính.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Email tài khoản</label>
                            <input
                                type="text"
                                value={userEmail}
                                disabled
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Vai trò mong muốn</label>
                            <select
                                value={requestRole}
                                onChange={(e) => setRequestRole(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="TEACHER">TEACHER (Giáo lý viên/Huynh trưởng)</option>
                                <option value="ADMIN">ADMIN (Ban quản trị)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Lý do/Chức vụ thực tế</label>
                            <textarea
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ví dụ: Huynh trưởng phụ trách lớp Nghĩa 1, cần quyền nhập điểm..."
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none min-h-[120px]"
                            />
                        </div>

                        <div className="p-4 bg-blue-50 rounded-2xl flex gap-3">
                            <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                                Bằng việc gửi yêu cầu, bạn cam kết sử dụng hệ thống đúng mục đích và bảo mật dữ liệu học sinh.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="h-5 w-5" />
                                    Gửi yêu cầu nâng cấp
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RoleRequest;
