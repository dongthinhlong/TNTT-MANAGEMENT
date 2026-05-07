import React, { useState } from 'react';
import { Database, ExternalLink, ShieldAlert, Info, RefreshCw } from 'lucide-react';

const DatabaseEditor: React.FC = () => {
    // Link Google Sheet của bạn
    const SHEET_URL = "https://docs.google.com/spreadsheets/d/1FmyVeIq-D6tlFBtEil_gPH2vK-6mCLqsOzVeQTtbtzQ/edit";

    const [loading, setLoading] = useState(true);

    const handleRefresh = () => {
        setLoading(true);
        const iframe = document.getElementById('db-iframe') as HTMLIFrameElement;
        if (iframe) {
            iframe.src = iframe.src;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Database className="h-7 w-7 text-indigo-600" />
                        </div>
                        Quản trị Cơ sở Dữ liệu
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                        Vùng nhạy cảm: Chỉnh sửa trực tiếp Database qua Google Sheets
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    <a
                        href={SHEET_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Mở trong Tab mới
                    </a>
                </div>
            </div>

            {/* Info Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 items-start">
                <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                    <Info className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                    <h4 className="font-bold text-amber-900 text-sm">Lưu ý quan trọng cho Admin</h4>
                    <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                        Mọi thay đổi trên Google Sheet này sẽ <strong>có hiệu lực ngay lập tức</strong> trên hệ thống.
                        Vui lòng không thay đổi cấu trúc các cột (Header) hoặc xóa dữ liệu mà không có bản sao lưu.
                        Nếu bạn thấy yêu cầu đăng nhập, hãy chắc chắn rằng bạn đã đăng nhập vào tài khoản Google có quyền truy cập file này.
                    </p>
                </div>
            </div>

            {/* Embedded Sheet */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 relative">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="font-bold text-slate-600">Đang tải bảng tính...</p>
                    </div>
                )}
                <iframe
                    id="db-iframe"
                    src={`${SHEET_URL}?resourcekey=&range=A1:Z100`}
                    className="w-full h-full border-none"
                    onLoad={() => setLoading(false)}
                    title="Google Sheet Database"
                />
            </div>

            <div className="text-center py-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Powered by Google Sheets Integration &bull; Secure Administrator Access Only
                </p>
            </div>
        </div>
    );
};

export default DatabaseEditor;
