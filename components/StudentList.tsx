import React, { useState, useEffect } from 'react';
import { api } from '../services/gasApi';
import { Student, StudentScores } from '../types';
import {
  Search, Plus, User, Calendar, MapPin,
  Edit, Trash2, X, Eye, Phone, MoreVertical,
  Filter, ChevronRight, ChevronLeft, QrCode
} from 'lucide-react';
import StudentProfile from './StudentProfile';
import { SCORE_TYPES } from '../constants';

interface StudentListProps {
  userRole: string;
  assignedClasses?: string;
}

const StudentList: React.FC<StudentListProps> = ({ userRole, assignedClasses = '' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [studentScores, setStudentScores] = useState<StudentScores | null>(null);
  const [loadingScores, setLoadingScores] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // QR Modal
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);

  // Filter Dropdown
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  // Helper: Map GAS array to Student Object
  const mapRowToStudent = (row: any[]): Student => ({
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
  });

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const rawData = await api.getAllStudentsWithPermission();
      const studentObjects = rawData.map(mapRowToStudent);
      setStudents(studentObjects);

      const uniqueClasses = Array.from(new Set(studentObjects.map(s => s.lop))).filter(Boolean).sort();
      setClasses(uniqueClasses);
    } catch (err) {
      console.error(err);
      alert('Lỗi tải danh sách học sinh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Close menu when clicking outside
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // --- CRUD HANDLERS ---

  const handleAddClick = () => {
    setCurrentStudent({
      tenThanh: '', hoDem: '', ten: '', lop: classes[0] || '',
      ngaySinh: '', ngayRuaToi: '', phuHuynh: '', giaoKhu: '', sdt: ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditClick = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentStudent({ ...student });
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = async (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa học sinh có ID: ${studentId}? Dữ liệu sẽ mất vĩnh viễn.`)) return;

    setLoading(true);
    try {
      const res = await api.deleteStudent(studentId);
      if (res.success) {
        alert('Đã xóa thành công');
        await fetchData();
      } else {
        alert('Lỗi: ' + res.message);
        setLoading(false);
      }
    } catch (error) {
      alert('Lỗi hệ thống');
      setLoading(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent.ten || !currentStudent.lop) {
      alert('Vui lòng nhập Tên và Lớp');
      return;
    }

    setSaving(true);
    try {
      if (currentStudent.id) {
        const res = await api.updateStudent(currentStudent.id, currentStudent);
        if (res.success) alert('Cập nhật thành công');
        else alert(res.message);
      } else {
        const res = await api.addStudent(currentStudent);
        if (res.success) alert('Thêm mới thành công');
        else alert(res.message);
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Lỗi hệ thống');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = async (student: Student) => {
    setCurrentStudent(student);
    setStudentScores(null);
    setIsDetailModalOpen(true);
    setLoadingScores(true);
    try {
      const scoresData = await api.getStudentScores(student.id);
      setStudentScores(scoresData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingScores(false);
    }
  };

  // --- QR HANDLER ---
  const handleQRClick = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setQrStudent(student);
    setIsQRModalOpen(true);
    setActiveMenuId(null);
  };

  // --- RENDER LOGIC ---

  const filteredStudents = students.filter(student => {
    // Normalize: strip "LỚP ", "KHỐI ", non-alphanumeric, and whitespace
    const normalize = (s: string) => (s || "").toString().trim().toUpperCase().replace(/^(LỚP|KHỐI)\s+/i, '').replace(/[^A-Z0-9]/g, '');

    // Check for high-level permissions first (case insensitive)
    const rawAssigned = (assignedClasses || "").toString().trim().toUpperCase();
    let hasPermission = false;

    if (userRole === 'ADMIN' || rawAssigned === 'ALL' || rawAssigned === 'ADMIN' || rawAssigned === 'TOTAL') {
      hasPermission = true;
    } else if (userRole === 'TEACHER') {
      // STRICT: If no assigned classes, show nothing to protect data
      if (!rawAssigned) {
        hasPermission = false;
      } else {
        const allowed = rawAssigned.split(',').map(normalize).filter(Boolean);
        const studentLop = normalize(student.lop);
        hasPermission = allowed.includes(studentLop);
      }
    } else {
      hasPermission = false;
    }

    if (!hasPermission) return false;

    const matchesClass = filterClass === 'ALL' || student.lop === filterClass;
    const fullName = `${student.tenThanh} ${student.hoDem} ${student.ten}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || student.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const currentData = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getInitials = (name?: string, ho?: string) => {
    return `${ho ? ho.charAt(0) : ''}${name ? name.charAt(0) : ''}`.toUpperCase();
  };

  const formatDate = (d?: string) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="font-medium">Đang tải danh sách học sinh...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section with Stats and Search */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Học sinh</h2>
            <p className="text-slate-500 font-medium">Tìm thấy {filteredStudents.length} học sinh trong danh sách</p>
            {userRole === 'TEACHER' && !assignedClasses && (
              <div className="mt-2 text-sm text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-200">
                ⚠️ Lỗi: Không nhận diện được phân lớp. Hãy báo Admin kiểm tra mục 'Quản lý User'.
              </div>
            )}
          </div>

          {userRole === 'ADMIN' && (
            <button
              onClick={handleAddClick}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              <Plus className="h-5 w-5" />
              <span>Thêm học sinh</span>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="relative flex-1 w-full md:max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc ID..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              {/* Horizontal Scroll for Class Filters on small/medium screens if needed, otherwise this is the dropdown base */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsClassDropdownOpen(!isClassDropdownOpen); }}
                  className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm min-w-[160px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-blue-500" />
                    <span>{filterClass === 'ALL' ? 'TẤT CẢ LỚP' : `LỚP ${filterClass}`}</span>
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

              <div className="hidden sm:flex items-center gap-4 text-slate-400 font-bold text-sm bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                <span>{filteredStudents.length} Học viên</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Grid of Student Cards */}
      {currentData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <User className="h-12 w-12 text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold text-lg">Không tìm thấy học sinh nào</p>
          <p className="text-slate-400 text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {currentData.map((student) => (
            <div
              key={student.id}
              onClick={() => handleViewDetail(student)}
              className="group relative bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-600/5 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
            >
              {/* Subtle gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:to-indigo-50/50 transition-all" />

              <div className="relative flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
                      {getInitials(student.ten, student.hoDem)}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-blue-600 mb-0.5">{student.id}</div>
                      <h3 className="font-extrabold text-slate-800 text-lg leading-tight line-clamp-1">
                        {student.tenThanh && <span className="text-blue-600 mr-1">{student.tenThanh}</span>}
                        {student.hoDem} {student.ten}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 mt-1 border border-blue-100">
                        Lớp {student.lop}
                      </span>
                    </div>
                  </div>

                  {/* Action Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === student.id ? null : student.id);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {activeMenuId === student.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-10 animate-in fade-in zoom-in-95 duration-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewDetail(student); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" /> Xem chi tiết
                        </button>
                        <button
                          onClick={(e) => handleQRClick(student, e)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <QrCode className="h-4 w-4 text-purple-500" /> Mã QR Hồ sơ
                        </button>
                        {userRole === 'ADMIN' && (
                          <>
                            <button
                              onClick={(e) => handleEditClick(student, e)}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              <Edit className="h-4 w-4 text-blue-500" /> Sửa thông tin
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              onClick={(e) => handleDeleteClick(student.id, e)}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" /> Xóa học sinh
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-auto pt-4 border-t border-slate-50">
                  {/* Parent Info from database */}
                  {student.phuHuynh && (
                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 mb-1 px-1">
                      <User className="h-3 w-3 text-slate-400" />
                      <span className="line-clamp-1">PH: {student.phuHuynh}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="p-1.5 bg-slate-50 rounded-lg"><MapPin className="h-3.5 w-3.5 text-slate-400" /></div>
                    <span>{student.giaoKhu || '---'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="p-1.5 bg-slate-50 rounded-lg"><Calendar className="h-3.5 w-3.5 text-slate-400" /></div>
                    <span>{formatDate(student.ngaySinh) || '---'}</span>
                  </div>
                  {student.sdt && (
                    <div className="flex items-center gap-3 text-sm font-bold text-blue-600">
                      <div className="p-1.5 bg-blue-50 rounded-lg"><Phone className="h-3.5 w-3.5 text-blue-400" /></div>
                      <span>{student.sdt}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-10 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 font-bold text-slate-600 transition-all text-sm"
          >
            <ChevronLeft className="h-4 w-4" /> <span>Trước</span>
          </button>

          <div className="text-sm font-extrabold text-slate-800">
            Trang <span className="text-blue-600">{currentPage}</span> / {totalPages}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 font-bold text-slate-600 transition-all text-sm"
          >
            <span>Tiếp</span> <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* === ADD / EDIT MODAL === */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
              <div>
                <h3 className="font-extrabold text-2xl text-slate-900">
                  {currentStudent.id ? 'Sửa thông tin' : 'Thêm học sinh mới'}
                </h3>
                {currentStudent.id && <p className="text-blue-600 font-bold text-sm">ID: {currentStudent.id}</p>}
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-white rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm transition-all border border-slate-100">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1">Tên thánh</label>
                  <input type="text" className="modern-input" value={currentStudent.tenThanh || ''} onChange={e => setCurrentStudent({ ...currentStudent, tenThanh: e.target.value })} placeholder="VD: Giuse" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1">Họ và đệm</label>
                  <input type="text" className="modern-input" value={currentStudent.hoDem || ''} onChange={e => setCurrentStudent({ ...currentStudent, hoDem: e.target.value })} placeholder="VD: Nguyễn Văn" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1">Tên <span className="text-red-500">*</span></label>
                  <input type="text" required className="modern-input" value={currentStudent.ten || ''} onChange={e => setCurrentStudent({ ...currentStudent, ten: e.target.value })} placeholder="VD: A" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1">Lớp <span className="text-red-500">*</span></label>
                  <select className="modern-input" required value={currentStudent.lop || ''} onChange={e => setCurrentStudent({ ...currentStudent, lop: e.target.value })}>
                    <option value="">Chọn lớp</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1">Ngày sinh</label>
                  <input type="date" className="modern-input" value={formatDateForInput(currentStudent.ngaySinh || '')} onChange={e => setCurrentStudent({ ...currentStudent, ngaySinh: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1 text-blue-600">Ngày rửa tội</label>
                  <input type="date" className="modern-input border-blue-100" value={formatDateForInput(currentStudent.ngayRuaToi || '')} onChange={e => setCurrentStudent({ ...currentStudent, ngayRuaToi: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1">Tên Phụ huynh</label>
                  <input type="text" className="modern-input" value={currentStudent.phuHuynh || ''} onChange={e => setCurrentStudent({ ...currentStudent, phuHuynh: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1">Giáo khu</label>
                  <input type="text" className="modern-input" value={currentStudent.giaoKhu || ''} onChange={e => setCurrentStudent({ ...currentStudent, giaoKhu: e.target.value })} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest ml-1">Số điện thoại liên hệ</label>
                  <input type="text" className="modern-input" value={currentStudent.sdt || ''} onChange={e => setCurrentStudent({ ...currentStudent, sdt: e.target.value })} placeholder="0xxx..." />
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-8 py-3.5 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all order-2 sm:order-1">Hủy</button>
                <button type="submit" disabled={saving} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 order-1 sm:order-2">
                  {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === DETAIL MODAL === */}
      {isDetailModalOpen && currentStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl border border-white/30">
                  {getInitials(currentStudent.ten, currentStudent.hoDem)}
                </div>
                <div>
                  <h3 className="font-extrabold text-2xl">{currentStudent.tenThanh} {currentStudent.hoDem} {currentStudent.ten}</h3>
                  <div className="flex items-center gap-2 opacity-80 font-bold text-sm">
                    <span>Mã HS: {currentStudent.id}</span>
                    <span className="w-1 h-1 rounded-full bg-white"></span>
                    <span>Lớp {currentStudent.lop}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-2xl transition-all border border-white/30">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Info */}
                <div className="lg:col-span-1 space-y-6">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-4">Thông tin cá nhân</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh</p>
                          <p className="font-bold text-slate-700">{formatDate(currentStudent.ngaySinh) || '---'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <User className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phụ huynh</p>
                          <div className="space-y-1 mt-1">
                            {currentStudent.phuHuynh
                              ? <p className="font-bold text-slate-700">{currentStudent.phuHuynh}</p>
                              : <p className="font-bold text-slate-700">---</p>
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-sm shadow-blue-600/5">
                        <Phone className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Số điện thoại</p>
                          <p className="font-extrabold text-blue-700">{currentStudent.sdt || '---'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <MapPin className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo khu</p>
                          <p className="font-bold text-slate-700">{currentStudent.giaoKhu || '---'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Grades */}
                <div className="lg:col-span-2">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-4">Kết quả học tập</h4>
                  {loadingScores ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <div className="w-8 h-8 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                        <div className="flex gap-4 min-w-max">
                          {SCORE_TYPES.map(type => {
                            const scoreValue = studentScores?.scores[type]?.score;
                            return (
                              <div key={type} className="bg-white p-4 w-32 rounded-[2rem] border border-slate-100 shadow-sm text-center relative overflow-hidden group">
                                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 relative z-10">{type}</div>
                                <div className="text-3xl font-black text-slate-800 relative z-10">
                                  {scoreValue ?? '--'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch gap-4">
                        <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Điểm Trung Bình</div>
                          <div className="text-5xl font-black tracking-tight">{studentScores?.average || '--'}</div>
                        </div>

                        <div className={`flex items-center justify-center px-10 py-6 rounded-[2rem] border-4 shadow-lg ${studentScores?.rank === 'Giỏi' ? 'bg-green-50 border-green-100 text-green-700' :
                          studentScores?.rank === 'Khá' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                            studentScores?.rank === 'Trung bình' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                              studentScores?.rank === 'Yếu' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-400'
                          }`}>
                          <div className="text-center">
                            <div className="text-[10px] font-extrabold uppercase tracking-widest mb-1 opacity-70">Xếp loại</div>
                            <div className="text-3xl font-black italic uppercase tracking-tighter">
                              {studentScores?.rank || '---'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex justify-end shrink-0">
              <button onClick={() => setIsDetailModalOpen(false)} className="px-10 py-3 bg-white border border-slate-200 text-slate-600 font-extrabold rounded-2xl hover:bg-slate-100 transition-all shadow-sm">ĐÓNG</button>
            </div>
          </div>
        </div>
      )}

      {/* === QR MODAL === */}
      {isQRModalOpen && qrStudent && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="relative animate-in fade-in zoom-in-95 duration-300">
            <StudentProfile
              studentId={qrStudent.id}
              simpleQrMode={true} // Only show QR in this modal
              studentData={{
                id: qrStudent.id,
                name: qrStudent.tenThanh ? `${qrStudent.tenThanh} ${qrStudent.hoDem} ${qrStudent.ten}` : `${qrStudent.hoDem} ${qrStudent.ten}`,
                class: qrStudent.lop,
                dob: formatDateForInput(qrStudent.ngaySinh)
              }}
              onClose={() => setIsQRModalOpen(false)}
            />
          </div>
        </div>
      )}

      <style>{`
        .modern-input {
            width: 100%; 
            padding: 0.875rem 1.25rem; 
            background-color: #f8fafc;
            border: 2px solid #f1f5f9; 
            border-radius: 1.25rem; 
            outline: none; 
            font-weight: 600;
            color: #1e293b;
            transition: all 0.2s;
        }
        .modern-input:focus { 
            background-color: white;
            border-color: #3b82f6; 
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); 
        }
        .modern-input::placeholder {
            color: #94a3b8;
            font-weight: 400;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default StudentList;
