export const ROLES = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  GUEST: 'GUEST',
};

export const SCORE_TYPES = ['GK1', 'HK1', 'GK2', 'HK2'];

export const RANKING_COLORS: Record<string, string> = {
  'Giỏi': '#10B981',      // Green-500
  'Khá': '#3B82F6',       // Blue-500
  'Trung bình': '#F59E0B', // Amber-500
  'Yếu': '#EF4444',       // Red-500
};

export const ITEMS_PER_PAGE_STUDENTS = 12;
export const ITEMS_PER_PAGE_SCORES = 20;

// TODO: Thay thế bằng Client ID thực tế của bạn từ Google Cloud Console
// Hướng dẫn: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; 
