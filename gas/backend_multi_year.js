/**
 * =================================================================
 * TNTT KIM THÀNH - BACKEND HOÀN CHỈNH (HỖ TRỢ NHIỀU NĂM HỌC)
 * Cập nhật: 01/03/2026
 * Tính năng: Hỗ trợ chuyển đổi Database theo Năm Học
 * =================================================================
 */

// ================================================================
// 1. CẤU HÌNH DATABASE NHIỀU NĂM HỌC (TỰ ĐỘNG LƯU BỞI HỆ THỐNG)
// ================================================================
// Hệ thống giờ đây sử dụng PropertiesService để lưu trữ danh sách năm học.
// Bạn KHÔNG CẦN sửa code khi thêm năm học mới nữa!

const DEFAULT_YEAR = "2025-2026"; // Năm học mặc định

// Hàm nội bộ để lấy danh sách CSDL từ bộ nhớ của Script
function getDatabaseMap() {
    var props = PropertiesService.getScriptProperties();
    var mapStr = props.getProperty('TNTT_DB_MAP');
    if (!mapStr) {
        // Khởi tạo dữ liệu mặc định ban đầu
        var defaultMap = {
            "2025-2026": "1FmyVeIq-D6tlFBtEil_gPH2vK-6mCLqsOzVeQTtbtzQ"

        };
        props.setProperty('TNTT_DB_MAP', JSON.stringify(defaultMap));
        return defaultMap;
    }
    return JSON.parse(mapStr);
}

const ADMIN_EMAIL = 'dongthinhlong@gmail.com';
const SHEET_STUDENTS = 'Students';
const SHEET_GRADES = 'Grades';
const SHEET_USERS = 'Users';
const SHEET_NOTIFICATIONS = 'Notifications';
const SHEET_ATTENDANCE = 'Attendance';

// ================================================================
// 2. BIẾN TOÀN CỤC
// ================================================================
var _CURRENT_ACADEMIC_YEAR = DEFAULT_YEAR; // Lấy từ frontend gửi lên
var _SS_INSTANCE = null;
var _SHEET_VALS_CACHE = {};
var _CURRENT_USER_EMAIL = "";
var _USER_ROLE_CACHE = null;
var _SHEET_OBJ_CACHE = {};

// ================================================================
// 3. CỔNG GIAO TIẾP (DO POST)
// ================================================================
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const functionName = data.functionName;
        const args = data.args || [];

        // Bắt lấy thông tin người dùng và năm học từ Frontend
        if (data.userEmail) _CURRENT_USER_EMAIL = data.userEmail;
        if (data.academicYear) _CURRENT_ACADEMIC_YEAR = data.academicYear;

        const whitelist = [
            'getRole', 'getCurrentUserEmail',
            'getAllStudentsWithPermission', 'getAllClassesWithPermission', 'getAllClasses',
            'findStudentById', 'getStudentScores', 'getMultipleStudentScores',
            'recordScoresBatch', 'getClassSummariesFast',
            'addStudent', 'updateStudent', 'deleteStudent',
            'getAllUsers', 'findUserByEmail', 'addUser', 'updateUser', 'deleteUser',
            'exportStudentList', 'exportGradesList',
            'sendSupportTicket', 'getNotifications', 'deleteNotification',
            'getAttendanceReport', 'recordAttendance', 'getTodayScannedIds',
            'getAcademicYears', 'addAcademicYear', 'deleteAcademicYear' // MỚI
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
// 4. CORE HELPERS (ĐÃ TỐI ƯU CHO NHIỀU NĂM HỌC)
// ================================================================
function getSS() {
    if (!_SS_INSTANCE) {
        var dbMap = getDatabaseMap();
        var targetId = dbMap[_CURRENT_ACADEMIC_YEAR];
        if (!targetId) {
            throw new Error("HỆ THỐNG: Chưa được cấu hình CSDL cho năm học " + _CURRENT_ACADEMIC_YEAR);
        }
        _SS_INSTANCE = SpreadsheetApp.openById(targetId);
    }
    return _SS_INSTANCE;
}

function getValues(sheetName) {
    if (_SHEET_VALS_CACHE[sheetName]) return _SHEET_VALS_CACHE[sheetName];
    const sheet = getSS().getSheetByName(sheetName);
    if (!sheet) return [];
    const vals = sheet.getDataRange().getValues();
    _SHEET_VALS_CACHE[sheetName] = vals;
    return vals;
}

function safeSheet(name) {
    if (_SHEET_OBJ_CACHE[name]) return _SHEET_OBJ_CACHE[name];
    let sheet = getSS().getSheetByName(name);
    if (!sheet) {
        sheet = getSS().insertSheet(name);
    }

    if (sheet.getLastRow() === 0) {
        if (name === SHEET_NOTIFICATIONS) sheet.appendRow(['ID', 'Email', 'Subject', 'Message', 'Date']);
        if (name === SHEET_USERS) sheet.appendRow(['Email', 'Role', 'FullName', 'AssignedClasses']);
        if (name === SHEET_STUDENTS) sheet.appendRow(['ID', 'TenThanh', 'HoDem', 'Ten', 'Lop', 'NgaySinh', 'NgayRuaToi', 'PhuHuynh', 'GiaoKhu', 'SDT']);
        if (name === SHEET_GRADES) sheet.appendRow(['StudentID', 'Type', 'Score', 'Timestamp']);
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
// BÊN DƯỚI LÀ CÁC HÀM XỬ LÝ DỮ LIỆU (Giữ nguyên như bản gốc,
// do đã được thiết kế sử dụng getSS() và safeSheet() một cách tự động)
// ================================================================

function getRole() {
    if (_USER_ROLE_CACHE) return _USER_ROLE_CACHE;
    try {
        const email = getCurrentUserEmail().toLowerCase();
        const rows = getValues(SHEET_USERS);
        for (var i = 1; i < rows.length; i++) {
            if (rows[i][0] && String(rows[i][0]).toLowerCase() === email) {
                _USER_ROLE_CACHE = rows[i][1] || 'GUEST';
                return _USER_ROLE_CACHE;
            }
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

function getAllStudents() {
    // Sửa khoá Cache thêm hậu tố năm học để tránh Cache bị nhầm lẫn giữa các năm
    const CACHE_KEY = "STUDENTS_LIST_CACHE_V2_" + _CURRENT_ACADEMIC_YEAR;
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const values = getValues(SHEET_STUDENTS)
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
        id, o.tenThanh || '', o.hoDem || '', o.ten || '', o.lop || '', o.ngaySinh || '', o.ngayRuaToi || '', o.phuHuynh || '', o.giaoKhu || '', o.sdt || ''
    ]);
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
                o.tenThanh || '', o.hoDem || '', o.ten || '', o.lop || '', o.ngaySinh || '', o.ngayRuaToi || '', o.phuHuynh || '', o.giaoKhu || '', o.sdt || ''
            ]]);
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

function calculateRank(avg) {
    if (avg === 'N/A' || avg === '') return '---';
    var a = Math.round(parseFloat(avg) * 10) / 10;
    if (a >= 8.0) return 'Giỏi';
    if (a >= 6.5) return 'Khá';
    if (a >= 5.0) return 'Trung bình';
    return 'Yếu';
}

function getStudentScores(studentId) {
    requireRole('ADMIN', 'TEACHER');
    var grades = getValues(SHEET_GRADES);
    var latestScores = {};
    grades.forEach(function (r) {
        if (String(r[0]) === String(studentId)) {
            var type = String(r[1]);
            var score = parseFloat(r[2]);
            var dateVal = r[3] instanceof Date ? r[3].getTime() : new Date(r[3]).getTime();
            if (!isNaN(score) && type) {
                if (!latestScores[type] || dateVal > latestScores[type].time) {
                    latestScores[type] = { score: score, time: dateVal, date: r[3] };
                }
            }
        }
    });
    var vals = Object.values(latestScores).map(function (s) { return s.score; });
    var avg = vals.length ? (vals.reduce(function (a, b) { return a + b; }, 0) / vals.length).toFixed(1) : 'N/A';
    return { scores: latestScores, average: avg, rank: calculateRank(avg) };
}

function getMultipleStudentScores(ids) {
    requireRole('ADMIN', 'TEACHER');
    var res = {};
    ids.forEach(function (id) { res[id] = getStudentScores(id); });
    return res;
}

function recordScoresBatch(dataList) {
    requireRole('ADMIN', 'TEACHER');
    var sheet = safeSheet(SHEET_GRADES);
    var timestamp = nowVN();
    var rows = dataList
        .filter(function (d) { return d.id && d.score !== null && d.score !== ''; })
        .map(function (d) { return [String(d.id), d.type, parseFloat(d.score), timestamp]; });
    if (rows.length) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
        clearDashboardCache();
    }
    return { success: true };
}

function getClassSummariesFast() {
    try {
        requireRole('ADMIN', 'TEACHER');
        const DASH_CACHE_KEY = "TNTT_DASHBOARD_V6_" + _CURRENT_ACADEMIC_YEAR;
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
            rankings: { 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0 },
            averageScore: '0.0'
        };
        var totalSum = 0;

        students.forEach(function (s) {
            var sId = String(s[0]);
            var sLop = s[4] || 'N/A';
            if (!summaries[sLop]) {
                summaries[sLop] = {
                    className: sLop, totalStudents: 0, studentsWithScores: 0,
                    averageScore: '0.0', rankings: { 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0 }, _scores: []
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
    const DASH_CACHE_KEY = "TNTT_DASHBOARD_V6_" + _CURRENT_ACADEMIC_YEAR;
    CacheService.getScriptCache().remove(DASH_CACHE_KEY);
    const CACHE_KEY = "STUDENTS_LIST_CACHE_V2_" + _CURRENT_ACADEMIC_YEAR;
    CacheService.getScriptCache().remove(CACHE_KEY);
    _SHEET_VALS_CACHE = {};
}

function getAllUsers() {
    requireRole('ADMIN');
    return getValues(SHEET_USERS).slice(1)
        .filter(function (r) { return r[0]; })
        .map(function (r) { return { email: String(r[0]), role: String(r[1]), fullName: String(r[2] || ''), assignedClasses: String(r[3] || '') }; });
}

function findUserByEmail(email) {
    if (!email) return null;
    var role = getRole();
    var currentUserEmail = getCurrentUserEmail().toLowerCase();
    var targetEmail = String(email).toLowerCase().trim();

    if (role !== 'ADMIN' && currentUserEmail !== targetEmail) {
        throw new Error('Từ chối truy cập: Bạn chỉ có thể tra cứu thông tin của chính mình.');
    }

    var targetUser = null;
    var rows = getValues(SHEET_USERS);
    for (var i = 1; i < rows.length; i++) {
        var checkEmail = String(rows[i][0]).toLowerCase().trim();
        if (checkEmail === targetEmail) {
            targetUser = { email: String(rows[i][0]), role: String(rows[i][1]), fullName: String(rows[i][2] || ''), assignedClasses: String(rows[i][3] || '') };
            break;
        }
    }
    return targetUser;
}

function addUser(u) {
    requireRole('ADMIN');
    safeSheet(SHEET_USERS).appendRow([u.email, u.role, u.fullName || '', u.assignedClasses || '']);
    return { success: true };
}

function updateUser(email, u) {
    requireRole('ADMIN');
    var sheet = safeSheet(SHEET_USERS);
    var data = getValues(SHEET_USERS);
    for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === email.toLowerCase()) {
            sheet.getRange(i + 1, 1, 1, 4).setValues([[email, u.role, u.fullName || '', u.assignedClasses || '']]);
            clearDashboardCache();
            return { success: true };
        }
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

function recordAttendance(studentId) {
    requireRole('ADMIN', 'TEACHER');
    if (!studentId) return { success: false, message: 'Thiếu mã học sinh' };

    var studentIdStr = String(studentId).trim();
    var timestamp = nowVN();
    var teacherEmail = getCurrentUserEmail();

    // Lấy thông tin học sinh trước (đã có Cache trong getAllStudents)
    var allStudents = getAllStudents();
    var student = allStudents.find(function (s) { return s[0] === studentIdStr; });

    if (!student) {
        return { success: false, message: "Mã học sinh không tồn tại trong hệ thống" };
    }

    var studentName = (student[1] + ' ' + student[2] + ' ' + student[3]).trim();
    var studentClass = student[4] || '---';

    var lock = LockService.getScriptLock();
    try {
        // Chờ tối đa 10 giây để xử lý hàng đợi
        lock.waitLock(10000);

        // KIỂM TRA TRÙNG LẶP (Phải nằm trong Lock)
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
        
        // Cập nhật Cache ngay lập tức để yêu cầu tiếp theo thấy luôn
        updateTodayScannedCache(studentIdStr);

        lock.releaseLock();
        return { success: true, timestamp: timestamp, studentName: studentName, studentClass: studentClass };
    } catch (e) {
        if (lock.hasLock()) lock.releaseLock();
        return { success: false, message: "Hệ thống bận hoặc lỗi: " + e.message };
    }
}

// Hàm cập nhật Cache danh sách ID đã quét
function updateTodayScannedCache(newId) {
    var cache = CacheService.getScriptCache();
    var CACHE_KEY = "TODAY_SCANNED_" + _CURRENT_ACADEMIC_YEAR;
    var cached = cache.get(CACHE_KEY);
    var ids = cached ? JSON.parse(cached) : null;
    
    if (ids) {
        ids.push(newId);
        cache.put(CACHE_KEY, JSON.stringify(ids), 21600); // Lưu 6 tiếng
    }
}

function getTodayScannedIds() {
    var CACHE_KEY = "TODAY_SCANNED_" + _CURRENT_ACADEMIC_YEAR;
    var cache = CacheService.getScriptCache();
    var cached = cache.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    var sheet = getSS().getSheetByName(SHEET_ATTENDANCE);
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    var now = new Date();
    var todayStr = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    var ids = [];

    // Duyệt ngược từ dưới lên để tối ưu (vì các dòng mới nằm ở cuối)
    for (var i = data.length - 1; i >= 1; i--) {
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
        else if (data.length - i > 500) break; // Chỉ kiểm tra 500 dòng cuối nếu đã qua ngày hôm nay
    }
    
    // Lưu vào cache trong 10 phút để các yêu cầu gần nhau không phải đọc Sheet lại
    cache.put(CACHE_KEY, JSON.stringify(ids), 600); 
    return ids;
}

function getAttendanceReport(startDateStr, endDateStr) {
    requireRole('ADMIN', 'TEACHER');
    var vals = getValues(SHEET_ATTENDANCE);
    if (vals.length === 0) return [];

    var isHeader = true;
    var firstCell = vals[0][0];
    if (firstCell instanceof Date) isHeader = false;
    else if (typeof firstCell === 'string' && /^\d/.test(firstCell)) isHeader = false;

    var header = isHeader ? vals[0] : ['Timestamp', 'StudentID', 'FullName', 'Class', 'Teacher'];
    var dataRows = isHeader ? vals.slice(1) : vals;

    if (!startDateStr && !endDateStr) return [header].concat(dataRows.slice(-500));

    var filtered = dataRows.filter(function (row) {
        if (!row[0]) return false;
        var rowDateStr = "";
        if (row[0] instanceof Date) {
            rowDateStr = Utilities.formatDate(row[0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
        } else {
            var rawStr = String(row[0]);
            var vnMatch = rawStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (vnMatch) rowDateStr = vnMatch[3] + "-" + vnMatch[2] + "-" + vnMatch[1];
            else rowDateStr = rawStr.split(' ')[0];
        }

        if (startDateStr && rowDateStr < startDateStr) return false;
        if (endDateStr && rowDateStr > endDateStr) return false;
        return true;
    });

    return [header].concat(filtered);
}

function getExportFolder() {
    var folderName = "TNTT_KIMTHANH_EXPORTS_" + _CURRENT_ACADEMIC_YEAR;
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

// ================================================================
// QUẢN LÝ NĂM HỌC (API DÀNH CHO ADMIN)
// ================================================================
function getAcademicYears() {
    return getDatabaseMap();
}

function addAcademicYear(year, sheetId) {
    requireRole('ADMIN');
    if (!year || !sheetId) throw new Error("Thiếu thông tin năm học hoặc ID.");

    // Test xem ID có hợp lệ không
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
