/**
 * =================================================================
 * TNTT MANAGEMENT - BACKEND HOÀN CHỈNH
 * Cập nhật: 01/03/2026
 * Sửa lỗi phần tìm kiếm phân quyền (Quyền TEACHER)
 * =================================================================
 */

// ========================a========================================
// 1. CẤU HÌNH
// ================================================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const ADMIN_EMAIL = 'your-admin-email@gmail.com';
const SHEET_STUDENTS = 'Students';
const SHEET_GRADES = 'Grades';
const SHEET_USERS = 'Users';
const SHEET_NOTIFICATIONS = 'Notifications';
const SHEET_ATTENDANCE = 'Attendance';
const SHEET_ATTENDANCE_LOGS = 'Attendance_Logs';

// ================================================================
// 2. BIẾN TOÀN CỤC
// ================================================================
var _SS_INSTANCE = null;
var _SHEET_VALS_CACHE = {};
var _CURRENT_USER_EMAIL = "";
var _USER_ROLE_CACHE = null;
var _SHEET_OBJ_CACHE = {}; // Cache sheet objects to avoid repeated getSheetByName

// ================================================================
// 3. CỔNG GIAO TIẾP (DO POST)
// ================================================================
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const functionName = data.functionName;
        const args = data.args || [];
        if (data.userEmail) _CURRENT_USER_EMAIL = data.userEmail;

        // LƯU Ý BẢO MẬT: Mọi hàm trong danh sách whitelist này đều CÓ THỂ ĐƯỢC GỌI TỪ FRONTEND.
        // Việc chặn quyền (admin/teacher) phải được xử lý bên trong CHI TIẾT từng hàm (sử dụng requireRole).
        const whitelist = [
            'getRole', 'getCurrentUserEmail',
            'getAllStudentsWithPermission', 'getAllClassesWithPermission', 'getAllClasses',
            'findStudentById', 'getStudentScores', 'getMultipleStudentScores',
            'recordScoresBatch', 'getClassSummariesFast',
            'addStudent', 'updateStudent', 'deleteStudent',
            'getAllUsers', 'findUserByEmail', 'addUser', 'updateUser', 'deleteUser',
            'exportStudentList', 'exportGradesList',
            'sendSupportTicket', 'getNotifications', 'deleteNotification',
            'getAttendanceReport', 'recordAttendance', 'getTodayScannedIds'
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
// 4. CORE HELPERS
// ================================================================
function getSS() {
    if (!_SS_INSTANCE) _SS_INSTANCE = SpreadsheetApp.openById(SPREADSHEET_ID);
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
    
    // Đảm bảo luôn có Header nếu sheet trống
    if (sheet.getLastRow() === 0) {
        if (name === SHEET_NOTIFICATIONS) sheet.appendRow(['ID', 'Email', 'Subject', 'Message', 'Date']);
        if (name === SHEET_USERS) sheet.appendRow(['Email', 'Role', 'FullName', 'AssignedClasses']);
        if (name === SHEET_STUDENTS) sheet.appendRow(['ID', 'TenThanh', 'HoDem', 'Ten', 'Lop', 'NgaySinh', 'NgayRuaToi', 'PhuHuynh', 'GiaoKhu', 'SDT']);
        if (name === SHEET_GRADES) sheet.appendRow(['StudentID', 'Type', 'Score', 'Timestamp']);
        if (name === SHEET_ATTENDANCE) sheet.appendRow(['Timestamp', 'StudentID']); 
        if (name === SHEET_ATTENDANCE_LOGS) sheet.appendRow(['Timestamp', 'StudentID', 'FullName', 'Class', 'Teacher']);
    }

    _SHEET_OBJ_CACHE[name] = sheet;
    return sheet;
}

function getCurrentUserEmail() { return _CURRENT_USER_EMAIL || "your-email@gmail.com"; }

function nowVN() {
    return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

// Định dạng ngày sang kiểu Việt Nam: dd/MM/yyyy
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
// 5. PHÂN QUYỀN
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

// ================================================================
// 6. HỌC SINH - ĐỌC DỮ LIỆU
// ================================================================
function getAllStudents() {
    const CACHE_KEY = "STUDENTS_LIST_CACHE_V1";
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const values = getValues(SHEET_STUDENTS)
        .slice(1)
        .filter(function (r) { return r[0]; })
        .map(function (r) { return r.map(function (v) { return String(v || ''); }); });
    
    try { cache.put(CACHE_KEY, JSON.stringify(values), 300); } catch(e) {} // Cache 5 mins
    return values;
}

function getAllClasses() {
    var classes = getAllStudents().map(function (s) { return s[4]; });
    return [...new Set(classes)].filter(function (c) { return c; }).sort();
}

// SỬA LỖI BẢO MẬT: Hàm lấy tất cả học sinh (được whitelist ở doPost)
function getAllStudentsWithPermission() {
    // Tất cả TEACHER và ADMIN đều có quyền kéo danh sách học sinh LỚN (Frontend sẽ tự lọc)
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

// ================================================================
// 7. HỌC SINH - THÊM / SỬA / XÓA
// ================================================================
function addStudent(o) {
    requireRole('ADMIN');
    var id = "HS" + Date.now();
    safeSheet(SHEET_STUDENTS).appendRow([
        id,
        o.tenThanh || '',
        o.hoDem || '',
        o.ten || '',
        o.lop || '',
        o.ngaySinh || '',
        o.ngayRuaToi || '',
        o.phuHuynh || '',
        o.giaoKhu || '',
        o.sdt || ''
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
                o.tenThanh || '',
                o.hoDem || '',
                o.ten || '',
                o.lop || '',
                o.ngaySinh || '',
                o.ngayRuaToi || '',
                o.phuHuynh || '',
                o.giaoKhu || '',
                o.sdt || ''
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

// ================================================================
// 8. ĐIỂM SỐ
// ================================================================
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
    var avg = vals.length
        ? (vals.reduce(function (a, b) { return a + b; }, 0) / vals.length).toFixed(1)
        : 'N/A';
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

// ================================================================
// 9. DASHBOARD (CACHE 5 PHÚT)
// ================================================================
var DASH_CACHE_KEY = "TNTT_DASHBOARD_V6";

function getClassSummariesFast() {
    try {
        requireRole('ADMIN', 'TEACHER');
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
                    averageScore: '0.0',
                    rankings: { 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0 },
                    _scores: []
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
            s.averageScore = s._scores.length
                ? (s._scores.reduce(function (a, b) { return a + b; }, 0) / s._scores.length).toFixed(1)
                : 'N/A';
            delete s._scores;
        });

        overall.averageScore = overall.studentsWithScores
            ? (totalSum / overall.studentsWithScores).toFixed(1)
            : 'N/A';

        var result = { summaries: summaries, overallStats: overall };
        cache.put(DASH_CACHE_KEY, JSON.stringify(result), 300);
        return result;
    } catch (e) { return { error: e.message }; }
}
function clearDashboardCache() {
    CacheService.getScriptCache().remove(DASH_CACHE_KEY);
    _SHEET_VALS_CACHE = {};
}


// ================================================================
// 10. TÀI KHOẢN (USER)
// ================================================================
function getAllUsers() {
    requireRole('ADMIN');
    return getValues(SHEET_USERS).slice(1)
        .filter(function (r) { return r[0]; })
        .map(function (r) {
            return { email: String(r[0]), role: String(r[1]), fullName: String(r[2] || ''), assignedClasses: String(r[3] || '') };
        });
}

/**
 * TÌM KIẾM THÔNG TIN THEO EMAIL (ĐÃ FIX LỖI "TỪ CHỐI TRUY CẬP")
 * - ADMIN có thể tìm bất kỳ ai.
 * - TEACHER CHỈ CÓ THỂ tìm chính họ để xem họ được phân vào lớp nào.
 */
function findUserByEmail(email) {
    if (!email) return null;

    var role = getRole();
    var currentUserEmail = getCurrentUserEmail().toLowerCase();
    var targetEmail = String(email).toLowerCase().trim();

    // KIỂM TRA QUYỀN TRUY CẬP TRỰC TIẾP TẠI ĐÂY thay vì requireRole('ADMIN')
    if (role !== 'ADMIN' && currentUserEmail !== targetEmail) {
        throw new Error('Từ chối truy cập: Bạn chỉ có thể tra cứu thông tin của chính mình.');
    }

    // Lấy dữ liệu KHÔNG DÙNG getAllUsers() vì getAllUsers bị khóa bởi `requireRole('ADMIN')`
    // Tự quét dữ liệu bảng Users để tránh xung đột với các hàm Admin
    var targetUser = null;
    var rows = getValues(SHEET_USERS);

    // Dòng 0 là Header
    for (var i = 1; i < rows.length; i++) {
        var checkEmail = String(rows[i][0]).toLowerCase().trim();
        if (checkEmail === targetEmail) {
            targetUser = {
                email: String(rows[i][0]),
                role: String(rows[i][1]),
                fullName: String(rows[i][2] || ''),
                assignedClasses: String(rows[i][3] || '')
            };
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
            try {
                MailApp.sendEmail(email, "[TNTT Management] Cập nhật quyền truy cập",
                    "Xin chào " + (u.fullName || email) + ",\n\nTài khoản của bạn vừa được cập nhật vai trò: " + u.role + ".\nVui lòng tải lại trang để áp dụng.\n\nTrân trọng,\nHệ thống TNTT Management");
            } catch (mailErr) { }
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

// ================================================================
// 11. THÔNG BÁO
// ================================================================
function sendSupportTicket(d) {
    var sheet = safeSheet(SHEET_NOTIFICATIONS);
    var id = "NT" + Date.now();
    var email = getCurrentUserEmail();
    sheet.appendRow([id, email, d.subject, d.message, nowVN()]);
    try {
        MailApp.sendEmail(ADMIN_EMAIL, "[TNTT] Yêu cầu mới: " + d.subject,
            "Gửi từ: " + email + "\n\nNội dung:\n" + d.message + "\n\nVui lòng đăng nhập hệ thống để xử lý.");
    } catch (e) { }
    return { success: true };
}

function getNotifications() {
    requireRole('ADMIN');
    return getValues(SHEET_NOTIFICATIONS).slice(1)
        .filter(function (r) { return r[0]; })
        .map(function (r) {
            return { id: String(r[0]), email: String(r[1]), subject: String(r[2]), message: String(r[3]), date: String(r[4]) };
        }).reverse();
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
// 12. ĐIỂM DANH (ATTENDANCE)
// ================================================================
function recordAttendance(studentId) {
    requireRole('ADMIN', 'TEACHER');
    if (!studentId) return { success: false, message: 'Thiếu mã học sinh' };
    
    var studentIdStr = String(studentId).trim();
    var timestamp = nowVN();
    var teacherEmail = getCurrentUserEmail();

    // ⚡ TỐI ƯU 1: Lấy thông tin từ Cache (Không đọc Sheet Students)
    var allStudents = getAllStudents(); 
    var student = allStudents.find(function(s) { return s[0] === studentIdStr; });
    
    if (!student) {
        return { success: false, message: "Mã học sinh không tồn tại trong hệ thống" };
    }

    var studentName = (student[1] + ' ' + student[2] + ' ' + student[3]).trim();
    var studentClass = student[4] || '---';

    // ⚡ CHỐNG TRÙNG LẶP: Kiểm tra ID đã có trong Log hôm nay chưa
    var todayIds = getTodayScannedIds();
    if (todayIds.indexOf(studentIdStr) !== -1) {
        return { 
            success: false, 
            message: "Học sinh " + studentName + " đã điểm danh hôm nay rồi!",
            isDuplicate: true,
            studentName: studentName,
            studentClass: studentClass
        };
    }

    // Ghi trực tiếp vào Sheet (không qua Google Form trung gian)
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(5000);
        var logSheet = safeSheet(SHEET_ATTENDANCE_LOGS);
        logSheet.appendRow([timestamp, studentIdStr, studentName, studentClass, teacherEmail]);
        lock.releaseLock();

        return { 
            success: true, 
            timestamp: timestamp,
            studentName: studentName,
            studentClass: studentClass
        };

    } catch (e) {
        if (lock.hasLock()) lock.releaseLock();
        return { success: false, message: "Hệ thống bận (Lock timeout)" };
    }
}
function getTodayScannedIds() {
    requireRole('ADMIN', 'TEACHER');
    var sheet = getSS().getSheetByName(SHEET_ATTENDANCE_LOGS);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    var now = new Date();
    var todayStr = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    var ids = [];
    
    // Scan from bottom up as today's logs are likely at the end
    for (var i = data.length - 1; i >= 1; i--) {
        if (!data[i][0]) continue;
        
        var rowDateStr = "";
        try {
            if (data[i][0] instanceof Date) {
                rowDateStr = Utilities.formatDate(data[i][0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
            } else {
                var rawStr = String(data[i][0]);
                // Handle yyyy-MM-dd HH:mm:ss (nowVN format)
                if (rawStr.indexOf('-') !== -1) {
                   rowDateStr = rawStr.split(' ')[0];
                } 
                // Handle dd/MM/yyyy HH:mm:ss (Vietnamese format)
                else if (rawStr.indexOf('/') !== -1) {
                   var parts = rawStr.split(' ')[0].split('/');
                   if (parts.length === 3) rowDateStr = parts[2] + '-' + parts[1] + '-' + parts[0];
                }
            }
        } catch (e) { continue; }
        
        if (rowDateStr === todayStr) {
            ids.push(String(data[i][1]).trim());
        } else if (data.length - i > 500) { 
            // optimization: stop if we checked 500 rows and no longer in today
            break; 
        }
    }
    return ids;
}
function getAttendanceReport(startDateStr, endDateStr) {
    requireRole('ADMIN', 'TEACHER');
    var vals = getValues(SHEET_ATTENDANCE_LOGS);
    if (vals.length === 0) return [];
    
    // TỰ ĐỘNG PHÁT HIỆN HEADER (Tránh mất dữ liệu nếu Row 1 là dữ liệu thật)
    var isHeader = true;
    var firstCell = vals[0][0];
    if (firstCell instanceof Date) isHeader = false;
    else if (typeof firstCell === 'string' && /^\d/.test(firstCell)) isHeader = false; // Bắt đầu bằng số -> Có vẻ là Timestamp
    
    var header = isHeader ? vals[0] : ['Timestamp', 'StudentID', 'FullName', 'Class', 'Teacher'];
    var dataRows = isHeader ? vals.slice(1) : vals;

    // Nếu không truyền ngày, lấy mẫu 500 dòng gần nhất để tránh treo máy
    if (!startDateStr && !endDateStr) {
        return [header].concat(dataRows.slice(-500));
    }

    // Lọc theo khoảng ngày
    var filtered = dataRows.filter(function(row) {
        if (!row[0]) return false;
        
        // Đảm bảo lấy được định dạng yyyy-MM-dd để so sánh chuỗi
        var rowDateStr = "";
        if (row[0] instanceof Date) {
            rowDateStr = Utilities.formatDate(row[0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
        } else {
            var rawStr = String(row[0]);
            // Nếu là dd/MM/yyyy ...
            var vnMatch = rawStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (vnMatch) {
                rowDateStr = vnMatch[3] + "-" + vnMatch[2] + "-" + vnMatch[1];
            } else {
                rowDateStr = rawStr.split(' ')[0]; // Giả định là yyyy-MM-dd
            }
        }
        
        if (startDateStr && rowDateStr < startDateStr) return false;
        if (endDateStr && rowDateStr > endDateStr) return false;
        return true;
    });

    return [header].concat(filtered);
}

// ================================================================
// 13. XUẤT FILE EXCEL
// ================================================================
function exportStudentList(scope, className) {
    try {
        requireRole('ADMIN', 'TEACHER');
        var students = getAllStudents();
        var target = (scope === 'CLASS' && className)
            ? students.filter(function (s) { return s[4] === className; })
            : students;

        if (target.length === 0) return { success: false, message: "Không có học sinh nào để xuất." };

        var header = ["Mã HS", "Tên Thánh", "Họ Đệm", "Tên", "Lớp", "Ngày Sinh", "Ngày Rửa Tội", "Phụ Huynh", "Giáo Khu", "SĐT"];
        var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy_HHmm");
        var fileName = "DS_HocSinh_" + (className || "ToanTruong") + "_" + timestamp;

        var newFile = SpreadsheetApp.create(fileName);
        var fileId = newFile.getId();
        var ws = newFile.getSheets()[0];
        ws.setName("Danh Sách Học Sinh");

        ws.getRange(1, 1, 1, header.length).setValues([header])
            .setFontWeight("bold").setBackground("#1a73e8").setFontColor("#ffffff");

        // Định dạng ngày sang dd/MM/yyyy cho cột NgaySinh [5] và NgayRuaToi [6]
        var rows = target.map(function (s) {
            return [s[0], s[1], s[2], s[3], s[4], formatDateVN(s[5]), formatDateVN(s[6]), s[7], s[8], s[9]];
        });

        if (rows.length > 0) ws.getRange(2, 1, rows.length, header.length).setValues(rows);
        ws.setFrozenRows(1);
        ws.autoResizeColumns(1, header.length);

        var fileDrive = DriveApp.getFileById(fileId);
        fileDrive.moveTo(getExportFolder());
        fileDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        return { success: true, downloadUrl: "https://docs.google.com/spreadsheets/d/" + fileId + "/export?format=xlsx" };
    } catch (e) {
        return { success: false, message: "Lỗi xuất danh sách: " + e.toString() };
    }
}

function exportGradesList(scope, className) {
    try {
        requireRole('ADMIN', 'TEACHER');
        var students = getAllStudents();
        var target = (scope === 'CLASS' && className)
            ? students.filter(function (s) { return s[4] === className; })
            : students;

        if (target.length === 0) return { success: false, message: "Không có học sinh nào để xuất." };

        var header = ["Mã HS", "Tên Thánh", "Họ Đệm", "Tên", "Lớp", "GK1", "HK1", "GK2", "HK2", "Điểm TB", "Xếp Loại"];
        var timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy_HHmm");
        var fileName = "BangDiem_" + (className || "ToanTruong") + "_" + timestamp;

        var exportData = target.map(function (s) {
            var scoreData = getStudentScores(s[0]);
            var sc = scoreData.scores || {};
            return [
                s[0], s[1], s[2], s[3], s[4],
                sc["GK1"] ? sc["GK1"].score : "",
                sc["HK1"] ? sc["HK1"].score : "",
                sc["GK2"] ? sc["GK2"].score : "",
                sc["HK2"] ? sc["HK2"].score : "",
                scoreData.average !== 'N/A' ? scoreData.average : "",
                scoreData.rank !== '---' ? scoreData.rank : ""
            ];
        });

        var newFile = SpreadsheetApp.create(fileName);
        var fileId = newFile.getId();
        var ws = newFile.getSheets()[0];
        ws.setName("Bảng Điểm");

        ws.getRange(1, 1, 1, header.length).setValues([header])
            .setFontWeight("bold").setBackground("#0f9d58").setFontColor("#ffffff");
        if (exportData.length > 0) ws.getRange(2, 1, exportData.length, header.length).setValues(exportData);
        ws.setFrozenRows(1);
        ws.autoResizeColumns(1, header.length);

        var fileDrive = DriveApp.getFileById(fileId);
        fileDrive.moveTo(getExportFolder());
        fileDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        return { success: true, downloadUrl: "https://docs.google.com/spreadsheets/d/" + fileId + "/export?format=xlsx" };
    } catch (e) {
        return { success: false, message: "Lỗi xuất bảng điểm: " + e.toString() };
    }
}

// ================================================================
// 13. HÀM HỖ TRỢ
// ================================================================
function getExportFolder() {
    var folderName = "TNTT_MANAGEMENT_EXPORTS";
    var it = DriveApp.getFoldersByName(folderName);
    var folder = it.hasNext() ? it.next() : DriveApp.createFolder(folderName);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return folder;
}


