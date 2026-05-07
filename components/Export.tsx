import React, { useState, useEffect } from 'react';
import { api } from '../services/gasApi';
import { Download, FileSpreadsheet, Layers, Share2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface ExportProps {
    userRole?: string;
    assignedClasses?: string;
}

const Export: React.FC<ExportProps> = ({ userRole = 'GUEST', assignedClasses = '' }) => {
    const [classes, setClasses] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [scope, setScope] = useState('ALL');
    const [selectedClass, setSelectedClass] = useState('');

    useEffect(() => {
        api.getExportableClasses().then(data => {
            if (userRole === 'TEACHER') {
                const allowed = assignedClasses.split(',').map(c => c.trim());
                setClasses(data.filter(c => allowed.includes(c)));
            } else {
                setClasses(data);
            }
        }).catch(console.error);
    }, [userRole, assignedClasses]);

    const handleExport = async (type: 'student' | 'grades') => {
        if (scope === 'CLASS' && !selectedClass) {
            alert('Vui lòng chọn lớp học cụ thể để thực hiện xuất bản.');
            return;
        }

        setLoading(true);
        try {
            const result = type === 'student'
                ? await api.exportStudentList(scope, selectedClass)
                : await api.exportGradesList(scope, selectedClass);

            if (result.success && result.downloadUrl) {
                // Thêm log để theo dõi URL tải về trong quá trình debug
                console.log('Download URL generated:', result.downloadUrl);
                window.open(result.downloadUrl, '_blank');
            } else {
                // Thông báo chi tiết nếu backend trả về lỗi
                const errorMessage = result.message || 'Lỗi trong quá trình khởi tạo tệp tin trên máy chủ.';
                alert(`Không thể trích xuất dữ liệu: ${errorMessage}`);
            }
        } catch (e: any) {
            console.error('Export Error:', e);
            // Hiển thị chi tiết lỗi "đồng bộ" để dễ debug
            const detailedError = e.message || 'Lỗi không xác định khi kết nối với máy chủ.';
            alert(`Lỗi hệ thống đồng bộ tệp tin: ${detailedError}\n\nVui lòng kiểm tra lại quyền truy cập Google Drive của Admin hoặc thử lại sau vài phút.`);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
                <div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-100 w-fit">
                        <Share2 className="h-3 w-3" />
                        Công cụ báo cáo
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Xuất Dữ Liệu</h2>
                    <p className="text-slate-500 font-medium mt-1">Kết xuất danh sách và bảng điểm trực tiếp sang định dạng Spreadsheet</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Configuration Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Layers className="h-5 w-5" /></div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Cấu hình xuất</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Phạm vi dữ liệu</label>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setScope('ALL')}
                                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${scope === 'ALL' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-50 hover:bg-slate-50'}`}
                                    >
                                        <div>
                                            <p className={`font-black tracking-tight ${scope === 'ALL' ? 'text-blue-700' : 'text-slate-700'}`}>Tất cả các lớp</p>
                                            <p className="text-xs text-slate-500 font-bold">Toàn bộ hệ thống</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${scope === 'ALL' ? 'border-blue-600 bg-blue-600' : 'border-slate-200'}`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setScope('CLASS')}
                                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${scope === 'CLASS' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-50 hover:bg-slate-50'}`}
                                    >
                                        <div>
                                            <p className={`font-black tracking-tight ${scope === 'CLASS' ? 'text-blue-700' : 'text-slate-700'}`}>Tùy chọn lớp</p>
                                            <p className="text-xs text-slate-500 font-bold">Lọc theo khối lớp</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${scope === 'CLASS' ? 'border-blue-600 bg-blue-600' : 'border-slate-200'}`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {scope === 'CLASS' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Chọn phân lớp</label>
                                    <select
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all appearance-none cursor-pointer outline-none shadow-inner"
                                        value={selectedClass}
                                        onChange={e => setSelectedClass(e.target.value)}
                                    >
                                        <option value="">-- Danh sách lớp --</option>
                                        {classes.map(c => <option key={c} value={c}>Phân lớp {c}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                                    Lưu ý: Hệ thống sẽ tự động tạo một phiên bản Excel trực tuyến trên Google Drive của quản trị viên trước khi tải về.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                        <button
                            disabled={loading}
                            onClick={() => handleExport('student')}
                            className="group relative bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/50 hover:-translate-y-2 overflow-hidden"
                        >
                            <div className="absolute top-[-10%] left-[-10%] w-32 h-32 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-700" />
                            <div className="relative z-10 h-20 w-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-200 transition-all">
                                <Download className="h-8 w-8" />
                            </div>
                            <h3 className="relative z-10 font-black text-2xl text-slate-800 tracking-tight group-hover:text-blue-700 transition-colors">Danh sách Học sinh</h3>
                            <p className="relative z-10 text-sm text-slate-400 font-bold mt-2 px-4 uppercase tracking-tighter">Bao gồm thông tin liên lạc & hồ sơ cá nhân</p>


                        </button>

                        <button
                            disabled={loading}
                            onClick={() => handleExport('grades')}
                            className="group relative bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-2xl hover:shadow-green-200/50 hover:-translate-y-2 overflow-hidden"
                        >
                            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-green-50 rounded-full group-hover:scale-150 transition-transform duration-700" />
                            <div className="relative z-10 h-20 w-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm group-hover:bg-green-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-green-200 transition-all">
                                <FileSpreadsheet className="h-8 w-8" />
                            </div>
                            <h3 className="relative z-10 font-black text-2xl text-slate-800 tracking-tight group-hover:text-green-700 transition-colors">Bảng điểm tổng hợp</h3>
                            <p className="relative z-10 text-sm text-slate-400 font-bold mt-2 px-4 uppercase tracking-tighter">Điểm thi, điểm chuyên cần & kết quả xếp loại</p>
                        </button>

                    </div>

                    {loading && (
                        <div className="bg-blue-900/90 backdrop-blur-md p-10 rounded-[3rem] flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-300">
                            <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-400" />
                            <p className="font-extrabold text-xl tracking-tight">Hệ thống đang trích xuất dữ liệu...</p>
                            <p className="text-blue-300/80 text-sm font-bold mt-2">Vui lòng không đóng trình duyệt lúc này</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Export;

