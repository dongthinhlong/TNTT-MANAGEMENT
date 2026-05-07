import { ApiResponse, ClassSummary, OverallStats } from '../types';

// IMPORTANT: Replace this with your deployed Google Apps Script Web App URL
// Deploy Instructions: Deploy as Web App -> Execute as Me -> Access: Anyone

// Link GAS Hoạt động (Mới nhất)
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzavkIpY6uDrjxeNYABGcZFekeWaTVwtMwVZu4naBi5v39JDiLyAuFIZ7nFCDLJrSDZ/exec';

// Link GAS Dự phòng (Các bản cũ)
// const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxvTZSC0GDrzH7u_S0TXfJ6c3SPpnx03sJC6oVz6j8eFgyj7CnthIxgrQPDq9B-BqZV/exec';
// const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyDbeOafRzySSFrBqYON2k19645aT6IeOZNgvL-16ZF27sX1uISLuZsJ647h6r2y89CIA/exec';
async function callGasApi<T>(functionName: string, ...args: any[]): Promise<T> {
  // Ensure URL is configured
  if (GAS_API_URL.includes('XXX')) {
    throw new Error("API URL is not configured. Please update services/gasApi.ts");
  }

  // Retrieve the logged-in email to emulate session for GAS "Execute as Me" deployments
  const userEmail = localStorage.getItem('tntt_user_email') || '';
  // MỚI: Lấy Năm Học hiện tại được chọn (mặc định là 2025-2026)
  const academicYear = localStorage.getItem('tntt_academic_year') || '2025-2026';

  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        functionName,
        args,
        userEmail,
        academicYear // Gửi năm học lên backend
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("Non-JSON API response:", text);
      // Trích xuất thông báo lỗi từ HTML nếu có
      if (text.includes('script.google.com/macros/s/')) {
        throw new Error("Lỗi phía Backend: Dịch vụ Google tạm thời bận hoặc hàm đã hết hạn (Quota).");
      }
      throw new Error("Phản hồi từ Server không hợp lệ (Không phải định dạng JSON). Đang trích xuất Excel...");
    }

    if (json && json.error) {
      throw new Error(`Máy chủ báo lỗi: ${json.error}`);
    }

    return json;

  } catch (error: any) {
    console.error(`API Error (${functionName}):`, error);
    throw error;
  }
}

export const api = {
  getRole: () => callGasApi<string>('getRole'),
  getCurrentUserEmail: () => callGasApi<string>('getCurrentUserEmail'),
  getAllStudentsWithPermission: () => callGasApi<any[]>('getAllStudentsWithPermission'),
  getAllClassesWithPermission: () => callGasApi<string[]>('getAllClassesWithPermission'),
  getAllClasses: () => callGasApi<string[]>('getAllClasses'),
  findStudentById: (id: string) => callGasApi<any[]>('findStudentById', id),
  getStudentScores: (id: string) => callGasApi<any>('getStudentScores', id),
  getMultipleStudentScores: (ids: string[]) => callGasApi<any>('getMultipleStudentScores', ids),
  recordScoresBatch: (scores: any[]) => callGasApi<ApiResponse<any>>('recordScoresBatch', scores),
  getClassSummariesFast: () => callGasApi<any>('getClassSummariesFast'),
  addStudent: (data: any) => callGasApi<ApiResponse<any>>('addStudent', data),
  updateStudent: (id: string, data: any) => callGasApi<ApiResponse<any>>('updateStudent', id, data),
  deleteStudent: (id: string) => callGasApi<ApiResponse<any>>('deleteStudent', id),
  generateMissingUniqueIDs: () => callGasApi<ApiResponse<any>>('generateMissingUniqueIDs'),
  getAllUsers: () => callGasApi<any[]>('getAllUsers'),
  findUserByEmail: (email: string) => callGasApi<any>('findUserByEmail', email),
  addUser: (user: any) => callGasApi<ApiResponse<any>>('addUser', user),
  updateUser: (email: string, user: any) => callGasApi<ApiResponse<any>>('updateUser', email, user),
  deleteUser: (email: string) => callGasApi<ApiResponse<any>>('deleteUser', email),

  // FIX: Map to getAllClasses to ensure compatibility if backend permission function is missing
  getExportableClasses: () => callGasApi<string[]>('getAllClasses'),

  exportStudentList: (type: string, className?: string) => callGasApi<ApiResponse<any>>('exportStudentList', type, className),
  exportGradesList: (type: string, className?: string) => callGasApi<ApiResponse<any>>('exportGradesList', type, className),
  getAttendanceReport: (startDate?: string, endDate?: string) => callGasApi<any[][]>('getAttendanceReport', startDate, endDate),
  getTodayScannedIds: () => callGasApi<string[]>('getTodayScannedIds'),
  recordAttendance: (studentId: string) => callGasApi<any>('recordAttendance', studentId),
  sendSupportTicket: (data: { subject: string, message: string }) => callGasApi<ApiResponse<any>>('sendSupportTicket', data),
  getNotifications: () => callGasApi<any[]>('getNotifications'),
  deleteNotification: (id: string) => callGasApi<ApiResponse<any>>('deleteNotification', id),

  // Academic Year Management
  getAcademicYears: () => callGasApi<Record<string, string>>('getAcademicYears'),
  addAcademicYear: (year: string, sheetId: string) => callGasApi<ApiResponse<any>>('addAcademicYear', year, sheetId),
  deleteAcademicYear: (year: string) => callGasApi<ApiResponse<any>>('deleteAcademicYear', year),
};