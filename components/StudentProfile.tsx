import React, { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    Trophy, Star, Calendar, User, Hash,
    Download, Share2, ShieldCheck, Sparkles, MapPin,
    GraduationCap
} from "lucide-react";
import { api } from "../services/gasApi";
import { Student } from "../types";

interface StudentProfileProps {
    studentId?: string;
    isGuestView?: boolean;
    onClose?: () => void;
    studentData?: any; // If passed directly
    simpleQrMode?: boolean; // NEW: Only show QR
}

const StudentProfile: React.FC<StudentProfileProps> = ({
    studentId,
    isGuestView = false,
    onClose,
    studentData: initialData,
    simpleQrMode = false
}) => {
    const [data, setData] = useState<any>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState("");
    const qrRef = useRef<HTMLDivElement>(null);

    // Helper: Logic from StudentList to map array to object
    const mapRowToStudent = (row: any) => {
        // If it's already an object with named keys, return it (preserving known keys)
        if (!Array.isArray(row) && typeof row === 'object') {
            return {
                id: row.id || row[0],
                tenThanh: row.tenThanh || row[1],
                hoDem: row.hoDem || row[2],
                ten: row.ten || row[3],
                lop: row.lop || row[4],
                ngaySinh: row.ngaySinh || row[5],
                ngayRuaToi: row.ngayRuaToi || row[6],
                phuHuynh: row.phuHuynh || row[7],
                giaoKhu: row.giaoKhu || row[8],
                sdt: row.sdt || row[9]
            };
        }
        // Fallback to array mapping
        return {
            id: row[0],
            tenThanh: row[1],
            hoDem: row[2],
            ten: row[3],
            lop: row[4],
            ngaySinh: row[5],
            ngayRuaToi: row[6],
            phuHuynh: row[7],
            giaoKhu: row[8],
            sdt: row[9],
        };
    };

    const formatDateVal = (d: any) => {
        if (!d) return '---';
        try {
            const date = new Date(d);
            if (isNaN(date.getTime())) return d;
            return date.toLocaleDateString('vi-VN');
        } catch { return d; }
    };

    useEffect(() => {
        // Only fetch if we are in Guest View (or don't have data) AND have an ID
        if (!data && studentId) {
            setLoading(true);

            const fetchData = async () => {
                try {
                    // 1. Fetch Student Info
                    // We switch to getAllStudentsWithPermission to ensure we get the correct column structure
                    // matches the StudentList component. findStudentById seems to return a different schema.
                    const allStudents = await api.getAllStudentsWithPermission();

                    // Find the specific student info from the full list
                    // We assume row[0] is always the ID based on mapRowToStudent logic
                    let rawStudent = null;
                    if (Array.isArray(allStudents)) {
                        rawStudent = allStudents.find((r: any) => Array.isArray(r) ? r[0] === studentId : r.id === studentId);
                    }

                    if (rawStudent) {
                        const studentObj = mapRowToStudent(rawStudent);

                        // Fetch Scores only if NOT in simple QR mode (to save bandwidth)
                        let scoresData = null;
                        if (!simpleQrMode) {
                            try {
                                scoresData = await api.getStudentScores(studentId);
                            } catch (scoreErr) {
                                console.warn("Could not fetch scores for guest", scoreErr);
                            }
                        }

                        setData({
                            ...studentObj,
                            name: studentObj.tenThanh ? `${studentObj.tenThanh} ${studentObj.hoDem} ${studentObj.ten}` : `${studentObj.hoDem} ${studentObj.ten}`,
                            class: studentObj.lop,
                            dob: formatDateVal(studentObj.ngaySinh),
                            ngayRuaToi: studentObj.ngayRuaToi,
                            averageScore: scoresData?.average || 0,
                            rank: scoresData?.rank || "Chưa có",
                            scores: scoresData?.scores || {}
                        });
                    } else {
                        setError("Không tìm thấy học sinh với ID này trong danh sách lớp.");
                    }
                } catch (err) {
                    console.error(err);
                    setError("Lỗi tải dữ liệu danh sách học sinh.");
                } finally {
                    setLoading(false);
                }
            };

            fetchData();
        }
    }, [studentId, data, simpleQrMode]);

    // If data provided by parent (Admin view), use it.
    useEffect(() => {
        if (initialData) setData(initialData);
    }, [initialData]);

    const handleDownloadQR = () => {
        const canvas = qrRef.current?.querySelector("canvas");
        if (canvas) {
            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `QR_${sName}_${sId}.png`;
            link.href = url;
            link.click();
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-10 text-white gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="font-bold">Đang tra cứu hồ sơ...</p>
        </div>
    );

    if (error || (!data && isGuestView && !loading)) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Không thể truy cập</h3>
                <p className="text-slate-500">{error || "Mã học sinh hoặc đường dẫn không hợp lệ."}</p>
                <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">
                    Về trang chủ
                </button>
            </div>
        </div>
    );

    // Safe fallback for data
    const sName = data?.name || data?.ten || "Học sinh";
    const sId = data?.id || studentId || "HS000";
    const sClass = data?.class || data?.lop || "...";
    const sDoB = data?.dob || data?.ngaySinh || "...";
    const sAvg = data?.averageScore || 0;

    // Rank logic (duplicated from constants/backend for display)
    let rank = data?.rank || "Chưa xếp loại";
    let rankColor = "text-slate-500";
    let rankBg = "bg-slate-100";

    if (sAvg >= 8) { rankColor = "text-green-600"; rankBg = "bg-green-50"; }
    else if (sAvg >= 6.5) { rankColor = "text-blue-600"; rankBg = "bg-blue-50"; }
    else if (sAvg >= 5) { rankColor = "text-yellow-600"; rankBg = "bg-yellow-50"; }
    else if (sAvg > 0) { rankColor = "text-red-600"; rankBg = "bg-red-50"; }

    // QR URL: The public link to access this card
    // Assuming the app is deployed at a domain, we use window.location.origin
    // Format: /?view=profile&id=...
    const qrUrl = `${window.location.protocol}//${window.location.host}/?view=profile&id=${sId}`;

    return (
        <div className={`
      relative overflow-hidden
      ${isGuestView ? 'min-h-screen bg-slate-900 flex items-center justify-center p-4' : 'bg-white rounded-[2rem]'}
    `}>
            {/* Background decoration for Guest Mode */}
            {isGuestView && (
                <>
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[100px]" />
                    </div>
                </>
            )}

            <div className={`
        relative z-10 w-full max-w-md mx-auto bg-white overflow-hidden shadow-2xl transition-all duration-500
        ${isGuestView ? 'rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-8' : ''}
      `}>
                {/* Header Cover */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

                    {isGuestView && (
                        <div className="absolute top-5 left-6 text-white/90 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="p-1 bg-white/20 rounded-md backdrop-blur-sm"><GraduationCap className="h-3 w-3" /></div>
                            Cổng thông tin học sinh
                        </div>
                    )}

                    {onClose && (
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/20">
                            <span className="sr-only">Close</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>

                {/* --- SIMPLE QR MODE --- */}
                {simpleQrMode ? (
                    <div className="px-8 pb-10 -mt-16 text-center relative">
                        {/* QR Showpiece */}
                        <div className="relative inline-block mb-6 p-4 bg-white rounded-[2rem] shadow-2xl border-4 border-slate-50">
                            <div ref={qrRef} className="rounded-xl overflow-hidden">
                                <QRCodeCanvas value={qrUrl} size={180} level="H" includeMargin={true} />
                            </div>
                            {/* Floating Badge */}
                            <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white p-2.5 rounded-full shadow-lg border-4 border-white">
                                <Share2 className="h-5 w-5" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 mb-1">{sName}</h2>
                        <p className="text-slate-500 font-bold mb-8">ID: {sId}</p>

                        <div className="space-y-3">
                            <button
                                onClick={handleDownloadQR}
                                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="h-5 w-5" /> Tải thẻ QR về máy
                            </button>
                            <p className="text-xs text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                                Sử dụng mã này để tra cứu thông tin học sinh trực tuyến.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* --- FULL DETAIL MODE --- */
                    <div className="px-8 pb-10 -mt-16 text-center relative">
                        {/* Avatar */}
                        <div className="relative inline-block mb-4 group">
                            <div className="w-32 h-32 rounded-[2rem] border-4 border-white shadow-xl bg-slate-50 flex items-center justify-center text-5xl font-black text-slate-300 overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
                                {sName.charAt(0)}
                            </div>
                            {/* Status Dot */}
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-8 h-8 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm">
                                <User className="h-4 w-4 text-white" />
                            </div>
                        </div>

                        {/* Basic Info */}
                        <h2 className="text-2xl font-black text-slate-800 mb-1 leading-tight">{sName}</h2>
                        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
                            <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-slate-500 border border-slate-200">
                                <Hash className="h-3 w-3" /> {sId}
                            </div>
                            <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-blue-600 border border-blue-100">
                                {sClass}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex flex-col items-center hover:bg-slate-100 transition-colors">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Điểm TB</p>
                                <div className={`text-4xl font-black ${rankColor} tracking-tighter`}>
                                    {typeof sAvg === 'number' ? sAvg.toFixed(2) : sAvg}
                                </div>
                            </div>
                            <div className={`p-5 rounded-[1.5rem] border flex flex-col items-center justify-center ${rankBg} border-transparent`}>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Xếp loại</p>
                                <div className={`text-xl font-black ${rankColor} uppercase tracking-tight`}>
                                    {rank}
                                </div>
                            </div>
                        </div>

                        {/* --- DETAILED SCORES SECTION --- */}
                        {data?.scores && Object.keys(data.scores).length > 0 && (
                            <div className="mb-8 w-full">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-indigo-50 rounded-lg"><Star className="h-4 w-4 text-indigo-600" /></div>
                                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest text-left">Bảng điểm chi tiết</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-left">
                                    {Object.entries(data.scores).map(([type, detail]: any) => (
                                        <div key={type} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                                            <span className="text-xs font-bold text-slate-500 uppercase">{type}</span>
                                            <span className="text-lg font-black text-slate-800">{detail.score}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- FULL INFO SECTION --- */}
                        <div className="space-y-3 mb-8 text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-slate-50 rounded-lg"><User className="h-4 w-4 text-slate-400" /></div>
                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest text-left">Thông tin cá nhân</h3>
                            </div>

                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
                                <div className="flex items-start gap-4">
                                    <Calendar className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày sinh</p>
                                        <p className="text-sm font-bold text-slate-700">{sDoB}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày Rửa Tội</p>
                                        <p className="text-sm font-bold text-slate-700">{data?.ngayRuaToi ? new Date(data.ngayRuaToi).toLocaleDateString('vi-VN') : '---'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <User className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phụ huynh</p>
                                        <p className="text-sm font-bold text-slate-700">{data?.phuHuynh || '---'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <MapPin className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giáo khu</p>
                                        <p className="text-sm font-bold text-slate-700">{data?.giaoKhu || '---'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* QR Section */}
                        {!isGuestView && (
                            <div className="pt-8 border-t border-slate-50 flex flex-col items-center gap-5">
                                <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-100 transform hover:scale-105 transition-transform duration-300" ref={qrRef}>
                                    <QRCodeCanvas value={qrUrl} size={130} level="H" includeMargin={true} />
                                </div>
                                <div className="space-y-3 w-full">
                                    <p className="text-xs font-medium text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                                        Quét mã này để xem hồ sơ online <br /> (Chế độ khách không cần đăng nhập)
                                    </p>
                                    <button
                                        onClick={handleDownloadQR}
                                        className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                                    >
                                        <Download className="h-4 w-4" /> Tải thẻ QR về máy
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {isGuestView && (
                    <div className="pt-6 border-t border-slate-50">
                        <p className="text-[10px] text-slate-300 uppercase tracking-[0.3em] font-bold">
                            TNTT KIM THANH
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentProfile;
