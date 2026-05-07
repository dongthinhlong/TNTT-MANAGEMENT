import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, Legend
} from 'recharts';
import { Users, FileText, TrendingUp, Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/gasApi';

// ================================================================
// Helpers
// ================================================================

/** Trả về chuỗi "DD/MM/YYYY" từ Date object */
function toVNDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Trả về chuỗi "YYYY-MM-DD" từ Date object (Local time) */
function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

/** Lấy Thứ Hai đầu tuần của ngày d */
function getWeekStart(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay(); // 0 = CN, 1 = T2...
    const diff = (day === 0 ? -6 : 1 - day);
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

/** Parse timestamp linh hoạt từ backend */
function parseTimestamp(raw: any): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'string') {
        const clean = raw.trim();
        // 1. dd/MM/yyyy HH:mm:ss
        const vnMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
        if (vnMatch) {
            const [, dd, mm, yyyy, hh, min, ss] = vnMatch;
            return new Date(+yyyy, +mm - 1, +dd, +(hh || 0), +(min || 0), +(ss || 0));
        }
        // 2. ISO or yyyy-MM-dd
        const d = new Date(clean.replace(' ', 'T'));
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// ================================================================
// Component
// ================================================================
const AttendanceReport: React.FC = () => {
    const [reports, setReports] = useState<any[]>([]);
    const [studentsList, setStudentsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // === BỘ LỌC ===
    // === BỘ LỌC ===
    const [viewMode, setViewMode] = useState<'today' | 'day' | 'week' | 'month' | 'custom' | 'all'>('month');
    const [weekOffset, setWeekOffset] = useState(0);
    const [monthOffset, setMonthOffset] = useState(0);
    const [specificDate, setSpecificDate] = useState(toISODate(new Date()));
    const [startDate, setStartDate] = useState(toISODate(new Date()));
    const [endDate, setEndDate] = useState(toISODate(new Date()));
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
    const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

    const toggleClass = (className: string) => {
        setExpandedClasses(prev => {
            const next = new Set(prev);
            if (next.has(className)) next.delete(className);
            else next.add(className);
            return next;
        });
    };

    const toggleStudent = (studentId: string) => {
        setExpandedStudents(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) next.delete(studentId);
            else next.add(studentId);
            return next;
        });
    };

    // Load học sinh 1 lần duy nhất
    useEffect(() => {
        api.getAllStudentsWithPermission()
            .then(data => setStudentsList(data || []))
            .catch(e => setError('Lỗi tải danh sách học sinh'));
    }, []);


    // Unique class options for filter
    const classOptions = useMemo(() => {
        const set = new Set<string>();
        studentsList.forEach(s => {
            let cls = '';
            if (Array.isArray(s) && s[4]) cls = s[4];
            else if (s && s.lop) cls = s.lop;
            if (cls) set.add(cls);
        });
        return Array.from(set);
    }, [studentsList]);
    // Load dữ liệu báo cáo theo khoảng thời gian
    useEffect(() => {
        const loadReport = async () => {
            setLoading(true);
            try {
                let start: string | undefined;
                let end: string | undefined;
                const now = new Date();

                if (viewMode === 'today') {
                    start = end = toISODate(now);
                } else if (viewMode === 'day') {
                    start = end = specificDate;
                } else if (viewMode === 'week') {
                    const ws = getWeekStart(now);
                    ws.setDate(ws.getDate() + (weekOffset * 7));
                    const we = new Date(ws);
                    we.setDate(ws.getDate() + 6);
                    start = toISODate(ws);
                    end = toISODate(we);
                } else if (viewMode === 'month') {
                    const ms = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
                    const me = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
                    start = toISODate(ms);
                    end = toISODate(me);
                } else if (viewMode === 'custom') {
                    start = startDate;
                    end = endDate;
                }
                // 'all' -> start, end undefined -> GAS fallback lấy 500 bản ghi cuối

                const repData = await api.getAttendanceReport(start, end);
                setReports(repData || []);
            } catch (err: any) {
                setError(err.message || 'Lỗi tải dữ liệu báo cáo');
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, [viewMode, weekOffset, monthOffset, specificDate, startDate, endDate]);

    // Build student map
    const sMap = useMemo(() => {
        const map = new Map<string, { name: string; className: string }>();
        studentsList.forEach(s => {
            if (Array.isArray(s) && s[0]) {
                const nameStr = s[1] ? `${s[1]} ${s[2]} ${s[3]}` : `${s[2]} ${s[3]}`;
                map.set(String(s[0]).trim(), { name: nameStr.trim(), className: s[4] || 'N/A' });
            } else if (s && s.id) {
                const nameStr = s.tenThanh ? `${s.tenThanh} ${s.hoDem} ${s.ten}` : `${s.hoDem} ${s.ten}`;
                map.set(String(s.id).trim(), { name: nameStr.trim(), className: s.lop || 'N/A' });
            }
        });
        return map;
    }, [studentsList]);

    // Parse all raw rows once
    const parsedRows = useMemo(() => {
        if (!reports || reports.length <= 1) return [];
        return reports.slice(1).map(row => {
            const ts = parseTimestamp(row[0]);
            const rawId = String(row[1] || row[2] || '').trim();
            const info = sMap.get(rawId) || { name: 'Chưa gán tên', className: 'N/A' };
            return { ts, rawId, ...info, displayTime: ts ? ts.toLocaleString('vi-VN') : String(row[0]) };
        }).filter(r => r.ts !== null) as {
            ts: Date; rawId: string; name: string; className: string; displayTime: string;
        }[];
    }, [reports, sMap]);

    // ── Tính toán theo chế độ xem ──
    const { filteredRows, dateLabel, classChartData, dailyChartData, totalCount, todayCount } = useMemo(() => {
        const now = new Date();
        let dateLabel = '';
        if (viewMode === 'today') {
            dateLabel = toVNDate(now);
        } else if (viewMode === 'day') {
            const [y, m, d] = specificDate.split('-').map(Number);
            dateLabel = toVNDate(new Date(y, m - 1, d));
        } else if (viewMode === 'custom') {
            const [ys, ms, ds] = startDate.split('-').map(Number);
            const [ye, me, de] = endDate.split('-').map(Number);
            dateLabel = `${toVNDate(new Date(ys, ms - 1, ds))} – ${toVNDate(new Date(ye, me - 1, de))}`;
        } else if (viewMode === 'week') {
            const ws = getWeekStart(now);
            ws.setDate(ws.getDate() + weekOffset * 7);
            const we = new Date(ws);
            we.setDate(ws.getDate() + 6);
            dateLabel = `${toVNDate(ws)} – ${toVNDate(we)}`;
        } else if (viewMode === 'month') {
            const mDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
            dateLabel = `Tháng ${mDate.getMonth() + 1}/${mDate.getFullYear()}`;
        } else {
            dateLabel = 'Tất cả (500 lượt gần nhất)';
        }

        // Vì đã được lọc từ server, ở đây chỉ cần parse để hiện
        const filteredRows = parsedRows.filter(r => (!selectedClass || r.className === selectedClass));
        const todayStr = toVNDate(now);
        const todayCount = filteredRows.filter(r => toVNDate(r.ts) === todayStr).length;
        const totalCount = filteredRows.length;

        // ── Biểu đồ theo lớp ──
        const cStats: Record<string, number> = {};
        filteredRows.forEach(r => {
            cStats[r.className] = (cStats[r.className] || 0) + 1;
        });
        const classChartData = Object.entries(cStats)
            .map(([name, count]) => ({ name, 'Có mặt': count }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // ── Biểu đồ theo ngày (chỉ dùng khi xem theo tuần/tất cả) ──
        const dailyStats: Record<string, number> = {};
        if (viewMode === 'week') {
            const ws = getWeekStart(now);
            ws.setDate(ws.getDate() + (weekOffset * 7));
            for (let i = 0; i < 7; i++) {
                const d = new Date(ws);
                d.setDate(d.getDate() + i);
                dailyStats[toVNDate(d)] = 0;
            }
        }
        filteredRows.forEach(r => {
            const key = toVNDate(r.ts);
            dailyStats[key] = (dailyStats[key] || 0) + 1;
        });
        const dailyChartData = Object.entries(dailyStats)
            .sort(([a], [b]) => {
                const [da, ma, ya] = a.split('/').map(Number);
                const [db, mb, yb] = b.split('/').map(Number);
                return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
            })
            .map(([date, count]) => {
                // Rút gọn nhãn trục X: "11/03"
                const [dd, mm] = date.split('/');
                return { date: `${dd}/${mm}`, 'Số lượt': count };
            });

        return { filteredRows: [...filteredRows].reverse(), dateLabel, classChartData, dailyChartData, totalCount, todayCount };
    }, [parsedRows, viewMode, weekOffset, monthOffset, selectedClass]);

    // ── Group by Class and Student ──
    const groupedAttendance = useMemo(() => {
        const grouped: Record<string, any[]> = {};

        let targetStudents = studentsList;
        if (selectedClass) {
            targetStudents = studentsList.filter(s => {
                let cls = '';
                if (Array.isArray(s) && s[4]) cls = s[4];
                else if (s && s.lop) cls = s.lop;
                return cls === selectedClass;
            });
        }

        targetStudents.forEach(s => {
            let id = '';
            let name = '';
            let cls = '';
            if (Array.isArray(s) && s[0]) {
                id = String(s[0]).trim();
                name = s[1] ? `${s[1]} ${s[2]} ${s[3]}` : `${s[2]} ${s[3]}`;
                cls = s[4] || 'Chưa gán lớp';
            } else if (s && s.id) {
                id = String(s.id).trim();
                name = s.tenThanh ? `${s.tenThanh} ${s.hoDem} ${s.ten}` : `${s.hoDem} ${s.ten}`;
                cls = s.lop || 'Chưa gán lớp';
            }
            if (id) {
                if (!grouped[cls]) grouped[cls] = [];
                grouped[cls].push({ id, name, scans: [] });
            }
        });

        filteredRows.forEach(row => {
            const cls = row.className;
            if (grouped[cls]) {
                const student = grouped[cls].find(st => st.id === row.rawId);
                if (student) {
                    student.scans.push(row);
                } else {
                    grouped[cls].push({ id: row.rawId, name: row.name, scans: [row] });
                }
            } else if (!selectedClass || cls === selectedClass) {
                grouped[cls] = [{ id: row.rawId, name: row.name, scans: [row] }];
            }
        });

        Object.keys(grouped).forEach(cls => {
            grouped[cls].sort((a, b) => {
                const namesA = a.name.split(' ');
                const namesB = b.name.split(' ');
                const lastA = namesA[namesA.length - 1] || '';
                const lastB = namesB[namesB.length - 1] || '';
                return lastA.localeCompare(lastB);
            });
        });

        return Object.keys(grouped).sort().map(cls => {
            const classScans = filteredRows.filter(r => r.className === cls);
            const classTotalDays = new Set(classScans.map(r => toVNDate(r.ts))).size;
            return {
                className: cls,
                classTotalDays,
                students: grouped[cls]
            };
        });
    }, [studentsList, filteredRows, selectedClass]);

    if (loading) return (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="font-bold">Đang tổng hợp dữ liệu điểm danh...</p>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-3">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div><h3 className="font-bold">Lỗi tải báo cáo</h3><p className="text-sm">{error}</p></div>
        </div>
    );

    // Xóa return early nếu parsedRows rỗng ở đây để hiển thị Bộ lọc


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* ── SMART FILTER DASHBOARD ── */}
            <div className="bg-white rounded-[2.5rem] p-2 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 overflow-hidden">
                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

                    {/* 1. Class Selection */}
                    <div className="flex-1 p-4 lg:p-6 group cursor-pointer hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đối tượng</label>
                                <select
                                    className="w-full bg-transparent border-none p-0 font-black text-slate-800 text-lg focus:ring-0 cursor-pointer appearance-none"
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                >
                                    <option value="">Tất cả các lớp</option>
                                    {classOptions.map(cls => (
                                        <option key={cls} value={cls}>Lớp {cls}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. View Mode */}
                    <div className="flex-1 p-4 lg:p-6 group hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chế độ xem</label>
                                <div className="flex bg-slate-100/50 p-1 rounded-xl w-fit">
                                    {(['today', 'day', 'week', 'month', 'custom', 'all'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => { setViewMode(m); setWeekOffset(0); setMonthOffset(0); }}
                                            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap ${viewMode === m ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {m === 'today' ? 'Hôm nay' : m === 'day' ? 'Ngày' : m === 'week' ? 'Tuần' : m === 'month' ? 'Tháng' : m === 'custom' ? 'Tùy chọn' : 'Tất cả'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Time Navigation / Custom Range */}
                    <div className="flex-[1.5] p-4 lg:p-6 group hover:bg-slate-50/50 transition-colors relative">
                        <div className="flex items-center gap-4 h-full">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời gian</label>

                                {viewMode === 'day' ? (
                                    <input
                                        type="date"
                                        value={specificDate}
                                        onChange={(e) => setSpecificDate(e.target.value)}
                                        className="bg-transparent border-none p-0 font-black text-slate-800 text-lg focus:ring-0 cursor-pointer w-full"
                                    />
                                ) : viewMode === 'custom' ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="bg-transparent border-none p-0 font-black text-slate-800 text-sm focus:ring-0 cursor-pointer w-32"
                                        />
                                        <span className="text-slate-300">→</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="bg-transparent border-none p-0 font-black text-slate-800 text-sm focus:ring-0 cursor-pointer w-32"
                                        />
                                    </div>
                                ) : (viewMode === 'week' || viewMode === 'month') ? (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-black text-slate-800 text-lg">{dateLabel}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { if (viewMode === 'week') setWeekOffset(w => w - 1); else setMonthOffset(m => m - 1); }}
                                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-all"
                                            >
                                                <ChevronLeft className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => { if (viewMode === 'week') setWeekOffset(w => Math.min(w + 1, 0)); else setMonthOffset(m => Math.min(m + 1, 0)); }}
                                                disabled={(viewMode === 'week' ? weekOffset === 0 : monthOffset === 0)}
                                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-all disabled:opacity-20"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="font-black text-slate-800 text-lg">{dateLabel}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── STATS CARDS ── */}
            {parsedRows.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-200">
                            <p className="text-blue-200 font-bold uppercase tracking-widest text-[10px] mb-2">
                                {viewMode === 'today' ? 'Hôm nay' : viewMode === 'week' ? 'Trong tuần này' : 'Tổng lượt quét'}
                            </p>
                            <h2 className="text-5xl font-black">{filteredRows.length}</h2>
                            <p className="text-blue-200 text-sm mt-1 font-medium">lượt điểm danh</p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm flex flex-col justify-between">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Hôm nay</p>
                            <h2 className="text-3xl font-black text-slate-800">{todayCount}</h2>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm flex flex-col justify-between">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Tổng lượt</p>
                            <h2 className="text-3xl font-black text-slate-800">{totalCount}</h2>
                        </div>
                    </div>

                    {/* ── BIỂU ĐỒ THEO NGÀY (chỉ hiện khi xem tuần / tất cả) ── */}
                    {(viewMode === 'week' || viewMode === 'all') && dailyChartData.length > 0 && (
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-base">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                Xu hướng điểm danh theo ngày
                            </h3>
                            <div className="h-60 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} allowDecimals={false} />
                                        <RechartsTooltip
                                            cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 13 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                                        <Line type="monotone" dataKey="Số lượt" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} activeDot={{ r: 7 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ── BIỂU ĐỒ THEO LỚP ── */}
                    {classChartData.length > 0 && (
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-base">
                                <Users className="h-5 w-5 text-blue-600" />
                                Phân bố theo lớp
                            </h3>
                            <div className="h-60 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={classChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} allowDecimals={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 13 }}
                                        />
                                        <Bar dataKey="Có mặt" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={36} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ── DANH SÁCH CHI TIẾT ── */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-base">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Danh sách chi tiết
                            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                {filteredRows.length} lượt
                            </span>
                        </h3>

                        {groupedAttendance.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <p className="font-bold">Không có dữ liệu</p>
                                <p className="text-sm">Chọn khoảng thời gian khác hoặc kiểm tra đã quét mã chưa.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {groupedAttendance.map(group => {
                                    const isExpanded = expandedClasses.has(group.className) || selectedClass === group.className;
                                    return (
                                        <div key={group.className} className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white transition-all hover:border-slate-200">
                                            <button
                                                onClick={() => toggleClass(group.className)}
                                                className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        <Users className="h-5 w-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <h4 className="font-black text-slate-800">Lớp {group.className}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sĩ số: {group.students.length} học sinh</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                                        {group.students.filter((s: any) => s.scans.length > 0).length} hiện diện
                                                    </span>
                                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <ChevronRight className="h-5 w-5 text-slate-400 rotate-90" />
                                                    </div>
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="overflow-x-auto border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-50/30">
                                                                <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest pl-6">Học Sinh</th>
                                                                <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center w-32">Buổi có mặt</th>
                                                                <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center w-32">Buổi vắng</th>
                                                                <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest pr-6 text-right">Chi tiết</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {group.students.map((student: any) => {
                                                                const studentUniqueDays = new Set(student.scans.map((s: any) => toVNDate(s.ts))).size;
                                                                const absentDays = group.classTotalDays - studentUniqueDays;
                                                                const isStudentExpanded = expandedStudents.has(student.id);

                                                                return (
                                                                    <React.Fragment key={student.id}>
                                                                        <tr className="hover:bg-slate-50/50 transition-colors group/row cursor-pointer" onClick={() => toggleStudent(student.id)}>
                                                                            <td className="py-4 pl-6">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-sm shrink-0 group-hover/row:bg-blue-100 group-hover/row:text-blue-600 transition-all group-hover/row:scale-110">
                                                                                        {student.name.charAt(0)}
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="font-black text-slate-800 text-sm block">{student.name}</span>
                                                                                        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-tighter">{student.id}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-xl font-black text-xs ${studentUniqueDays > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                                    {studentUniqueDays} buổi
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-4 text-center">
                                                                                <span className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-xl font-black text-xs ${absentDays > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                                    {absentDays} buổi
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-4 pr-6 text-right">
                                                                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                                                    <div className={`transition-transform duration-300 ${isStudentExpanded ? 'rotate-180' : ''}`}>
                                                                                        <ChevronRight className="h-5 w-5 rotate-90" />
                                                                                    </div>
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                        {isStudentExpanded && (
                                                                            <tr className="bg-slate-50/50">
                                                                                <td colSpan={4} className="py-4 px-6 border-b border-slate-100">
                                                                                    <div className="text-sm">
                                                                                        <span className="font-bold text-slate-600 mb-3 block">Chi tiết thời gian điểm danh:</span>
                                                                                        {student.scans.length > 0 ? (
                                                                                            <div className="flex flex-wrap gap-2">
                                                                                                {student.scans.map((s: any, idx: number) => (
                                                                                                    <span key={idx} className="text-xs font-bold bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg shadow-sm">
                                                                                                        {s.displayTime}
                                                                                                    </span>
                                                                                                ))}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-xs font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                                                                                                Chưa có lượt điểm danh nào
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-3xl border border-slate-100">
                    <FileText className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <p className="font-bold text-lg">Chưa có dữ liệu điểm danh</p>
                    <p className="text-sm">Quét mã QR và đảm bảo Sheet "Attendance" đã được cấu hình.</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceReport;
