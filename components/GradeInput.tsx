import React, { useState, useEffect } from 'react';
import { api } from '../services/gasApi';
import { Student } from '../types';
import { Save, X, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Loader2, Sparkles, Filter } from 'lucide-react';
import { SCORE_TYPES } from '../constants';

interface GradeInputProps {
    userRole: string;
    assignedClasses?: string;
}

const GradeInput: React.FC<GradeInputProps> = ({ userRole, assignedClasses = '' }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<{ [key: string]: any }>({});
    const [loading, setLoading] = useState(true);
    const [filterClass, setFilterClass] = useState('ALL');
    const [classes, setClasses] = useState<string[]>([]);

    const [pendingChanges, setPendingChanges] = useState<{ [key: string]: number }>({});
    const [isSaving, setIsSaving] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Filter Dropdown
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const rawStudents = await api.getAllStudentsWithPermission();
            const studentObjs = rawStudents.map(row => ({
                id: row[0],
                tenThanh: row[1],
                hoDem: row[2],
                ten: row[3],
                lop: row[4],
            } as Student));
            setStudents(studentObjs);

            const uniqueClasses = Array.from(new Set(studentObjs.map(s => s.lop))).filter(Boolean).sort();
            setClasses(uniqueClasses);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        // Permission check
        let hasPermission = false;

        // Normalize: strip "LỚP ", "KHỐI ", non-alphanumeric, and whitespace
        const normalize = (s: string) => (s || "").toString().trim().toUpperCase().replace(/^(LỚP|KHỐI)\s+/i, '').replace(/[^A-Z0-9]/g, '');

        // Check for high-level permissions first (case insensitive)
        const rawAssigned = (assignedClasses || "").toString().trim().toUpperCase();

        if (userRole === 'ADMIN' || rawAssigned === 'ALL' || rawAssigned === 'ADMIN' || rawAssigned === 'TOTAL') {
            hasPermission = true;
        } else if (userRole === 'TEACHER') {
            // STRICT: Must have assigned classes to see anything
            if (!rawAssigned) {
                hasPermission = false;
            } else {
                const allowed = rawAssigned.split(',').map(normalize).filter(Boolean);
                const studentLop = normalize(s.lop);
                hasPermission = allowed.includes(studentLop);
            }
        } else {
            hasPermission = false;
        }

        if (!hasPermission) return false;

        return filterClass === 'ALL' || s.lop === filterClass;
    });

    console.log("GradeInput Filter Stats:", {
        totalStudents: students.length,
        filteredCount: filteredStudents.length,
        userRole,
        assignedClasses
    });

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        if (paginatedStudents.length > 0) {
            const ids = paginatedStudents.map(s => s.id);
            api.getMultipleStudentScores(ids).then(data => {
                setGrades(prev => ({ ...prev, ...data }));
            });
        }
    }, [currentPage, filterClass, students]);

    const handleInputChange = (studentId: string, type: string, value: string) => {
        const key = `${studentId}_${type}`;

        // 1. Update visual state in 'grades' immediately
        setGrades(prev => {
            const studentData = prev[studentId] || { scores: {} };
            const studentScores = studentData.scores || {};
            return {
                ...prev,
                [studentId]: {
                    ...studentData,
                    scores: {
                        ...studentScores,
                        [type]: { ...studentScores[type], score: value }
                    }
                }
            };
        });

        // 2. Manage 'pendingChanges' for batch saving
        if (value === '') {
            setPendingChanges(prev => ({ ...prev, [key]: -1 }));
        } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
                setPendingChanges(prev => ({ ...prev, [key]: numValue }));
            } else {
                setPendingChanges(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            }
        }
    };

    const handleBatchSave = async () => {
        const changeCount = Object.keys(pendingChanges).length;
        if (changeCount === 0) return;

        if (!confirm(`Xác nhận lưu ${changeCount} thay đổi điểm số vào hệ thống?`)) return;

        setIsSaving(true);
        const scoresToSave = Object.entries(pendingChanges).map(([key, score]) => {
            const [id, type] = key.split('_');
            // Sending explicit NULL to signal Google Sheets to CLEAR the cell
            return { id, type, score: score === -1 ? null : score };
        });

        try {
            const result = await api.recordScoresBatch(scoresToSave);
            if (result.success) {
                // 1. Clear memory of changes
                setPendingChanges({});

                // 2. FORCE CLEAR local grades for these students to kill "ghost" data
                const updatedIds = scoresToSave.map(s => s.id);
                setGrades(prev => {
                    const next = { ...prev };
                    updatedIds.forEach(id => {
                        if (next[id]) {
                            // Reset average and scores for this student locally
                            next[id] = { ...next[id], scores: {}, average: 'N/A', rank: '' };
                        }
                    });
                    return next;
                });

                // 3. Re-fetch fresh data from the server
                const ids = paginatedStudents.map(s => s.id);
                const freshData = await api.getMultipleStudentScores(ids);
                setGrades(prev => ({ ...prev, ...freshData }));
            } else {
                alert('Máy chủ từ chối: ' + result.message);
            }
        } catch (e) {
            alert('Lỗi kết nối cơ sở dữ liệu: ' + (e as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
            <p className="font-bold text-slate-600">Đang đồng bộ danh sách lớp...</p>
        </div>
    );

    const pendingCount = Object.keys(pendingChanges).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Header Card */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 flex items-center justify-center">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sổ Điểm Điện Tử</h2>
                            <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Hệ thống tự động tính điểm trung bình & xếp loại
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className={`flex flex-col items-end mr-4 transition-all duration-300 ${pendingCount > 0 ? 'opacity-100' : 'opacity-0'}`}>
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Thay đổi chưa lưu</span>
                            <span className="text-lg font-black text-slate-700">{pendingCount} mục</span>
                        </div>
                        {userRole !== 'GUEST' && (
                            <button
                                onClick={handleBatchSave}
                                disabled={isSaving || pendingCount === 0}
                                className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95
                              ${pendingCount > 0 && !isSaving
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 -translate-y-0.5'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                            >
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                {isSaving ? 'ĐANG ĐẨY DỮ LIỆU...' : 'LƯU TẤT CẢ'}
                            </button>
                        )}
                        {userRole === 'GUEST' && (
                            <div className="flex items-center gap-2 px-6 py-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 font-bold text-sm">
                                <AlertCircle className="h-5 w-5" />
                                <span>Bạn đang ở chế độ Xem. Vui lòng liên hệ Admin để cấp quyền nhập điểm.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Control & Filter Area */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsClassDropdownOpen(!isClassDropdownOpen); }}
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-full font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm min-w-[160px] justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-blue-500" />
                                <span className="text-xs uppercase tracking-wider">{filterClass === 'ALL' ? 'TẤT CẢ LỚP' : `LỚP ${filterClass}`}</span>
                            </div>
                            <ChevronRight className={`h-4 w-4 transition-transform ${isClassDropdownOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {isClassDropdownOpen && (
                            <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[60] animate-in fade-in zoom-in-95 duration-200 grid grid-cols-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => { setFilterClass('ALL'); setCurrentPage(1); setIsClassDropdownOpen(false); }}
                                    className={`flex items-center px-4 py-2.5 text-sm font-bold transition-colors ${filterClass === 'ALL' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    Tất cả lớp
                                </button>
                                <div className="h-px bg-slate-100 my-1 mx-2" />
                                {classes.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => { setFilterClass(c); setCurrentPage(1); setIsClassDropdownOpen(false); }}
                                        className={`flex items-center px-4 py-2.5 text-sm font-bold transition-colors ${filterClass === c ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        LỚP {c}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 font-bold text-sm">
                    <Filter className="h-4 w-4" />
                    <span>{filteredStudents.length} Học viên được tìm thấy</span>
                </div>
            </div>

            {/* Main Table Area */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
                {/* Scroll Indicator for mobile */}
                <div className="sm:hidden flex items-center justify-center p-3 text-[10px] font-black text-blue-500 bg-blue-50/50 uppercase tracking-widest gap-2">
                    Vuốt sang phải để xem điểm trung bình <ChevronRight className="h-3 w-3" />
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 uppercase tracking-widest text-[10px] font-black text-slate-400">
                                <th className="px-6 py-5 w-16">#</th>
                                <th className="px-4 py-5">Học viên & Thông tin</th>
                                {SCORE_TYPES.map(t => <th key={t} className="px-4 py-5 text-center w-24">{t}</th>)}
                                <th className="px-8 py-5 text-blue-600 text-center w-28">ĐIỂM TB</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedStudents.map((student, index) => {
                                const studentData = grades[student.id];
                                const scores = studentData?.scores || {};
                                const average = studentData?.average || 'N/A';
                                const isNA = average === 'N/A';
                                const avgNum = parseFloat(average);

                                return (
                                    <tr key={student.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                                        <td className="px-8 py-6 font-bold text-slate-400 text-sm">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                        </td>
                                        <td className="px-4 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800 text-base group-hover:text-blue-600 transition-colors">
                                                    {student.tenThanh} {student.hoDem} {student.ten}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                                        Lớp {student.lop}
                                                    </span>
                                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">#{student.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        {SCORE_TYPES.map(type => {
                                            const pendingKey = `${student.id}_${type}`;
                                            const isPending = pendingChanges[pendingKey] !== undefined;
                                            const pValue = pendingChanges[pendingKey];

                                            // Resolve display value: pending state is global truth
                                            const displayScore = isPending
                                                ? (pValue === -1 ? '' : pValue)
                                                : (scores[type]?.score ?? '');

                                            const hasValue = displayScore !== '' && displayScore !== null && displayScore !== undefined;

                                            return (
                                                <td key={type} className="px-4 py-6 text-center">
                                                    <div className="relative inline-flex items-center group/input">
                                                        <input
                                                            type="number"
                                                            min="0" max="10" step="0.1"
                                                            readOnly={userRole === 'GUEST'}
                                                            className={`w-20 h-11 text-center font-black text-lg border-2 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                                                        ${isPending ? 'bg-orange-50 border-orange-300 text-orange-700 animate-pulse' : 'bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100'}
                                                        ${userRole === 'GUEST' ? 'cursor-not-allowed opacity-80' : ''}
                                                    `}
                                                            value={displayScore}
                                                            onChange={(e) => handleInputChange(student.id, type, e.target.value)}
                                                            placeholder="-"
                                                        />
                                                        {hasValue && userRole !== 'GUEST' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleInputChange(student.id, type, '');
                                                                }}
                                                                className="absolute -right-2 -top-2 bg-white text-slate-300 hover:text-red-500 opacity-0 group-hover/input:opacity-100 transition-all p-1.5 rounded-full shadow-lg border border-slate-100 z-10 hover:scale-110 active:scale-90"
                                                                title="Xóa điểm"
                                                                tabIndex={-1}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-8 py-6 text-center">
                                            <div className={`inline-flex items-center justify-center w-14 h-11 rounded-2xl font-black text-lg shadow-sm border-2 ${isNA ? 'bg-slate-50 text-slate-300 border-transparent' :
                                                avgNum >= 8 ? 'bg-green-50 text-green-600 border-green-100' :
                                                    avgNum >= 6.5 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        avgNum >= 5 ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                            'bg-red-50 text-red-600 border-red-100'
                                                }`}>
                                                {average}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {paginatedStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <AlertCircle className="h-12 w-12 mb-4 opacity-10" />
                        <p className="font-black tracking-tight">Không có học sinh trong danh sách hiển thị</p>
                    </div>
                )}
            </div>

            {/* Premium Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4 py-2 mt-4 mb-20">
                <p className="text-sm font-bold text-slate-500">
                    Hiển thị từ <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span>
                    <span> đến </span>
                    <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span>
                    <span> trong tổng số </span>
                    <span className="text-slate-900">{filteredStudents.length}</span> kết quả
                </p>

                <div className="flex items-center gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(c => c - 1)}
                        className={`p-3 rounded-2xl border transition-all shadow-sm ${currentPage === 1 ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-90'}`}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex gap-1 items-center px-4">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Simple pagination window logic
                            let pageNum = i + 1;
                            if (totalPages > 5 && currentPage > 3) {
                                pageNum = currentPage - 2 + i;
                                if (pageNum + 2 > totalPages) pageNum = totalPages - 4 + i;
                            }
                            if (pageNum <= 0) return null;
                            if (pageNum > totalPages) return null;

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-11 h-11 rounded-2xl text-sm font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(c => c + 1)}
                        className={`p-3 rounded-2xl border transition-all shadow-sm ${currentPage === totalPages ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-90'}`}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GradeInput;