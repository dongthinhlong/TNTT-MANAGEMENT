import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  CreditCard, FileDown, Filter, Search,
  Users, ChevronRight, ChevronLeft, CheckSquare, Square, Loader, X, Upload, ImageIcon
} from 'lucide-react';
import { api } from '../services/gasApi';

interface Student {
  id: string;
  tenThanh: string;
  hoDem: string;
  ten: string;
  lop: string;
}

interface BadgePrinterProps {
  userRole: string;
  assignedClasses?: string;
}

const SCHOOL_YEAR = localStorage.getItem('tntt_academic_year') || '2025-2026';

// px dimensions @96dpi → 8.6cm×5.4cm
const CARD_W_PX = 325;
const CARD_H_PX = 204;

const fullName = (s: Student) =>
  [s.tenThanh, s.hoDem, s.ten].filter(Boolean).join(' ');

// ─── Logo SVG inline ────────────────────────────────────────────
const DioceseLogo: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="6" fill="#fff" stroke="#222" strokeWidth="3" />
    <rect x="43" y="8" width="14" height="84" fill="#CC1111" />
    <rect x="8" y="43" width="84" height="14" fill="#CC1111" />
    <rect x="8"  y="8"  width="33" height="33" fill="#FFD700" />
    <rect x="59" y="59" width="33" height="33" fill="#FFD700" />
    <rect x="59" y="8"  width="33" height="33" fill="#fff" />
    <rect x="8"  y="59" width="33" height="33" fill="#fff" />
    <circle cx="50" cy="50" r="10" fill="#fff" stroke="#CC1111" strokeWidth="2" />
    <circle cx="50" cy="50" r="5"  fill="#CC1111" />
  </svg>
);

// ─── Badge DOM component (dùng để hiển thị + capture) ───────────
export const Badge = React.forwardRef<HTMLDivElement, { student: Student; logoUrl?: string }>(
  ({ student, logoUrl }, ref) => {
    const name = fullName(student);
    return (
      <div
        ref={ref}
        style={{
          width: CARD_W_PX,
          height: CARD_H_PX,
          border: '2.5px solid #1a1a2e',
          borderRadius: 10,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Times New Roman', Times, serif",
          overflow: 'hidden',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px 6px', borderBottom: '1.5px solid #1a1a2e',
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
            : <DioceseLogo size={44} />}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#1a1a2e', lineHeight: 1.35 }}>
              GIÁO PHẬN BÙI CHU
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#1a1a2e', lineHeight: 1.35 }}>
              GIÁO XỨ KIM THÀNH
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{
          textAlign: 'center', padding: '5px 0 4px',
          fontSize: 14, fontWeight: 900, letterSpacing: 2, color: '#1a1a2e',
          borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase',
        }}>
          THẺ TÊN THIẾU NHI
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, padding: '8px 12px 8px 14px', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: '#444' }}>
              <span style={{ fontWeight: 600 }}>HỌ TÊN: </span>
              <span style={{ fontWeight: 800, fontSize: 12, color: '#1a1a2e' }}>
                {name.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#444' }}>
              <span style={{ fontWeight: 600 }}>LỚP: </span>
              <span style={{ fontWeight: 800, fontSize: 12, color: '#1a1a2e' }}>{student.lop}</span>
            </div>
            <div style={{ fontSize: 11, color: '#444' }}>
              <span style={{ fontWeight: 600 }}>NĂM HỌC: </span>
              <span style={{ fontWeight: 800, fontSize: 12, color: '#1a1a2e' }}>{SCHOOL_YEAR}</span>
            </div>
          </div>

          {/* QR – render as SVG to avoid canvas context limits when rendering hundreds */}
          <div style={{
            width: 90, height: 90, borderRadius: 8,
            overflow: 'hidden', border: '1.5px solid #e2e8f0',
            flexShrink: 0, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QRCodeSVG value={student.id} size={86} level="H" includeMargin={false} />
          </div>
        </div>
      </div>
    );
  }
);
Badge.displayName = 'Badge';

// ─── Preview card thumbnail ──────────────────────────────────────
const BadgeCard: React.FC<{
  student: Student;
  selected: boolean;
  onToggle: () => void;
  selectionMode: boolean;
  logoUrl?: string;
}> = ({ student, selected, onToggle, selectionMode, logoUrl }) => (
  <div
    onClick={selectionMode ? onToggle : undefined}
    style={{ cursor: selectionMode ? 'pointer' : 'default' }}
    className={`relative group rounded-2xl border-2 transition-all duration-200 overflow-hidden bg-white hover:shadow-lg
      ${selected ? 'border-blue-500 shadow-xl shadow-blue-100 scale-[1.02]' : 'border-slate-100 hover:border-blue-200'}`}
  >
    {selectionMode && (
      <div className="absolute top-2 left-2 z-10">
        {selected
          ? <CheckSquare className="h-5 w-5 text-blue-600" />
          : <Square className="h-5 w-5 text-slate-300" />}
      </div>
    )}
    <div className="p-3 flex flex-col items-center gap-2">
      {/* Scale down the badge to thumbnail */}
      <div style={{
        transform: 'scale(0.48)',
        transformOrigin: 'top center',
        width: CARD_W_PX * 0.48,
        height: CARD_H_PX * 0.48,
        flexShrink: 0,
        pointerEvents: 'none',
      }}>
        <Badge student={student} logoUrl={logoUrl} />
      </div>
      <div className="text-center mt-1 w-full">
        <p className="font-black text-slate-800 text-xs leading-tight truncate">{fullName(student)}</p>
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
          Lớp {student.lop}
        </span>
      </div>
    </div>
  </div>
);


// ─── Hidden off-screen render farm để capture PDF hàng loạt ─────
const HiddenBadges: React.FC<{
  students: Student[];
  containerRef: React.RefObject<HTMLDivElement>;
  logoUrl?: string;
}> = ({ students, containerRef, logoUrl }) => (
  <div
    ref={containerRef}
    style={{
      position: 'fixed',
      top: -9999,
      left: -9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      zIndex: -1,
      pointerEvents: 'none',
    }}
  >
    {students.map(s => (
      <div key={s.id} data-badge-id={s.id} style={{ marginBottom: 8 }}>
        <Badge student={s} logoUrl={logoUrl} />
      </div>
    ))}
  </div>
);

// ─── TRANG CHÍNH ─────────────────────────────────────────────────
const BadgePrinter: React.FC<BadgePrinterProps> = ({ userRole, assignedClasses = '' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [filterClass, setFilterClass] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Logo tùy chỉnh – lưu localStorage
  const [logoUrl, setLogoUrl] = useState<string>(() =>
    localStorage.getItem('badge_logo_url') || ''
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Logo phải nhỏ hơn 2MB!'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setLogoUrl(url);
      localStorage.setItem('badge_logo_url', url);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoReset = () => {
    setLogoUrl('');
    localStorage.removeItem('badge_logo_url');
  };

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

  const normalize = (s: string) =>
    (s || '').trim().toUpperCase().replace(/^(LỚP|KHỐI)\s+/i, '').replace(/[^A-Z0-9]/g, '');

  const filtered = students.filter(s => {
    const rawAssigned = (assignedClasses || '').toUpperCase().trim();
    let ok = userRole === 'ADMIN' || ['ALL', 'ADMIN', 'TOTAL'].includes(rawAssigned);
    if (!ok && userRole === 'TEACHER' && rawAssigned)
      ok = rawAssigned.split(',').map(normalize).includes(normalize(s.lop));
    if (!ok) return false;
    if (filterClass !== 'ALL' && s.lop !== filterClass) return false;
    const name = fullName(s).toLowerCase();
    return !search || name.includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
  });

  const targets = selectionMode && selected.size > 0
    ? filtered.filter(s => selected.has(s.id))
    : filtered;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedStudents = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterClass, search]);

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(s => s.id)));
  const clearSelect = () => setSelected(new Set());

  // ── Xuất PDF hàng loạt ─────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    if (targets.length === 0) return;
    setGenerating(true);
    setProgress(0);

    try {
      // PDF A4 landscape, đặt 2 thẻ/hàng, 4 thẻ/trang
      // Thẻ: 86mm × 54mm, margin 10mm, gap 6mm
      const CARD_W_MM = 86;
      const CARD_H_MM = 54;
      const MARGIN = 10;
      const GAP_X = 6;
      const GAP_Y = 6;
      const COLS = 2;
      const ROWS_PER_PAGE = 4;
      const PAGE_W = MARGIN * 2 + COLS * CARD_W_MM + (COLS - 1) * GAP_X; // ≈208
      const PAGE_H = MARGIN * 2 + ROWS_PER_PAGE * CARD_H_MM + (ROWS_PER_PAGE - 1) * GAP_Y; // ≈256

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_W, PAGE_H] });
      let isFirstPage = true;

      for (let i = 0; i < targets.length; i++) {
        const s = targets[i];
        // Tìm phần tử badge đã render trong hidden container
        const el = hiddenContainerRef.current?.querySelector(`[data-badge-id="${s.id}"] > div`) as HTMLElement | null;
        if (!el) continue;

        try {
          const canvas = await html2canvas(el as HTMLElement, {
            scale: 3, // Giảm scale xuống 3 thay vì 4 để tránh lỗi kích thước quá khổ
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: true,
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);

          const col = i % COLS;
          const rowInPage = Math.floor((i % (COLS * ROWS_PER_PAGE)) / COLS);
          const needNewPage = i > 0 && i % (COLS * ROWS_PER_PAGE) === 0;

          if (needNewPage) {
            pdf.addPage([PAGE_W, PAGE_H]);
          }
          if (isFirstPage && i === 0) isFirstPage = false;

          const x = MARGIN + col * (CARD_W_MM + GAP_X);
          const y = MARGIN + rowInPage * (CARD_H_MM + GAP_Y);
          pdf.addImage(imgData, 'JPEG', x, y, CARD_W_MM, CARD_H_MM, undefined, 'FAST');

          // Free memory
          canvas.width = 0;
          canvas.height = 0;
        } catch (err) {
          console.error(`Lỗi khi tạo ảnh cho học sinh ${s.id}:`, err);
        }

        setProgress(Math.round(((i + 1) / targets.length) * 100));
        // nhường thread để không block UI
        await new Promise(r => setTimeout(r, 10));
      }

      const rawLabel = filterClass === 'ALL' ? 'ToanTruong' : filterClass;
      const safeLabel = rawLabel
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '_');
        
      const filename = `THE_THIEU_NHI_${safeLabel}.pdf`;
      
      // XUẤT RA DATA URI THAY VÌ BLOB ĐỂ VƯỢT LỖI TRÌNH DUYỆT CHROME TỰ ĐỔI TÊN THÀNH UUID
      const dataUri = pdf.output('datauristring');
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dataUri;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (e) {
      console.error(e);
      alert('Lỗi khi tạo PDF!');
    } finally {
      setGenerating(false);
      setProgress(0);
      if (selectionMode) { setSelectionMode(false); clearSelect(); }
    }
  }, [targets, filterClass, selectionMode]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="font-bold">Đang tải danh sách học sinh...</p>
    </div>
  );

  return (
    <div className="space-y-6" onClick={() => setIsClassDropdownOpen(false)}>

      {/* Hidden badges for html2canvas capture */}
      <HiddenBadges students={targets} containerRef={hiddenContainerRef} logoUrl={logoUrl} />
      {/* Hidden file input for logo */}
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-blue-600" /> Tạo Thẻ Đeo Học Viên
          </h1>
          <p className="text-slate-500 font-medium mt-0.5">
            Tạo và tải PDF thẻ đeo (8.6 × 5.4 cm) kèm mã QR điểm danh
          </p>
          {/* Logo picker */}
          <div className="flex items-center gap-3 mt-3">
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                : <ImageIcon className="h-5 w-5 text-slate-300" />}
            </div>
            <button
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              {logoUrl ? 'Đổi logo' : 'Tải logo lên'}
            </button>
            {logoUrl && (
              <button
                onClick={handleLogoReset}
                className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
              >
                Xoá logo
              </button>
            )}
            <span className="text-xs text-slate-400">PNG/JPG, tối đa 2MB. Logo được lưu tự động.</span>
          </div>
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
                onClick={handleExportPDF}
                disabled={generating || filtered.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-60"
              >
                {generating ? <Loader className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {generating ? `Đang tạo... ${progress}%` : `Tải PDF tất cả (${filtered.length})`}
              </button>
            </>
          ) : (
            <>
              <button onClick={selectAll} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-all">Chọn tất cả</button>
              <button onClick={clearSelect} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-all">Bỏ chọn</button>
              <button
                onClick={handleExportPDF}
                disabled={selected.size === 0 || generating}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-60"
              >
                {generating ? <Loader className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {generating ? `Đang tạo... ${progress}%` : `Tải PDF (${selected.size})`}
              </button>
              <button
                onClick={() => { setSelectionMode(false); clearSelect(); }}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >Huỷ</button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {generating && (
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

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
              <button onClick={() => { setFilterClass('ALL'); setIsClassDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${filterClass === 'ALL' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                Tất cả lớp
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2" />
              {classes.map(c => (
                <button key={c} onClick={() => { setFilterClass(c); setIsClassDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${filterClass === c ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                  Lớp {c}
                </button>
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

      {/* ── GRID ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <CreditCard className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <p className="font-bold text-slate-500 text-lg">Không tìm thấy học sinh</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {pagedStudents.map(s => (
            <BadgeCard
              key={s.id}
              student={s}
              selected={selected.has(s.id)}
              onToggle={() => toggleSelect(s.id)}
              selectionMode={selectionMode}
              logoUrl={logoUrl}
            />
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
            <ChevronLeft className="h-5 w-5" />
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

export default BadgePrinter;
