/**
 * =================================================================
 * TNTT MANAGEMENT - BACKEND (Google Apps Script)
 * Support: Multi-year database, role-based access
 * =================================================================
 */

// ================================================================
// 1. CONFIGURATION
// ================================================================

var DEFAULT_SHEET_ID = "YOUR_SPREADSHEET_ID_HERE";
var ADMIN_EMAIL = "YOUR_ADMIN_EMAIL_HERE";

const SHEET_STUDENTS = 'Students';
const SHEET_GRADES = 'Grades';
const SHEET_USERS = 'Users';
const SHEET_NOTIFICATIONS = 'Notifications';
const SHEET_ATTENDANCE = 'Attendance';

function computeDefaultYear() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  return (m >= 7) ? (y + "-" + (y + 1)) : ((y - 1) + "-" + y);
}

var DEFAULT_YEAR = computeDefaultYear();

// ================================================================
// 2. DATABASE MAP (PropertiesService)
// ================================================================

function getDatabaseMap() {
  var props = PropertiesService.getScriptProperties();
  var mapStr = props.getProperty('TNTT_DB_MAP');
  
  if (!mapStr) {
    var defaultMap = {};
    defaultMap[DEFAULT_YEAR] = DEFAULT_SHEET_ID;
    props.setProperty('TNTT_DB_MAP', JSON.stringify(defaultMap));
    return defaultMap;
  }
  
  var map = JSON.parse(mapStr);
  
  // Auto-add current year if missing
  if (!map[DEFAULT_YEAR]) {
    map[DEFAULT_YEAR] = DEFAULT_SHEET_ID;
    props.setProperty('TNTT_DB_MAP', JSON.stringify(map));
  }
  
  return map;
}

// ================================================================
// 3. GLOBAL STATE (per-request)
// ================================================================

var _CURRENT_ACADEMIC_YEAR = DEFAULT_YEAR;
var _SS_INSTANCE = null;
var _SHEET_VALS_CACHE = {};
var _CURRENT_USER_EMAIL = "";
var _USER_ROLE_CACHE = null;
var _SHEET_OBJ_CACHE = {};

// ================================================================
// 4. API GATEWAY (doPost)
// ================================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const functionName = data.functionName;
    const args = data.args || [];

    if (data.userEmail) _CURRENT_USER_EMAIL = data.userEmail;
    if (data.academicYear) _CURRENT_ACADEMIC_YEAR = data.academicYear;

    const whitelist = [
      'getRole', 'getCurrentUserEmail', 'getInitialAppData',
      'getAllStudentsWithPermission', 'getAllClassesWithPermission', 'getAllClasses',
      'findStudentById', 'getStudentScores', 'getMultipleStudentScores',
      'recordScoresBatch', 'getClassSummariesFast',
      'addStudent', 'updateStudent', 'deleteStudent',
      'getAllUsers', 'findUserByEmail', 'addUser', 'updateUser', 'deleteUser',
      'exportStudentList', 'exportGradesList',
      'sendSupportTicket', 'getNotifications', 'deleteNotification',
      'getAttendanceReport', 'recordAttendance', 'getTodayScannedIds',
      'exportAttendanceReport',
      'getAcademicYears', 'addAcademicYear', 'deleteAcademicYear',
      'getStudentPublicProfile', 'getStudentAttendanceSummary',
      'testDbConnection'
    ];

    if (whitelist.includes(functionName) && typeof this[functionName] === 'function') {
      const result = this[functionName].apply(this, args);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    throw new Error('Hàm không tồn tại hoặc bị từ chối: ' + functionName);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ================================================================
// 5. CORE HELPERS
// ================================================================

function getSS() {
  if (!_SS_INSTANCE) {
    var dbMap = getDatabaseMap();
    var targetId = dbMap[_CURRENT_ACADEMIC_YEAR];
    if (!targetId) {
      throw new Error("Chưa cấu hình CSDL cho năm học " + _CURRENT_ACADEMIC_YEAR);
    }
    _SS_INSTANCE = SpreadsheetApp.openById(targetId);
  }
  return _SS_INSTANCE;
}

function getValues(sheetName) {
  if (_SHEET_VALS_CACHE[sheetName]) return _SHEET_VALS_CACHE[sheetName];
  var sheet = getSS().getSheetByName(sheetName);
  if (!sheet) return [];
  var vals = sheet.getDataRange().getValues();
  _SHEET_VALS_CACHE[sheetName] = vals;
  return vals;
}

function getValuesTail(sheetName, count) {
  var sheet = getSS().getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var numRows = Math.min(count, lastRow - 1);
  var startRow = lastRow - numRows + 1;
  return sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();
}

function safeSheet(name) {
  if (_SHEET_OBJ_CACHE[name]) return _SHEET_OBJ_CACHE[name];
  var sheet = getSS().getSheetByName(name);
  if (!sheet) {
    sheet = getSS().insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    if (name === SHEET_NOTIFICATIONS) sheet.appendRow(['ID', 'Email', 'Subject', 'Message', 'Date']);
    if (name === SHEET_USERS) sheet.appendRow(['Email', 'Role', 'FullName', 'AssignedClasses']);
    if (name === SHEET_STUDENTS) sheet.appendRow(['ID', 'TenThanh', 'HoDem', 'Ten', 'Lop', 'NgaySinh', 'NgayRuaToi', 'PhuHuynh', 'GiaoKhu', 'SDT']);
    if (name === SHEET_GRADES) sheet.appendRow(['StudentID', 'Type', 'Score', 'Timestamp', 'Teacher']);
    if (name === SHEET_ATTENDANCE) sheet.appendRow(['Timestamp', 'StudentID', 'FullName', 'Class', 'Teacher']);
  }
  _SHEET_OBJ_CACHE[name] = sheet;
  return sheet;
}

function getCurrentUserEmail() { return _CURRENT_USER_EMAIL || "anonymous@gmail.com"; }

function nowVN() {
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

function formatDateVN(val) {
  if (!val || val === '') return '';
  try {
    var d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  } catch (e) {
    return String(val);
  }
}

// ================================================================
// 6. AUTH & ROLE
// ================================================================

function getRole() {
  if (_USER_ROLE_CACHE) return _USER_ROLE_CACHE;
  try {
    var email = getCurrentUserEmail().toLowerCase();
    
    // Hardcoded admin bypass
    if (ADMIN_EMAIL && email === ADMIN_EMAIL.toLowerCase()) {
      _USER_ROLE_CACHE = 'ADMIN';
      return _USER_ROLE_CACHE;
    }

    // Lookup in Users sheet
    try {
      var rows = getValues(SHEET_USERS);
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && String(rows[i][0]).toLowerCase() === email) {
          _USER_ROLE_CACHE = rows[i][1] || 'GUEST';
          return _USER_ROLE_CACHE;
        }
      }
    } catch (sheetErr) {
      // Users sheet may not exist yet - that's OK
    }
    
    return 'GUEST';
  } catch (e) { return 'GUEST'; }
}

function requireRole() {
  var allowedRoles = Array.prototype.slice.call(arguments);
  var role = getRole();
  if (role === 'ADMIN') return;
  if (!allowedRoles.includes(role)) {
    throw new Error('Từ chối truy cập: Quyền ' + role + ' không được phép.');
  }
}

// ================================================================
// 7. STUDENTS
// ================================================================

function getAllStudents() {
  var CACHE_KEY = "STUDENTS_LIST_CACHE_V2_" + _CURRENT_ACADEMIC_YEAR;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  var values = getValues(SHEET_STUDENTS)
    .slice(1)
    .filter(function (r) { return r[0]; })
    .map(function (r) { return r.map(function (v) { return String(v || ''); }); });

  try { cache.put(CACHE_KEY, JSON.stringify(values), 300); } catch (e) { }
  return values;
}

function getAllClasses() {
  var classes = getAllStudents().map(function (s) { return s[4]; });
  return [...new Set(classes)].filter(function (c) { return c; }).sort();
}

function getAllStudentsWithPermission() {
  requireRole('ADMIN', 'TEACHER');
  return getAllStudents();
}

function getAllClassesWithPermission() {
  requireRole('ADMIN', 'TEACHER');
  return getAllClasses();
}

function findStudentById(id) {
  requireRole('ADMIN', 'TEACHER');
  return getAllStudents().find(function (s) { return s[0] === String(id); }) || null;
}

function addStudent(o) {
  requireRole('ADMIN');
  var id = "HS" + Date.now();
  safeSheet(SHEET_STUDENTS).appendRow([
    id, o.tenThanh || '', o.hoDem || '', o.ten || '', o.lop || '',
    o.ngaySinh || '', o.ngayRuaToi || '', o.phuHuynh || '', o.giaoKhu || '', o.sdt || ''
  ]);
  
  try {
    var notiSheet = safeSheet(SHEET_NOTIFICATIONS);
    var teacherEmail = getCurrentUserEmail();
    var notiId = "NT" + Date.now();
    var subject = "Thêm học sinh mới - " + (o.hoDem + " " + o.ten);
    var message = "Tài khoản " + teacherEmail + " đã thêm học sinh " + (o.tenThanh + " " + o.hoDem + " " + o.ten).trim() + " vào lớp " + (o.lop || "??");
    notiSheet.appendRow([notiId, teacherEmail, subject, message, nowVN()]);
  } catch (e) {}

  clearDashboardCache();
  return { success: true, uniqueID: id };
}

function updateStudent(id, o) {
  requireRole('ADMIN');
  var sheet = safeSheet(SHEET_STUDENTS);
  var data = getValues(SHEET_STUDENTS);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 2, 1, 9).setValues([[
        o.tenThanh || '', o.hoDem || '', o.ten || '', o.lop || '',
        o.ngaySinh || '', o.ngayRuaToi || '', o.phuHuynh || '', o.giaoKhu || '', o.sdt || ''
      ]]);

      try {
        var notiSheet = safeSheet(SHEET_NOTIFICATIONS);
        var teacherEmail = getCurrentUserEmail();
        var notiId = "NT" + Date.now();
        var subject = "Cập nhật hồ sơ - " + (o.hoDem + " " + o.ten);
        var message = "Tài khoản " + teacherEmail + " đã chỉnh sửa thông tin học sinh " + (o.tenThanh + " " + o.hoDem + " " + o.ten).trim();
        notiSheet.appendRow([notiId, teacherEmail, subject, message, nowVN()]);
      } catch (e) {}

      clearDashboardCache();
      return { success: true };
    }
  }
  return { success: false, message: "Không tìm thấy học sinh ID: " + id };
}

function deleteStudent(id) {
  requireRole('ADMIN');
  var sheet = safeSheet(SHEET_STUDENTS);
  var data = getValues(SHEET_STUDENTS);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      clearDashboardCache();
      return { success: true };
    }
  }
  return { success: false, message: "Không tìm thấy học sinh ID: " + id };
}

// ================================================================
// 8. GRADES
// ================================================================

function calculateRank(avg) {
  if (avg === 'N/A' || avg === '') return '---';
  var a = Math.round(parseFloat(avg) * 10) / 10;
  if (a >= 9.0) return 'Xuất sắc';
  if (a >= 8.0) return 'Giỏi';
  if (a >= 6.5) return 'Khá';
  if (a >= 5.0) return 'Trung bình';
  return 'Yếu';
}

function getGradesMap() {
  var CACHE_KEY = "GRADES_MAP_CACHE_V2_" + _CURRENT_ACADEMIC_YEAR;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  var grades = getValues(SHEET_GRADES).slice(1);
  var map = {};

  grades.forEach(function (r) {
    var studentId = String(r[0]);
    if (!studentId) return;
    var type = String(r[1]);
    var score = parseFloat(r[2]);
    var dateVal = r[3] instanceof Date ? r[3].getTime() : new Date(r[3]).getTime();

    if (isNaN(score) || !type) return;

    if (!map[studentId]) {
      map[studentId] = { latestScores: {} };
    }
    var student = map[studentId];
    if (!student.latestScores[type] || dateVal > student.latestScores[type].time) {
      student.latestScores[type] = { score: score, time: dateVal, date: r[3] };
    }
  });

  var finalMap = {};
  Object.keys(map).forEach(function (id) {
    var student = map[id];
    var scores = student.latestScores;
    var vals = Object.values(scores).map(function (s) { return s.score; });
    var avg = vals.length ? (vals.reduce(function (a, b) { return a + b; }, 0) / vals.length).toFixed(1) : 'N/A';
    
    finalMap[id] = {
      scores: scores,
      average: avg,
      rank: calculateRank(avg)
    };
  });

  try { cache.put(CACHE_KEY, JSON.stringify(finalMap), 300); } catch (e) { }
  return finalMap;
}

function getStudentScores(studentId) {
  requireRole('ADMIN', 'TEACHER');
  var map = getGradesMap();
  return map[studentId] || { scores: {}, average: 'N/A', rank: '---' };
}

function getMultipleStudentScores(ids) {
  requireRole('ADMIN', 'TEACHER');
  var map = getGradesMap();
  var res = {};
  ids.forEach(function (id) {
    res[id] = map[id] || { scores: {}, average: 'N/A', rank: '---' };
  });
  return res;
}

function recordScoresBatch(dataList) {
  requireRole('ADMIN', 'TEACHER');
  var sheet = safeSheet(SHEET_GRADES);
  var timestamp = nowVN();
  var teacherEmail = getCurrentUserEmail();
  
  var rows = dataList
    .filter(function (d) { return d.id && d.score !== null && d.score !== ''; })
    .map(function (d) { return [String(d.id), d.type, parseFloat(d.score), timestamp, teacherEmail]; });
  
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
    
    try {
      var notiSheet = safeSheet(SHEET_NOTIFICATIONS);
      var notiId = "NT" + Date.now();
      var firstItem = dataList[0];
      var studentInfo = findStudentById(firstItem.id);
      var studentName = studentInfo ? (studentInfo[1] + " " + studentInfo[3]).trim() : firstItem.id;
      
      var subject = "Cập nhật điểm số - " + teacherEmail;
      var message = "Giáo viên " + teacherEmail + " đã cập nhật điểm cho " + rows.length + " mục. " +
                    "Học sinh điển hình: " + studentName + " (Lớp " + (studentInfo ? studentInfo[4] : "??") + ")";
      
      notiSheet.appendRow([notiId, teacherEmail, subject, message, timestamp]);
    } catch (e) {}
    
    clearDashboardCache();
  }
  return { success: true };
}

// ================================================================
// 9. DASHBOARD
// ================================================================

function getClassSummariesFast() {
  try {
    requireRole('ADMIN', 'TEACHER');
    var DASH_CACHE_KEY = "TNTT_DASHBOARD_V6_" + _CURRENT_ACADEMIC_YEAR;
    var cache = CacheService.getScriptCache();
    var cached = cache.get(DASH_CACHE_KEY);
    if (cached) return JSON.parse(cached);

    var students = getAllStudents();
    var grades = getValues(SHEET_GRADES).slice(1);

    var scoresMap = {};
    grades.forEach(function (r) {
      var id = String(r[0]);
      var type = String(r[1]);
      var score = parseFloat(r[2]);
      var dateVal = r[3] instanceof Date ? r[3].getTime() : new Date(r[3]).getTime();
      if (!id || isNaN(score) || !type) return;
      if (!scoresMap[id]) scoresMap[id] = {};
      if (!scoresMap[id][type] || dateVal > scoresMap[id][type].time) {
        scoresMap[id][type] = { score: score, time: dateVal };
      }
    });

    var summaries = {};
    var overall = {
      totalStudents: students.length, studentsWithScores: 0,
      rankings: { 'Xuất sắc': 0, 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0 },
      averageScore: '0.0'
    };
    var totalSum = 0;

    students.forEach(function (s) {
      var sId = String(s[0]);
      var sLop = s[4] || 'N/A';
      if (!summaries[sLop]) {
        summaries[sLop] = {
          className: sLop, totalStudents: 0, studentsWithScores: 0,
          averageScore: '0.0', rankings: { 'Xuất sắc': 0, 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0 }, _scores: []
        };
      }
      summaries[sLop].totalStudents++;
      var sGrades = scoresMap[sId];
      if (sGrades) {
        var vals = Object.values(sGrades).map(function (v) { return v.score; });
        if (vals.length > 0) {
          var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
          var rank = calculateRank(avg);
          summaries[sLop].studentsWithScores++;
          summaries[sLop].rankings[rank]++;
          summaries[sLop]._scores.push(avg);
          overall.studentsWithScores++;
          overall.rankings[rank]++;
          totalSum += avg;
        }
      }
    });

    Object.keys(summaries).forEach(function (k) {
      var s = summaries[k];
      s.averageScore = s._scores.length ? (s._scores.reduce(function (a, b) { return a + b; }, 0) / s._scores.length).toFixed(1) : 'N/A';
      delete s._scores;
    });

    overall.averageScore = overall.studentsWithScores ? (totalSum / overall.studentsWithScores).toFixed(1) : 'N/A';
    var result = { summaries: summaries, overallStats: overall };
    cache.put(DASH_CACHE_KEY, JSON.stringify(result), 300);
    return result;
  } catch (e) { return { error: e.message }; }
}

function clearDashboardCache() {
  var suffix = _CURRENT_ACADEMIC_YEAR;
  var cache = CacheService.getScriptCache();
  cache.remove("TNTT_DASHBOARD_V6_" + suffix);
  cache.remove("STUDENTS_LIST_CACHE_V2_" + suffix);
  cache.remove("GRADES_MAP_CACHE_V2_" + suffix);
  cache.remove("TODAY_SCANNED_" + suffix);
  _SHEET_VALS_CACHE = {};
}

// ================================================================
// 10. INITIAL APP DATA (login endpoint)
// ================================================================

function getInitialAppData() {
  var role = getRole();
  var email = getCurrentUserEmail().toLowerCase();
  
  var assignedClasses = "";
  if (role === 'ADMIN') {
    assignedClasses = "ALL";
  } else {
    try {
      var users = getValues(SHEET_USERS);
      for (var i = 1; i < users.length; i++) {
        if (users[i][0] && String(users[i][0]).toLowerCase() === email) {
          assignedClasses = users[i][3] || "";
          break;
        }
      }
    } catch (e) {}
  }

  var students = (role === 'ADMIN' || role === 'TEACHER') ? getAllStudents() : [];
  var classes = (role === 'ADMIN' || role === 'TEACHER') ? getAllClasses() : [];
  var dashboard = (role === 'ADMIN' || role === 'TEACHER') ? getClassSummariesFast() : null;
  
  return {
    role: role,
    email: email,
    assignedClasses: assignedClasses,
    students: students,
    classes: classes,
    dashboard: dashboard,
    academicYear: _CURRENT_ACADEMIC_YEAR
  };
}

// ================================================================
// 11. USER MANAGEMENT
// ================================================================

function getAllUsers() {
  requireRole('ADMIN');
  var rows = getValues(SHEET_USERS).slice(1);
  var uniqueUsers = {};
  
  rows.forEach(function (r) {
    if (!r[0]) return;
    var email = String(r[0]).toLowerCase().trim();
    if (!uniqueUsers[email]) {
      uniqueUsers[email] = { 
        email: String(r[0]), 
        role: String(r[1]), 
        fullName: String(r[2] || ''), 
        assignedClasses: String(r[3] || '') 
      };
    }
  });
  
  return Object.values(uniqueUsers);
}

function findUserByEmail(email) {
  if (!email) return null;
  var role = getRole();
  var currentUserEmail = getCurrentUserEmail().toLowerCase();
  var targetEmail = String(email).toLowerCase().trim();

  if (role !== 'ADMIN' && currentUserEmail !== targetEmail) {
    throw new Error('Từ chối truy cập: Bạn chỉ có thể tra cứu thông tin của chính mình.');
  }

  var rows = getValues(SHEET_USERS);
  for (var i = 1; i < rows.length; i++) {
    var checkEmail = String(rows[i][0]).toLowerCase().trim();
    if (checkEmail === targetEmail) {
      return { email: String(rows[i][0]), role: String(rows[i][1]), fullName: String(rows[i][2] || ''), assignedClasses: String(rows[i][3] || '') };
    }
  }
  return null;
}

function addUser(u) {
  requireRole('ADMIN');
  var email = String(u.email).toLowerCase().trim();
  
  var existing = findUserByEmail(email);
  if (existing) {
    return updateUser(email, u);
  }
  
  safeSheet(SHEET_USERS).appendRow([u.email, u.role, u.fullName || '', u.assignedClasses || '']);
  return { success: true };
}

function updateUser(email, u) {
  requireRole('ADMIN');
  var sheet = safeSheet(SHEET_USERS);
  var data = getValues(SHEET_USERS);
  var targetEmail = String(email).toLowerCase().trim();
  var firstFoundIndex = -1;
  var rowsToDelete = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && String(data[i][0]).toLowerCase().trim() === targetEmail) {
      if (firstFoundIndex === -1) {
        firstFoundIndex = i;
      } else {
        rowsToDelete.push(i + 1);
      }
    }
  }

  if (firstFoundIndex !== -1) {
    sheet.getRange(firstFoundIndex + 1, 1, 1, 4).setValues([[email, u.role, u.fullName || '', u.assignedClasses || '']]);
    
    if (rowsToDelete.length > 0) {
      for (var j = rowsToDelete.length - 1; j >= 0; j--) {
        sheet.deleteRow(rowsToDelete[j]);
      }
    }
    
    clearDashboardCache();
    return { success: true };
  }
  return { success: false, message: "Không tìm thấy tài khoản: " + email };
}

function deleteUser(email) {
  requireRole('ADMIN');
  var sheet = safeSheet(SHEET_USERS);
  var data = getValues(SHEET_USERS);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === email.toLowerCase()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "Không tìm thấy tài khoản: " + email };
}

// ================================================================
// 12. NOTIFICATIONS
// ================================================================

function sendSupportTicket(d) {
  var sheet = safeSheet(SHEET_NOTIFICATIONS);
  var id = "NT" + Date.now();
  var email = getCurrentUserEmail();
  sheet.appendRow([id, email, d.subject, d.message, nowVN()]);
  return { success: true };
}

function getNotifications() {
  requireRole('ADMIN');
  return getValues(SHEET_NOTIFICATIONS).slice(1)
    .filter(function (r) { return r[0]; })
    .map(function (r) { return { id: String(r[0]), email: String(r[1]), subject: String(r[2]), message: String(r[3]), date: String(r[4]) }; }).reverse();
}

function deleteNotification(id) {
  requireRole('ADMIN');
  var sheet = safeSheet(SHEET_NOTIFICATIONS);
  var data = getValues(SHEET_NOTIFICATIONS);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "Không tìm thấy thông báo" };
}

// ================================================================
// 13. ATTENDANCE
// ================================================================

function recordAttendance(studentId) {
  requireRole('ADMIN', 'TEACHER');
  if (!studentId) return { success: false, message: 'Thiếu mã học sinh' };

  var studentIdStr = String(studentId).trim();
  var timestamp = nowVN();
  var teacherEmail = getCurrentUserEmail();

  var allStudents = getAllStudents();
  var student = allStudents.find(function (s) { return s[0] === studentIdStr; });

  if (!student) {
    return { success: false, message: "Mã học sinh không tồn tại trong hệ thống" };
  }

  var studentName = (student[1] + ' ' + student[2] + ' ' + student[3]).trim();
  var studentClass = student[4] || '---';

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var todayIds = getTodayScannedIds();
    if (todayIds.indexOf(studentIdStr) !== -1) {
      lock.releaseLock();
      return { 
        success: false, 
        message: "Học sinh " + studentName + " đã điểm danh hôm nay rồi!", 
        isDuplicate: true, 
        studentName: studentName, 
        studentClass: studentClass 
      };
    }

    var logSheet = safeSheet(SHEET_ATTENDANCE);
    logSheet.appendRow([timestamp, studentIdStr, studentName, studentClass, teacherEmail]);
    
    updateTodayScannedCache(studentIdStr);

    lock.releaseLock();
    return { success: true, timestamp: timestamp, studentName: studentName, studentClass: studentClass };
  } catch (e) {
    if (lock.hasLock()) lock.releaseLock();
    return { success: false, message: "Hệ thống bận hoặc lỗi: " + e.message };
  }
}

function updateTodayScannedCache(newId) {
  var cache = CacheService.getScriptCache();
  var CACHE_KEY = "TODAY_SCANNED_" + _CURRENT_ACADEMIC_YEAR;
  var cached = cache.get(CACHE_KEY);
  var ids = cached ? JSON.parse(cached) : null;
  
  if (ids) {
    ids.push(newId);
    cache.put(CACHE_KEY, JSON.stringify(ids), 21600);
  }
}

function getTodayScannedIds() {
  var CACHE_KEY = "TODAY_SCANNED_" + _CURRENT_ACADEMIC_YEAR;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  var data = getValuesTail(SHEET_ATTENDANCE, 1000);
  if (data.length === 0) return [];

  var now = new Date();
  var todayStr = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var ids = [];

  for (var i = data.length - 1; i >= 0; i--) {
    if (!data[i][0]) continue;
    var rowDateStr = "";
    try {
      if (data[i][0] instanceof Date) {
        rowDateStr = Utilities.formatDate(data[i][0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      } else {
        var rawStr = String(data[i][0]);
        if (rawStr.indexOf('-') !== -1) rowDateStr = rawStr.split(' ')[0];
        else if (rawStr.indexOf('/') !== -1) {
          var parts = rawStr.split(' ')[0].split('/');
          if (parts.length === 3) rowDateStr = parts[2] + '-' + parts[1] + '-' + parts[0];
        }
      }
    } catch (e) { continue; }

    if (rowDateStr === todayStr) ids.push(String(data[i][1]).trim());
    else break;
  }
  
  cache.put(CACHE_KEY, JSON.stringify(ids), 600); 
  return ids;
}

function getAttendanceReport(startDateStr, endDateStr, limit) {
  requireRole('ADMIN', 'TEACHER');
  
  var header = ['Timestamp', 'StudentID', 'FullName', 'Class', 'Teacher'];
  var fetchLimit = limit || 5000;
  
  if (!startDateStr && !endDateStr) {
    var tailRows = getValuesTail(SHEET_ATTENDANCE, 500);
    return [header].concat(tailRows);
  }

  var dataRows = getValuesTail(SHEET_ATTENDANCE, fetchLimit); 
  if (dataRows.length === 0) return [header];

  var filtered = dataRows.filter(function (row) {
    if (!row[0]) return false;
    var rowDateStr = "";
    try {
      if (row[0] instanceof Date) {
        rowDateStr = Utilities.formatDate(row[0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      } else {
        var rawStr = String(row[0]);
        var vnMatch = rawStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (vnMatch) rowDateStr = vnMatch[3] + "-" + vnMatch[2] + "-" + vnMatch[1];
        else rowDateStr = rawStr.split(' ')[0];
      }
    } catch (e) { return false; }

    if (startDateStr && rowDateStr < startDateStr) return false;
    if (endDateStr && rowDateStr > endDateStr) return false;
    return true;
  });

  return [header].concat(filtered);
}

// ================================================================
// 14. EXPORT
// ================================================================

function getExportFolder() {
  var folderName = "TNTT_EXPORTS_" + _CURRENT_ACADEMIC_YEAR;
  var it = DriveApp.getFoldersByName(folderName);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

function exportStudentList(scope, className) {
  try {
    requireRole('ADMIN', 'TEACHER');
    var students = getAllStudents();
    var target = (scope === 'CLASS' && className) ? students.filter(function (s) { return s[4] === className; }) : students;
    if (target.length === 0) return { success: false, message: "Không có học sinh nào để xuất." };

    var header = ["Mã HS", "Tên Thánh", "Họ Đệm", "Tên", "Lớp", "Ngày Sinh", "Ngày Rửa Tội", "Phụ Huynh", "Giáo Khu", "SĐT"];
    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy_HHmm");
    var fileName = "DS_HocSinh_" + (className || "ToanTruong") + "_" + timestamp;

    var newFile = SpreadsheetApp.create(fileName);
    var fileId = newFile.getId();
    var ws = newFile.getSheets()[0];
    ws.setName("Danh Sách Học Sinh");

    ws.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold").setBackground("#1a73e8").setFontColor("#ffffff");
    var rows = target.map(function (s) { return [s[0], s[1], s[2], s[3], s[4], formatDateVN(s[5]), formatDateVN(s[6]), s[7], s[8], s[9]]; });
    if (rows.length > 0) ws.getRange(2, 1, rows.length, header.length).setValues(rows);
    ws.setFrozenRows(1);
    ws.autoResizeColumns(1, header.length);

    var fileDrive = DriveApp.getFileById(fileId);
    fileDrive.moveTo(getExportFolder());
    fileDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return { success: true, downloadUrl: "https://docs.google.com/spreadsheets/d/" + fileId + "/export?format=xlsx" };
  } catch (e) { return { success: false, message: "Lỗi xuất danh sách: " + e.toString() }; }
}

function exportGradesList(scope, className) {
  try {
    requireRole('ADMIN', 'TEACHER');
    var students = getAllStudents();
    var target = (scope === 'CLASS' && className) ? students.filter(function (s) { return s[4] === className; }) : students;
    if (target.length === 0) return { success: false, message: "Không có học sinh nào để xuất." };

    var header = ["Mã HS", "Tên Thánh", "Họ Đệm", "Tên", "Lớp", "GK1", "HK1", "GK2", "HK2", "Điểm TB", "Xếp Loại"];
    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy_HHmm");
    var fileName = "BangDiem_" + (className || "ToanTruong") + "_" + timestamp;

    var exportData = target.map(function (s) {
      var scoreData = getStudentScores(s[0]);
      var sc = scoreData.scores || {};
      return [
        s[0], s[1], s[2], s[3], s[4],
        sc["GK1"] ? sc["GK1"].score : "", sc["HK1"] ? sc["HK1"].score : "",
        sc["GK2"] ? sc["GK2"].score : "", sc["HK2"] ? sc["HK2"].score : "",
        scoreData.average !== 'N/A' ? scoreData.average : "",
        scoreData.rank !== '---' ? scoreData.rank : ""
      ];
    });

    var newFile = SpreadsheetApp.create(fileName);
    var fileId = newFile.getId();
    var ws = newFile.getSheets()[0];
    ws.setName("Bảng Điểm");

    ws.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold").setBackground("#0f9d58").setFontColor("#ffffff");
    if (exportData.length > 0) ws.getRange(2, 1, exportData.length, header.length).setValues(exportData);
    ws.setFrozenRows(1);
    ws.autoResizeColumns(1, header.length);

    var fileDrive = DriveApp.getFileById(fileId);
    fileDrive.moveTo(getExportFolder());
    fileDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return { success: true, downloadUrl: "https://docs.google.com/spreadsheets/d/" + fileId + "/export?format=xlsx" };
  } catch (e) { return { success: false, message: "Lỗi xuất bảng điểm: " + e.toString() }; }
}

function exportAttendanceReport(startDateStr, endDateStr) {
  try {
    requireRole('ADMIN', 'TEACHER');
    var attendanceData = getAttendanceReport(startDateStr, endDateStr, 20000);
    if (attendanceData.length <= 1) return { success: false, message: "Không có dữ liệu điểm danh trong khoảng thời gian này." };

    var countMap = {};
    for (var i = 1; i < attendanceData.length; i++) {
      var row = attendanceData[i];
      var sid = String(row[1]).trim();
      if (!sid) continue;
      countMap[sid] = (countMap[sid] || 0) + 1;
    }

    var students = getAllStudents();
    var reportRows = students.map(function(s) {
      var sid = String(s[0]).trim();
      var count = countMap[sid] || 0;
      return [
        sid, 
        (s[1] + " " + s[2] + " " + s[3]).trim(),
        s[4] || '---',
        count
      ];
    });

    reportRows.sort(function(a, b) { 
      if (a[2] !== b[2]) return a[2].localeCompare(b[2]);
      return b[3] - a[3];
    });

    var header = ["Mã Học Sinh", "Họ Và Tên", "Phân Lớp", "Tổng Số Buổi Có Mặt"];
    var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy_HHmm");
    var rangeText = (startDateStr || "Dau") + "_den_" + (endDateStr || "Cuoi");
    var fileName = "ThongKe_DiemDanh_" + rangeText + "_" + timestamp;

    var newFile = SpreadsheetApp.create(fileName);
    var fileId = newFile.getId();
    var ws = newFile.getSheets()[0];
    ws.setName("Thống Kê Điểm Danh");

    ws.getRange(1, 1).setValue("BÁO CÁO THỐNG KÊ ĐIỂM DANH").setFontSize(14).setFontWeight("bold");
    ws.getRange(2, 1).setValue("Thời gian: " + (startDateStr || "Toàn bộ") + " đến " + (endDateStr || "Hiện tại"));
    
    var startRow = 4;
    ws.getRange(startRow, 1, 1, header.length).setValues([header]).setFontWeight("bold").setBackground("#f4b400").setFontColor("#ffffff");
    
    if (reportRows.length > 0) {
      ws.getRange(startRow + 1, 1, reportRows.length, header.length).setValues(reportRows);
      ws.getRange(startRow, 1, reportRows.length + 1, header.length).setBorder(true, true, true, true, true, true);
    }
    
    ws.setFrozenRows(startRow);
    ws.autoResizeColumns(1, header.length);

    var fileDrive = DriveApp.getFileById(fileId);
    fileDrive.moveTo(getExportFolder());
    fileDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return { success: true, downloadUrl: "https://docs.google.com/spreadsheets/d/" + fileId + "/export?format=xlsx" };
  } catch (e) { return { success: false, message: "Lỗi xuất báo cáo: " + e.toString() }; }
}

// ================================================================
// 15. ACADEMIC YEAR MANAGEMENT
// ================================================================

function getAcademicYears() {
  return getDatabaseMap();
}

function addAcademicYear(year, sheetId) {
  requireRole('ADMIN');
  if (!year || !sheetId) throw new Error("Thiếu thông tin năm học hoặc ID.");

  try {
    SpreadsheetApp.openById(sheetId);
  } catch (e) {
    throw new Error("ID Google Sheet không hợp lệ hoặc Tài khoản Server không có quyền truy cập file này.");
  }

  var map = getDatabaseMap();
  map[year] = sheetId;
  PropertiesService.getScriptProperties().setProperty('TNTT_DB_MAP', JSON.stringify(map));
  return { success: true, message: "Đã thêm năm học " + year };
}

function deleteAcademicYear(year) {
  requireRole('ADMIN');
  var map = getDatabaseMap();
  if (!map[year]) throw new Error("Không tìm thấy năm học " + year);
  if (year === DEFAULT_YEAR) throw new Error("Không thể xoá năm học mặc định.");

  delete map[year];
  PropertiesService.getScriptProperties().setProperty('TNTT_DB_MAP', JSON.stringify(map));
  return { success: true, message: "Đã xoá năm học " + year };
}

// ================================================================
// 16. ATTENDANCE MAP (with cache)
// ================================================================

function getAttendanceMap() {
  var CACHE_KEY = "ATTENDANCE_MAP_V2_" + _CURRENT_ACADEMIC_YEAR;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  var data = getValues(SHEET_ATTENDANCE).slice(1);
  var presentCount = {};
  var uniqueDates = {};
  
  for (var i = 0; i < data.length; i++) {
    if (!data[i][0]) continue;
    
    var dateStr = '';
    try {
      if (data[i][0] instanceof Date) {
        dateStr = Utilities.formatDate(data[i][0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      } else {
        var raw = String(data[i][0]);
        dateStr = raw.split(' ')[0];
        var vnMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (vnMatch) dateStr = vnMatch[3] + '-' + vnMatch[2] + '-' + vnMatch[1];
      }
    } catch(e) { continue; }
    
    uniqueDates[dateStr] = true;
    
    var sid = String(data[i][1]);
    if (sid) {
      presentCount[sid] = (presentCount[sid] || 0) + 1;
    }
  }

  var totalLessons = Object.keys(uniqueDates).length;
  var result = { present: presentCount, totalLessons: totalLessons };
  
  try { cache.put(CACHE_KEY, JSON.stringify(result), 300); } catch(e) {}
  return result;
}

function getStudentAttendanceSummary(studentId) {
  if (!studentId) return { present: 0, totalLessons: 0, percentage: '0%' };
  var map = getAttendanceMap();
  var present = map.present[studentId] || 0;
  var total = map.totalLessons;
  var pct = total > 0 ? Math.round(present / total * 100) : 0;
  return { present: present, totalLessons: total, percentage: pct + '%' };
}

// ================================================================
// 17. PUBLIC APIs
// ================================================================

function getStudentPublicProfile(studentId) {
  if (!studentId) return { error: 'Thiếu mã học viên' };
  
  var allStudents = getAllStudents();
  var student = null;
  for (var i = 0; i < allStudents.length; i++) {
    if (String(allStudents[i][0]) === String(studentId)) {
      student = allStudents[i];
      break;
    }
  }
  
  if (!student) return { error: 'Không tìm thấy học viên' };
  
  var gradesMap = getGradesMap();
  var scores = gradesMap[studentId] || { scores: {}, average: 'N/A', rank: '---' };
  var attendance = getStudentAttendanceSummary(studentId);
  
  return {
    student: student,
    scores: scores,
    attendance: attendance
  };
}

// ================================================================
// 18. DEBUG: TEST DB CONNECTION
// ================================================================

function testDbConnection() {
  var result = {
    status: 'OK', timestamp: new Date().toISOString(),
    academicYear: _CURRENT_ACADEMIC_YEAR,
    currentUserEmail: _CURRENT_USER_EMAIL || '(empty)',
    dbMap: null, targetSpreadsheetId: null, spreadsheetName: null,
    sheets: [], usersSheetPreview: [], role: null, errors: []
  };
  try {
    var dbMap = getDatabaseMap(); result.dbMap = dbMap;
    result.targetSpreadsheetId = dbMap[_CURRENT_ACADEMIC_YEAR];
    if (!result.targetSpreadsheetId) {
      result.status = 'ERROR';
      result.errors.push('Khong tim thay Spreadsheet ID cho nam hoc ' + _CURRENT_ACADEMIC_YEAR);
      return result;
    }
    try {
      var ss = SpreadsheetApp.openById(result.targetSpreadsheetId);
      result.spreadsheetName = ss.getName();
      result.sheets = ss.getSheets().map(function(s) { return s.getName(); });
    } catch(e) {
      result.status='ERROR';
      result.errors.push('Khong the mo Spreadsheet: '+e.message);
      return result;
    }
    try {
      var us = ss.getSheetByName('Users');
      if (us && us.getLastRow()>0) {
        result.usersSheetPreview = us.getRange(1,1,Math.min(6,us.getLastRow()),4).getValues();
      } else {
        result.errors.push('Sheet Users khong ton tai hoac trong!');
      }
    } catch(e) { result.errors.push('Loi doc sheet Users: '+e.message); }
    try { result.role = getRole(); } catch(e) { result.errors.push('Loi getRole: '+e.message); }
  } catch(e) { result.status='ERROR'; result.errors.push('Loi chung: '+e.message); }
  return result;
}
