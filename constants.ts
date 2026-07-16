export const ROLES = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  GUEST: 'GUEST',
};

export const SCORE_TYPES = ['GK1', 'HK1', 'GK2', 'HK2'];

export const RANKING_COLORS: Record<string, string> = {
  'Xuất sắc': '#8B5CF6',    // Purple-500
  'Giỏi': '#10B981',      // Green-500
  'Khá': '#3B82F6',       // Blue-500
  'Trung bình': '#F59E0B', // Amber-500
  'Yếu': '#EF4444',       // Red-500
};

export const ITEMS_PER_PAGE_STUDENTS = 12;
export const ITEMS_PER_PAGE_SCORES = 20;

/**
 * Tính năm học hiện tại dựa trên thời gian thực.
 * Năm học bắt đầu từ tháng 7. 
 * VD: Tháng 7/2026 → "2026-2027", Tháng 3/2026 → "2025-2026"
 */
export function getDefaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

// TODO: Thay thế bằng Client ID thực tế của bạn từ Google Cloud Console
// Hướng dẫn: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
