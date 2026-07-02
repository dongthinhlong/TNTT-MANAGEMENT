import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowRight, Sparkles, GraduationCap, ScanLine, Keyboard } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface StudentSearchProps {
    isEmbedded?: boolean;
    onSearch?: (id: string) => void;
}

const StudentSearch: React.FC<StudentSearchProps> = ({ isEmbedded = false, onSearch }) => {
    const [searchId, setSearchId] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [mode, setMode] = useState<'manual' | 'qr'>('manual');
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    const triggerSearch = (id: string) => {
        if (onSearch) {
            onSearch(id.toUpperCase());
            return;
        }
        setIsAnimating(true);
        setTimeout(() => {
            window.location.href = `/?view=profile&id=${id.toUpperCase()}`;
        }, 800);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchId.trim()) return;
        triggerSearch(searchId.trim());
    };

    // QR Scanner lifecycle
    const startScanner = () => {
        if (scannerRef.current) return;
        setTimeout(() => {
            try {
                const el = document.getElementById('qr-scanner-search');
                if (!el) return;
                scannerRef.current = new Html5QrcodeScanner(
                    'qr-scanner-search',
                    { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
                    false
                );
                scannerRef.current.render(
                    (decodedText: string) => {
                        const id = decodedText.trim().replace(/.*[?&]id=/i, '').replace(/[^a-zA-Z0-9]/g, '');
                        if (id) triggerSearch(id);
                    },
                    () => {}
                );
                // Translate buttons to Vietnamese
                setTimeout(() => {
                    const container = document.getElementById('qr-scanner-search');
                    if (!container) return;
                    container.querySelectorAll('button').forEach(btn => {
                        if (btn.innerText.includes('Request Camera Permissions')) btn.innerText = 'CẤP QUYỀN TRUY CẬP CAMERA';
                        else if (btn.innerText.includes('Stop Scanning')) btn.innerText = 'DỪNG QUÉT';
                        else if (btn.innerText.includes('Start Scanning')) btn.innerText = 'BẮT ĐẦU QUÉT';
                    });
                    const span = container.querySelector('#qr-reader__dashboard_section_csr span');
                    if (span && span.innerHTML.includes('Scanning')) span.innerHTML = 'Đang trong chế độ quét...';
                }, 200);
            } catch (e) {
                console.error(e);
            }
        }, 100);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            try { scannerRef.current.clear(); } catch (e) { console.error(e); }
            scannerRef.current = null;
        }
    };

    useEffect(() => {
        if (mode === 'qr') startScanner();
        else stopScanner();
        return () => stopScanner();
    }, [mode]);

    useEffect(() => {
        return () => stopScanner();
    }, []);

    return (
        <>
        <style>{`
            #qr-scanner-search {
                border: none !important;
                background: #f8fafc;
                border-radius: 1rem;
                padding: 1rem 0;
            }
            #qr-scanner-search button {
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
            #qr-scanner-search button:hover {
                background-color: #1d4ed8 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px -2px rgba(37, 99, 235, 0.4) !important;
            }
            #qr-scanner-search select {
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
            }
            #qr-scanner-search a {
                color: #3b82f6 !important;
                font-weight: 700 !important;
                padding: 10px !important;
                display: inline-block !important;
            }
            #html5-qrcode-anchor-scan-type-change {
                display: none !important;
            }
            #qr-scanner-search__scan_region img {
                max-width: 60% !important;
                margin: 0 auto !important;
            }
            #qr-scanner-search__scan_region video {
                border-radius: 16px !important;
                overflow: hidden !important;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important;
            }
        `}</style>
        <div className={isEmbedded
            ? "flex items-center justify-center p-4 w-full h-full min-h-[60vh]"
            : "min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden"
        }>
            {/* Background Effects: Only show if NOT embedded */}
            {!isEmbedded && (
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[100px]" />
                </div>
            )}

            <div className={`
                relative z-10 w-full max-w-md bg-white rounded-[2.5rem]
                transition-all duration-700 transform
                ${isAnimating ? 'scale-90 opacity-0 translate-y-10' : 'animate-in fade-in slide-in-from-bottom-8'}
                ${isEmbedded ? 'shadow-xl border border-slate-100' : 'shadow-2xl'}
            `}>
                {/* Header */}
                <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden flex flex-col items-center justify-center text-center p-6">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-lg border border-white/20">
                            <GraduationCap className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            Tra Cứu Hồ Sơ
                        </h1>
                        <p className="text-blue-100 text-xs font-medium uppercase tracking-widest">
                            TNTT Kim Thanh
                        </p>
                    </div>
                </div>

                {/* Form Section */}
                <div className="p-8">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setMode('manual')}
                            className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Search className="h-4 w-4" /> Nhập mã
                        </button>
                        <button
                            onClick={() => setMode('qr')}
                            className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'qr' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ScanLine className="h-4 w-4" /> Quét QR
                        </button>
                    </div>

                    {mode === 'manual' ? (
                        <form onSubmit={handleSearch} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="studentId" className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-1">
                                    Mã Học Sinh
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        id="studentId"
                                        value={searchId}
                                        onChange={(e) => setSearchId(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 font-bold placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        placeholder="VD: HS001"
                                        autoComplete="off"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!searchId.trim()}
                                className={`
                                    w-full py-4 rounded-2xl font-bold text-lg text-white shadow-xl flex items-center justify-center gap-2
                                    transition-all duration-300 transform active:scale-95
                                    ${searchId.trim()
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-200 hover:-translate-y-1'
                                        : 'bg-slate-300 cursor-not-allowed'}
                                `}
                            >
                                <span>Tìm Kiếm</span>
                                {searchId.trim() && <ArrowRight className="h-5 w-5 animate-pulse" />}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div id="qr-scanner-search" className="rounded-2xl border-4 border-slate-100 shadow-inner bg-slate-50" />
                            <p className="text-center text-xs text-slate-400 font-medium">
                                <ScanLine className="h-3 w-3 inline mr-1" />
                                Đưa mã QR vào khung hình để tra cứu tự động
                            </p>
                        </div>
                    )}

                    {/* Hướng dẫn sử dụng */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Hướng dẫn sử dụng</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-xl">
                                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black">1</div>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Chọn chế độ tra cứu</p>
                                    <p className="text-[11px] text-slate-500">Dùng <b>Nhập mã</b> để gõ ID học sinh hoặc <b>Quét QR</b> để mở camera.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-xl">
                                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black">2</div>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Quét mã QR</p>
                                    <p className="text-[11px] text-slate-500">Nhấn <b>CẤP QUYỀN TRUY CẬP CAMERA</b>, sau đó đưa mã QR vào khung hình để tự động tra cứu.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-xl">
                                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black">3</div>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Nhập thủ công</p>
                                    <p className="text-[11px] text-slate-500">Nhập mã ID học sinh (VD: <b>HS001</b>) và nhấn <b>Tìm Kiếm</b> để xem thông tin.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
    );
};

export default StudentSearch;
