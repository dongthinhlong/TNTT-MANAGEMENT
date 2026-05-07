import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';
import {
    QrCode, Download, Search, Filter,
    ChevronRight, Users, CheckSquare, Square, Loader
} from 'lucide-react';
import { api } from '../services/gasApi';


interface Student {
    id: string;
    tenThanh: string;
    hoDem: string;
    ten: string;
    lop: string;
}

const BASE_URL = `${window.location.protocol}//${window.location.host}`;

/** Tạo URL điểm danh: chỉ chứa ID để Scanner đọc */
const getQrValue = (studentId: string) => studentId;

/** Tên đầy đủ */
const fullName = (s: Student) =>
    [s.tenThanh, s.hoDem, s.ten].filter(Boolean).join(' ');

// ── Wrapper ẩn để render QR và tải PNG ──────────────────────────
const HiddenQR: React.FC<{ value: string; size?: number }> = ({ value, size = 200 }) => (
    <QRCodeCanvas value={value} size={size} level="H" includeMargin={true} />
);

/** Helper vẽ QR và Text lên Canvas chuẩn để tải ảnh */
const generateStyledCanvas = (student: Student, sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const size = 300;
    const padding = 20;
    const out = document.createElement('canvas');
    out.width = size + padding * 2;
    out.height = size + padding * 2 + 70;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);

    // Draw QR
    ctx.drawImage(sourceCanvas, padding, padding, size, size);

    // Draw Name
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fullName(student), out.width / 2, size + padding + 26);

    // Draw Meta
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText(`Lớp ${student.lop}  •  ${student.id}`, out.width / 2, size + padding + 46);

    return out;
};

// ── Card QR mỗi học sinh ─────────────────────────────────────────
interface QRCardProps {
    student: Student;
    selected: boolean;
    onToggle: () => void;
    selectionMode: boolean;
}

const QRCard: React.FC<QRCardProps> = ({ student, selected, onToggle, selectionMode }) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const qrValue = getQrValue(student.id);

    const downloadQR = () => {
        const canvas = canvasRef.current?.querySelector('canvas');
        if (!canvas) return;
        const styled = generateStyledCanvas(student, canvas);
        const a = document.createElement('a');
        a.download = `QR_${student.id}.png`;
        a.href = styled.toDataURL('image/png');
        a.click();
    };

    return (
        <div
            onClick={selectionMode ? onToggle : undefined}
            className={`relative bg-white rounded-3xl border-2 transition-all duration-200 overflow-hidden
                ${selectionMode ? 'cursor-pointer' : ''}
                ${selected
                    ? 'border-blue-500 shadow-xl shadow-blue-200 scale-[1.02]'
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}`}
        >
            {/* Checkbox góc */}
            {selectionMode && (
                <div className="absolute top-3 left-3 z-10">
                    {selected
                        ? <CheckSquare className="h-5 w-5 text-blue-600" />
                        : <Square className="h-5 w-5 text-slate-300" />}
                </div>
            )}

            <div className="p-5 flex flex-col items-center gap-3">
                {/* QR */}
                <div ref={canvasRef} className="rounded-xl overflow-hidden shadow-sm border border-slate-100">
                    <HiddenQR value={qrValue} size={140} />
                </div>

                {/* Info */}
                <div className="text-center w-full">
                    <p className="font-black text-slate-800 text-sm leading-tight line-clamp-2">
                        {s => s.tenThanh && <span className="text-blue-600 mr-1">{s.tenThanh}</span>}
                        {fullName(student)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            Lớp {student.lop}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{student.id}</span>
                    </div>
                </div>

                {/* Download btn (ẩn khi selection mode) */}
                {!selectionMode && (
                    <button
                        onClick={downloadQR}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        <Download className="h-3.5 w-3.5" /> Tải PNG
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── TRANG CHÍNH ─────────────────────────────────────────────────
interface QRManagerProps {
    userRole: string;
    assignedClasses?: string;
}

const QRManager: React.FC<QRManagerProps> = ({ userRole, assignedClasses = '' }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [filterClass, setFilterClass] = useState('ALL');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 24;
    const printAreaRef = useRef<HTMLDivElement>(null);

    // Load students
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const raw = await api.getAllStudentsWithPermission();
                const list: Student[] = (raw as any[]).map(r =>
                    Array.isArray(r)
                        ? { id: r[0], tenThanh: r[1], hoDem: r[2], ten: r[3], lop: r[4] }
                        : r
                );
                setStudents(list);
                const cl = Array.from(new Set(list.map(s => s.lop))).filter(Boolean).sort();
                setClasses(cl);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    // Filter
    const normalize = (s: string) =>
        (s || '').trim().toUpperCase().replace(/^(LỚP|KHỐI)\s+/i, '').replace(/[^A-Z0-9]/g, '');

    const filtered = students.filter(s => {
        // Permission
        const rawAssigned = (assignedClasses || '').toUpperCase().trim();
        let ok = userRole === 'ADMIN' || ['ALL', 'ADMIN', 'TOTAL'].includes(rawAssigned);
        if (!ok && userRole === 'TEACHER' && rawAssigned) {
            ok = rawAssigned.split(',').map(normalize).includes(normalize(s.lop));
        }
        if (!ok) return false;
        if (filterClass !== 'ALL' && s.lop !== filterClass) return false;
        const name = fullName(s).toLowerCase();
        return !search || name.includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    const pagedStudents = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterClass, search]);

    const toggleSelect = (id: string) =>
        setSelected(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });

    const selectAll = () => setSelected(new Set(filtered.map(s => s.id)));
    const clearSelect = () => setSelected(new Set());

    // ── Tải ZIP hàng loạt ──────────────────────────────────────────
    const handleBatchDownload = useCallback(async () => {
        const targets = selectionMode && selected.size > 0
            ? filtered.filter(s => selected.has(s.id))
            : filtered;
        if (targets.length === 0) return;

        setDownloading(true);
        try {
            const zip = new JSZip();
            const folderName = `TNTT_QR_${filterClass === 'ALL' ? 'ToanTruong' : filterClass}`;
            const folder = zip.folder(folderName);

            for (const s of targets) {
                const qrEl = document.querySelector<HTMLCanvasElement>(
                    `[data-qr-id="${s.id}"] canvas`
                );
                if (!qrEl) continue;

                const styledCanvas = generateStyledCanvas(s, qrEl);
                const base64Data = styledCanvas.toDataURL('image/png').split(',')[1];

                const cleanName = fullName(s).replace(/\s+/g, '_');
                const fileName = `${s.lop}_${cleanName}_${s.id}.png`;
                folder?.file(fileName, base64Data, { base64: true });
            }

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${folderName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } catch (e) {
            console.error(e);
            alert('Lỗi khi tạo file ZIP!');
        } finally {
            setDownloading(false);
            setSelectionMode(false);
            clearSelect();
        }
    }, [filtered, selectionMode, selected, filterClass]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="font-bold">Đang tải danh sách học sinh...</p>
        </div>
    );

    return (
        <div className="space-y-6" onClick={() => setIsClassDropdownOpen(false)}>

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <QrCode className="h-8 w-8 text-blue-600" /> Quản lý Thẻ QR
                    </h1>
                    <p className="text-slate-500 font-medium mt-0.5">
                        Tạo, tải và in thẻ QR hàng loạt cho học sinh – dùng để điểm danh
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {!selectionMode ? (
                        <>
                            <button
                                onClick={() => { setSelectionMode(true); clearSelect(); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                            >
                                <CheckSquare className="h-4 w-4 text-blue-500" /> Chọn để tải
                            </button>
                            <button
                                onClick={handleBatchDownload}
                                disabled={downloading || filtered.length === 0}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {downloading ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Tải tất cả ({filtered.length})
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={selectAll} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                                Chọn tất cả
                            </button>
                            <button onClick={clearSelect} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                                Bỏ chọn
                            </button>
                            <button
                                onClick={handleBatchDownload}
                                disabled={selected.size === 0 || downloading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {downloading ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Tải {selected.size > 0 ? `(${selected.size})` : ''}
                            </button>
                            <button
                                onClick={() => { setSelectionMode(false); clearSelect(); }}
                                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Huỷ
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── FILTER BAR ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc ID..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 shadow-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 shadow-sm min-w-[160px] justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-blue-500" />
                            <span>{filterClass === 'ALL' ? 'Tất cả lớp' : `Lớp ${filterClass}`}</span>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isClassDropdownOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isClassDropdownOpen && (
                        <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 max-h-72 overflow-y-auto">
                            <button
                                onClick={() => { setFilterClass('ALL'); setIsClassDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${filterClass === 'ALL' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                            >Tất cả lớp</button>
                            <div className="h-px bg-slate-100 my-1 mx-2" />
                            {classes.map(c => (
                                <button key={c}
                                    onClick={() => { setFilterClass(c); setIsClassDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${filterClass === c ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                >Lớp {c}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-sm">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="font-bold text-slate-700 text-sm">{filtered.length} thẻ</span>
                </div>
            </div>

            {/* ── SELECTION HINT ── */}
            {selectionMode && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-sm font-bold text-blue-700 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Chế độ chọn: Nhấp vào thẻ để chọn / bỏ chọn. Đã chọn {selected.size}/{filtered.length}.
                </div>
            )}

            {/* ── GRID QR CARDS ── */}
            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <QrCode className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <p className="font-bold text-slate-500 text-lg">Không tìm thấy học sinh</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {pagedStudents.map(s => (
                        <div key={s.id} data-qr-id={s.id}>
                            <QRCard
                                student={s}
                                selected={selected.has(s.id)}
                                onToggle={() => toggleSelect(s.id)}
                                selectionMode={selectionMode}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                    </button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = currentPage;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-500'}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-widest">
                        Trang {currentPage} / {totalPages}
                    </span>
                </div>
            )}
        </div>
    );
};

export default QRManager;
