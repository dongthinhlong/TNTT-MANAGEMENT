import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { ScanLine, FileText, CheckCircle, AlertCircle, Keyboard, Loader, HelpCircle, X, Info } from 'lucide-react';
import AttendanceReport from './AttendanceReport';
import { api } from '../services/gasApi';

interface AttendanceScannerProps {
  userRole: string;
}

const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ userRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'scan' | 'report'>('scan');
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastScannedId, setLastScannedId] = useState<string>('');
  const [scannedList, setScannedList] = useState<{ id: string, name?: string, className?: string, time: string, status: string }[]>([]);
  const [manualMode, setManualMode] = useState(false); // MANUAL TEST MODE
  const [manualId, setManualId] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // ⚡ TỐI ƯU: Load bản đồ học sinh để hiện tên tức thì
  const [studentMap, setStudentMap] = useState<Map<string, { name: string, className: string }>>(new Map());
  const [isStudentsLoading, setIsStudentsLoading] = useState<boolean>(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const processingIdsRef = useRef<Set<string>>(new Set()); // ⚡ Debounce Ref

  // ⚡ Lắng nghe phím Enter để đóng Popup và quét lượt tiếp theo
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((scannerStatus === 'success' || scannerStatus === 'error') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setScannerStatus('idle');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [scannerStatus]);

  useEffect(() => {
    if (activeSubTab === 'scan' && !manualMode && !isStudentsLoading) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [activeSubTab, manualMode, isStudentsLoading]);

  // Focus manual input when switching to manual mode
  useEffect(() => {
    if (manualMode) {
      stopScanner();
      setTimeout(() => manualInputRef.current?.focus(), 100);
    } else if (activeSubTab === 'scan' && !isStudentsLoading) {
      startScanner();
    }
  }, [manualMode, isStudentsLoading]);

  const startScanner = () => {
    if (scannerRef.current) return; // Already running

    // ⚡ Dịch nhãn của thư viện sang Tiếng Việt
    const translateUI = () => {
      const container = document.getElementById('qr-reader');
      if (!container) return;

      const buttons = container.querySelectorAll('button');
      buttons.forEach(btn => {
        if (btn.innerText.includes('Request Camera Permissions')) {
          btn.innerText = 'CẤP QUYỀN TRUY CẬP CAMERA';
        } else if (btn.innerText.includes('Stop Scanning')) {
          btn.innerText = 'DỪNG QUÉT MÃ';
        } else if (btn.innerText.includes('Start Scanning')) {
          btn.innerText = 'BẮT ĐẦU QUÉT';
        }
      });

      const span = container.querySelector('#qr-reader__dashboard_section_csr span');
      if (span && span.innerHTML.includes('Scanning')) {
        span.innerHTML = 'Đang trong chế độ quét...';
      }
    };

    // Theo dõi thay đổi DOM để dịch lại khi thư viện cập nhật UI nội bộ
    const observer = new MutationObserver(translateUI);
    
    // Clear previous elements if re-mounting
    setTimeout(() => {
      try {
        const qrElement = document.getElementById("qr-reader");
        if (qrElement) {
          observer.observe(qrElement, { childList: true, subtree: true });
        }

        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
                /* verbose= */ false
        );
        scannerRef.current.render(onScanSuccess, onScanFailure);
        
        // Chạy ngay lần đầu
        setTimeout(translateUI, 100);
      } catch (e) {
        console.error(e);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {
        console.error("Failed to clear scanner", e);
      }
      scannerRef.current = null;
    }
  };

  // Queue các ID chờ ghi thành công vào GAS
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  // Danh sách ID đã điểm danh hôm nay (để check trùng tức thì)
  const [todayScannedIds, setTodayScannedIds] = useState<Set<string>>(new Set());

  // Load danh sách đã quét hôm nay khi mở tab để check trùng (Tối ưu: Chỉ lấy ID)
  useEffect(() => {
    if (activeSubTab === 'scan') {
      const loadData = async () => {
        const needsMap = studentMap.size === 0;
        
        // Chỉ bắt đầu loading UI nếu cần tải map học sinh (vì lâu hơn)
        if (needsMap) setIsStudentsLoading(true);

        try {
          // ⚡ Luôn cập nhật danh sách đã quét hôm nay
          const ids = await api.getTodayScannedIds();
          setTodayScannedIds(new Set(ids));

          // ⚡ Load StudentMap nếu chưa có
          if (needsMap) {
            const data = await api.getAllStudentsWithPermission();
            const map = new Map();
            data.forEach((s: any) => {
              const rawId = Array.isArray(s) ? String(s[0]).trim() : String(s.id).trim();
              const info = Array.isArray(s)
                ? { name: `${s[1] || ''} ${s[2] || ''} ${s[3] || ''}`.trim(), className: s[4] || '' }
                : { name: `${s.tenThanh || ''} ${s.hoDem || ''} ${s.ten || ''}`.trim(), className: s.lop || '' };

              if (rawId) {
                map.set(rawId, info);
                map.set(rawId.toLowerCase(), info);
                const cleanId = rawId.replace(/^(ID|HS)/i, '');
                if (cleanId !== rawId) map.set(cleanId.toLowerCase(), info);
              }
            });
            setStudentMap(map);
          }
        } catch (e) {
          console.error('Lỗi tải dữ liệu:', e);
        } finally {
          setIsStudentsLoading(false);
        }
      };

      loadData();
    }
  }, [activeSubTab]);

  const onScanSuccess = (decodedText: string) => {
    const idToSend = decodedText.trim();
    if (!idToSend) return;

    // ⚡ CHIẾN THUẬT DEBOUNCE: Chống quét nhanh nhiều lần (0ms delay)
    if (processingIdsRef.current.has(idToSend)) return;
    processingIdsRef.current.add(idToSend);

    // Xoá sau 2 giây để cho phép quét lại nếu cần (ví dụ cho lượt khác) 
    // Nhưng todayScannedIds vẫn sẽ chặn nếu là trong cùng ngày
    setTimeout(() => processingIdsRef.current.delete(idToSend), 2000);

    console.log(`[Scanner] Đã đọc mã: ${idToSend}`);

    // ⚡ Tìm thông tin linh hoạt (Hỗ trợ tiền tốID, HS hoặc ID trần)
    const lookupId = idToSend.toLowerCase();
    const cleanId = idToSend.replace(/^(ID|HS)/i, '').toLowerCase();

    // Tìm trong map bản gốc, bản thường, hoặc bản đã xóa tiền tố HS/ID
    const studentInfo = studentMap.get(idToSend) ||
      studentMap.get(lookupId) ||
      studentMap.get(cleanId) ||
      { name: idToSend, className: '---' }; // FALLBACK: Hiện ID thay vì "Chưa gán tên"

    // ⚡ Kiểm tra trùng tại máy khách (render-stable check)
    if (todayScannedIds.has(idToSend) || todayScannedIds.has(lookupId) || todayScannedIds.has(cleanId)) {
      console.log(`[Scanner] ✋ Trùng lặp local: ${idToSend}.`);
      if (scannerStatus === 'idle') {
        const name = studentInfo.name;
        setErrorMessage(`ID ${name} đã điểm danh hôm nay rồi!`);
        setScannerStatus('error');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
      return;
    }

    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const tempEntry = { id: idToSend, name: studentInfo.name, className: studentInfo.className, time: timeStr, status: 'pending' };

    // ✅ Cập nhật UI NGAY LẬP TỨC (Optimistic UI) — hiện ID/Tên luôn
    setScannedList(prev => [tempEntry, ...prev].slice(0, 100));
    setLastScannedId(studentInfo.name);
    setScannerStatus('success');

    // 🔇 Gửi GAS ở background 
    setPendingIds(prev => new Set(prev).add(idToSend + '_' + timeStr));
    setTodayScannedIds(prev => new Set(prev).add(idToSend));

    console.log(`[GAS] Đang gửi yêu cầu ghi nhận cho: ${idToSend}...`);
    api.recordAttendance(idToSend)
      .then((result: any) => {
        console.log(`[GAS] Phản hồi từ server:`, result);
        if (result.success) {
          setScannedList(prev => prev.map(item =>
            item.id === idToSend && item.time === timeStr
              ? { ...item, status: 'OK' }
              : item
          ));
        } else if (result.isDuplicate) {
          setScannedList(prev => prev.map(item =>
            item.id === idToSend && item.time === timeStr
              ? { ...item, status: 'duplicate' }
              : item
          ));
          setErrorMessage(`Học sinh này đã được điểm danh hôm nay rồi!`);
          setScannerStatus('error');
          setTimeout(() => setScannerStatus('idle'), 3000);
        } else {
          setErrorMessage(result.message || 'Lỗi từ hệ thống. Hãy thử lại!');
          setScannerStatus('error');
          setScannedList(prev => prev.map(item =>
            item.id === idToSend && item.time === timeStr
              ? { ...item, status: 'error' }
              : item
          ));
        }
        setPendingIds(prev => { const n = new Set(prev); n.delete(idToSend + '_' + timeStr); return n; });
      })
      .catch((err: any) => {
        console.error('[Attendance] Lỗi ghi GAS:', err);
        setErrorMessage('Lỗi kết nối mạng. ID này sẽ được lưu tạm.');
        setScannerStatus('error');
        setScannedList(prev => prev.map(item =>
          item.id === idToSend && item.time === timeStr
            ? { ...item, status: 'error' }
            : item
        ));
        setPendingIds(prev => { const n = new Set(prev); n.delete(idToSend + '_' + timeStr); return n; });
        setTimeout(() => setScannerStatus('idle'), 4000);
      });
  };

  const onScanFailure = (_error: any) => {
    // Ignore routine scan failures
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim();
    if (!id) return;
    setManualId('');
    await onScanSuccess(id);
    setTimeout(() => manualInputRef.current?.focus(), 100);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 relative">
      <style>{`
        /* Custom UI override for html5-qrcode */
        #qr-reader {
          border: none !important;
          background: #f8fafc;
          border-radius: 1rem;
          padding: 1rem 0;
        }
        #qr-reader__dashboard_section_csr span {
          color: #64748b !important;
          font-family: inherit !important;
          font-weight: 500 !important;
        }
        #qr-reader button {
          background-color: #2563eb !important;
          color: white !important;
          font-weight: 800 !important;
          padding: 14px 28px !important;
          border-radius: 999px !important;
          border: none !important;
          box-shadow: 0 4px 14px -2px rgba(37, 99, 235, 0.3) !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          margin: 10px !important;
          font-family: inherit !important;
          font-size: 15px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        #qr-reader button:hover {
          background-color: #1d4ed8 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px -2px rgba(37, 99, 235, 0.4) !important;
        }
        #qr-reader button:active {
          transform: translateY(0) !important;
        }
        #qr-reader select {
          padding: 14px 20px !important;
          border-radius: 12px !important;
          border: 2px solid #e2e8f0 !important;
          font-weight: 700 !important;
          color: #334155 !important;
          margin-bottom: 16px !important;
          width: 100% !important;
          max-width: 320px !important;
          font-family: inherit !important;
          outline: none !important;
          background-color: white !important;
          appearance: auto !important;
        }
        #qr-reader select:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
        }
        #qr-reader a {
          color: #3b82f6 !important;
          text-decoration: none !important;
          font-weight: 700 !important;
          padding: 10px !important;
          display: inline-block !important;
        }
        #html5-qrcode-anchor-scan-type-change {
          display: none !important;
        }
        #qr-reader__scan_region img {
          max-width: 60% !important;
          margin: 0 auto !important;
        }
        #qr-reader__scan_region video {
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important;
        }
      `}</style>
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" onClick={() => setShowHelp(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" />
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
                  <Info className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Hướng dẫn giáo viên</h2>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-colors hover:bg-white hover:border-slate-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black">1</div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1">Quyền truy cập Camera</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Khi lần đầu dùng, hãy nhấn nút <b>Request Camera Permissions</b> và chọn cho phép trình duyệt truy cập camera thiết bị.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-colors hover:bg-white hover:border-slate-200">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black">2</div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1">Cách quét mã</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Đưa thẻ có mã QR của học sinh vào giữa khung hình. Nhẹ nhàng giữ chắc tay để camera lấy nét. Hệ thống sẽ tự bắt mã.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-colors hover:bg-white hover:border-slate-200">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-black">3</div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1">Xử lý khi quên thẻ</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Nếu camera không hoạt động hoặc học sinh mờ mã, chuyển tab <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 shadow-sm">Nhập thủ công</span> để điểm danh mã tay.</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowHelp(false)}
              className="mt-8 w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              ĐÃ HIỂU VÀ ĐÓNG
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <ScanLine className="h-8 w-8 text-blue-600" />
            Điểm Danh QR Code
          </h1>
          <p className="text-slate-500 font-medium">Sử dụng mã QR hoặc mã học viên để điểm danh</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('scan')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'scan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ScanLine className="h-4 w-4" /> Quét mã
          </button>
          <button
            onClick={() => setActiveSubTab('report')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeSubTab === 'report' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="h-4 w-4" /> Báo cáo
          </button>
        </div>
      </div>

      {activeSubTab === 'scan' && (
        <div className="max-w-md mx-auto relative">
          {isStudentsLoading ? (
            <div className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 mb-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative bg-white p-6 rounded-full shadow-xl border-2 border-blue-50">
                  <Loader className="h-10 w-10 text-blue-600 animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Đang tải danh sách...</h3>
              <p className="text-slate-500 font-bold text-sm max-w-xs mx-auto">
                Vui lòng đợi trong giây lát để hệ thống sẵn sàng quét mã và xác thực học sinh
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 mx-auto w-fit mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Hệ thống đã sẵn sàng quét
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
                <button
                  onClick={() => setManualMode(false)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${!manualMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  <ScanLine className="h-4 w-4" /> Camera
                </button>
                <button
                  onClick={() => setManualMode(true)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${manualMode ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
                >
                  <Keyboard className="h-4 w-4" /> Nhập thủ công
                </button>
              </div>

              <div className="mb-5">
                {!manualMode && (
                  <div id="qr-reader" className="rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner" />
                )}

                {(scannerStatus === 'success' || scannerStatus === 'error') && (
                  <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10"
                    onClick={() => setScannerStatus('idle')}
                  >
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" />
                    <div
                      className={`relative w-full max-w-lg p-10 rounded-[3rem] shadow-2xl border-2 transform animate-in zoom-in duration-300 flex flex-col items-center text-center
                        ${scannerStatus === 'success' ? 'bg-white border-green-500 shadow-green-200/50' : 'bg-white border-amber-500 shadow-amber-200/50'}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className={`mb-8 p-6 rounded-full inline-flex animate-bounce
                        ${scannerStatus === 'success' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}
                      >
                        {scannerStatus === 'success' ? <CheckCircle className="h-16 w-16" /> : <AlertCircle className="h-16 w-16" />}
                      </div>
                      <h2 className={`text-sm font-black uppercase tracking-widest mb-2
                        ${scannerStatus === 'success' ? 'text-green-600' : 'text-amber-600'}`}
                      >
                        {scannerStatus === 'success' ? 'ĐIỂM DANH THÀNH CÔNG' : 'CẢNH BÁO TRÙNG LẶP'}
                      </h2>
                      <h3 className="text-4xl font-black text-slate-800 tracking-tight mb-4 break-words px-4">
                        {scannerStatus === 'success' ? lastScannedId : errorMessage.replace('ID ', '')}
                      </h3>
                      {scannerStatus === 'success' && (
                        <div className="bg-slate-50 px-6 py-3 rounded-2xl mb-10 border border-slate-100">
                          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Thời gian: {scannedList[0]?.time}</p>
                        </div>
                      )}
                      {scannerStatus === 'error' && (
                        <p className="text-slate-500 font-medium mb-10">{errorMessage}</p>
                      )}
                      <button
                        onClick={() => setScannerStatus('idle')}
                        className={`w-full py-5 rounded-2xl text-white font-black text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3
                          ${scannerStatus === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'}`}
                      >
                        TIẾP TỤC (ENTER)
                      </button>
                      <p className="mt-6 text-slate-400 text-xs font-bold uppercase tracking-widest">Nhấn Enter để đóng thông báo</p>
                    </div>
                  </div>
                )}

                {manualMode && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Keyboard className="h-5 w-5 text-amber-600" />
                      <h3 className="font-black text-amber-800">Chế độ nhập thủ công</h3>
                      <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold ml-auto">TEST</span>
                    </div>
                    <p className="text-xs text-amber-700/60 mb-4 font-black uppercase tracking-tighter">
                      Nhập mã học sinh và nhấn nút để điểm danh
                    </p>
                    <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
                      <div className="relative group">
                        <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-400 group-focus-within:text-amber-600 transition-colors" />
                        <input
                          ref={manualInputRef}
                          type="text"
                          value={manualId}
                          onChange={e => setManualId(e.target.value)}
                          placeholder="Mã học sinh (VD: HS...)"
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-amber-100 bg-white font-black text-lg text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50 transition-all shadow-inner"
                          disabled={scannerStatus === 'scanning'}
                          autoComplete="off"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!manualId.trim() || scannerStatus === 'scanning'}
                        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-lg hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-40 shadow-xl shadow-amber-200 flex items-center justify-center gap-3"
                      >
                        <CheckCircle className="h-6 w-6" />
                        Ghi nhận điểm danh
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              Lịch sử quét ({scannedList.length})
              {pendingIds.size > 0 && (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                  {pendingIds.size} đang lưu...
                </span>
              )}
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scannedList.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">Chưa có dữ liệu quét</p>
              ) : (
                scannedList.map((item: any, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800">
                        {item.name ? item.name : item.id}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {item.className && <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded mr-1">{item.className}</span>}
                        {item.time}
                      </p>
                    </div>
                    {item.status === 'pending' && (
                      <span className="flex items-center gap-1.5 text-blue-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                        Đang đồng bộ
                      </span>
                    )}
                    {item.status === 'OK' && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">✓ OK</span>
                    )}
                    {item.status === 'duplicate' && (
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">⚠️ Trùng</span>
                    )}
                    {item.status === 'error' && (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">⚠ Lỗi</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Guide Section - Moved here beneath history */}
          <div className="mt-6 bg-blue-50/50 rounded-2xl border border-blue-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                <Info className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Hướng dẫn nhanh cho Giáo viên</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-xs font-black shadow-sm border border-blue-100">1</div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Nhấn <b className="text-blue-700">CẤP QUYỀN TRUY CẬP CAMERA</b> nếu hệ thống yêu cầu.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-xs font-black shadow-sm border border-blue-100">2</div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Đưa <b className="text-blue-700">mã QR</b> của học sinh vào giữa khung hình để tự động điểm danh.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-xs font-black shadow-sm border border-blue-100">3</div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Nếu thẻ mờ hoặc quên thẻ, dùng tab <b className="text-amber-600">NHẬP THỦ CÔNG</b> bên trên.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'report' && (
        <AttendanceReport />
      )}
    </div>
  );
};


export default AttendanceScanner;
