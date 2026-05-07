import React, { useState, useEffect } from 'react';
import { api } from '../services/gasApi';
import { Database, Plus, Trash2, RefreshCw, Info, ExternalLink } from 'lucide-react';

interface AcademicYearManagerProps {
  userRole: string;
}

const AcademicYearManager: React.FC<AcademicYearManagerProps> = ({ userRole }) => {
  const [yearsMap, setYearsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState('');
  const [newId, setNewId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const data = await api.getAcademicYears();
      setYearsMap(data);
      // Sync local list for Layout dropdown
      localStorage.setItem('tntt_available_years', JSON.stringify(Object.keys(data)));
    } catch (error: any) {
      alert('Lỗi tải danh sách năm học: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetchYears();
    }
  }, [userRole]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear.match(/^\d{4}-\d{4}$/)) {
      alert('Vui lòng nhập đúng định dạng, VD: 2027-2028');
      return;
    }
    if (!newId || newId.length < 20) {
      alert('ID Google Sheet không hợp lệ.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addAcademicYear(newYear, newId);
      alert('Thêm năm học thành công!');
      setNewYear('');
      setNewId('');
      fetchYears();
    } catch (error: any) {
      alert('Lỗi thêm năm học: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (year: string) => {
    if (year === '2025-2026') {
      alert('Không thể xoá năm học mặc định!');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xoá năm học ${year}? Dữ liệu trên Google Drive vẫn an toàn, nhưng web sẽ không truy cập được nữa.`)) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteAcademicYear(year);
      fetchYears();
    } catch (error: any) {
      alert('Lỗi xoá năm học: ' + error.message);
      setLoading(false);
    }
  };

  if (userRole !== 'ADMIN') {
    return <div className="text-center p-8 text-red-500 font-bold">Từ chối truy cập. Chức năng chỉ dành cho Admin.</div>;
  }

  return (
    <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
        <div className="bg-blue-100 p-3 rounded-2xl">
          <Database className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Quản lý CSDL / Năm Học</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Kết nối giao diện với file Google Sheets của từng năm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Col: List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700">Các Database Đang Chạy</h3>
            <button onClick={fetchYears} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {Object.entries(yearsMap).sort().map(([year, id]) => (
              <div key={year} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 relative group">
                <div className="flex justify-between items-center">
                  <span className="font-black text-blue-700 text-lg">{year}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                      title="Mở file Google Sheet"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {year !== '2025-2026' && (
                      <button
                        onClick={() => handleDelete(year)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        title="Gỡ kết nối"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono bg-white p-2 border border-slate-200 rounded-lg overflow-x-auto whitespace-nowrap">
                  {id}
                </div>
              </div>
            ))}
            
            {Object.keys(yearsMap).length === 0 && !loading && (
              <div className="text-center p-4 text-slate-500">Chưa có dữ liệu.</div>
            )}
          </div>
        </div>

        {/* Right Col: Add New */}
        <div>
          <h3 className="font-bold text-slate-700 mb-4">Kết nối năm học mới</h3>
          <form onSubmit={handleAdd} className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wide block mb-1">Năm học</label>
              <input
                type="text"
                placeholder="VD: 2027-2028"
                value={newYear}
                onChange={e => setNewYear(e.target.value)}
                required
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wide block mb-1">Google Sheet ID</label>
              <input
                type="text"
                placeholder="1FmyVeIq-D6tlFBtEil_g..."
                value={newId}
                onChange={e => setNewId(e.target.value)}
                required
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 text-sm font-mono text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            
            <div className="bg-white/60 p-3 rounded-xl border border-blue-100 flex gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-[10px] sm:text-xs text-blue-900 leading-relaxed font-medium">
                <strong>Hướng dẫn:</strong><br/>
                1. Mở CSDL năm cũ, chọn <i>Tệp {'>'} Tạo bản sao</i>.<br/>
                2. Vào <i>Tiện ích {'>'} Apps Script</i> của file mới và xoá trắng code (để tránh rác).<br/>
                3. Copy đoạn ID loằng ngoằng trên thanh địa chỉ trình duyệt của file mới (nằm giữa <i>/d/</i> và <i>/edit</i>) dán vào ô trên.
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              Kết nối Database Mới
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AcademicYearManager;
