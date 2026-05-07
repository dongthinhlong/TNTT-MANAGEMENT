export interface Student {
  id: string;
  tenThanh: string;
  hoDem: string;
  ten: string;
  lop: string;
  ngaySinh: string;
  ngayRuaToi: string;
  phuHuynh: string;
  giaoKhu: string;
  sdt: string;
}

export interface Grade {
  studentId: string;
  type: string; // GK1, HK1, GK2, HK2
  score: number;
  date: string;
}

export interface StudentScores {
  scores: { [key: string]: { score: number; date: string } }; // key is 'GK1', 'HK1', etc.
  average: string | number;
  rank: string;
  availableScoreTypes: number[];
}

export interface User {
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'GUEST';
  fullName: string;
  assignedClasses: string;
}

export interface ClassSummary {
  className: string;
  totalStudents: number;
  studentsWithScores: number;
  studentsWithAnyScore: number;
  averageScore: string;
  classRanking: string;
  rankings: {
    'Giỏi': number;
    'Khá': number;
    'Trung bình': number;
    'Yếu': number;
  };
}

export interface OverallStats {
  totalStudents: number;
  studentsWithScores: number;
  studentsWithAnyScore: number;
  rankings: { [key: string]: number };
  classRankings: { [key: string]: number };
  averageScore: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  // Specific fields based on original GAS return
  idsGenerated?: number;
  uniqueID?: string;
  downloadUrl?: string;
  fileName?: string;
  // For specialized returns
  summaries?: { [key: string]: ClassSummary };
  overallStats?: OverallStats;
}