import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import StudentList from './components/StudentList';
import GradeInput from './components/GradeInput';
import Dashboard from './components/Dashboard';
import Export from './components/Export';
import UserManagement from './components/UserManagement';
import DatabaseEditor from './components/DatabaseEditor';
import RoleRequest from './components/RoleRequest';
import AdminNotifications from './components/AdminNotifications';
import Login from './components/Login';
import StudentProfile from './components/StudentProfile'; // Import new component
import StudentSearch from './components/StudentSearch'; // New Search Component
import LandingPage from './components/LandingPage'; // Landing Page Import
import AttendanceScanner from './components/AttendanceScanner';
import QRManager from './components/QRManager';
import BadgePrinter from './components/BadgePrinter';
import AcademicYearManager from './components/AcademicYearManager';
import Hub from './components/Hub';
import { api } from './services/gasApi';
import { Toaster, toast } from 'react-hot-toast';
// Helper to decode JWT from Google
const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('hub');
  const [userRole, setUserRole] = useState('GUEST');
  const [assignedClasses, setAssignedClasses] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoginVisible, setIsLoginVisible] = useState(false); // New state to toggle Login view
  const [isDashboardActive, setIsDashboardActive] = useState(false); // New state to control entering the dashboard
  const [loading, setLoading] = useState(false);

  // Guest Mode State
  const [guestProfileId, setGuestProfileId] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Internal Search State (for logged-in users)
  const [searchResultId, setSearchResultId] = useState<string | null>(null);

  // Check for existing session on load & URL Params for Guest Mode
  useEffect(() => {
    // 1. Check URL for Guest Profile Access (QR Scan)
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const idParam = params.get('id');

    if (viewParam === 'profile' && idParam) {
      setGuestProfileId(idParam);
      return; // Stop further auth checks if in Guest Mode
    }

    if (viewParam === 'search') {
      setIsSearchMode(true);
      return;
    }

    // 2. Normal Auth Check
    const savedToken = localStorage.getItem('tntt_auth_token');
    if (savedToken) {
      handleLoginSuccess(savedToken);
    }

    // 3. Background fetch available years for the layout dropdown
    api.getAcademicYears().then(years => {
      if (years) {
        localStorage.setItem('tntt_available_years', JSON.stringify(Object.keys(years)));
        // If current year is not set or not in list, set it to the latest
        const current = localStorage.getItem('tntt_academic_year');
        if (!current || !years[current]) {
          const latestYear = Object.keys(years).sort().pop();
          if (latestYear) localStorage.setItem('tntt_academic_year', latestYear);
        }
      }
    }).catch(e => console.error("Could not fetch academic years", e));
  }, []);

  const handleLoginSuccess = async (credential: string) => {
    setLoading(true);
    try {
      const payload = parseJwt(credential);
      if (payload && payload.email) {
        setUserEmail(payload.email);
        setIsAuthenticated(true);
        localStorage.setItem('tntt_auth_token', credential);

        // CRITICAL: Save email specifically for GAS API calls
        localStorage.setItem('tntt_user_email', payload.email);

        // Optimized: Fetch all necessary startup data in one single request
        const initialData = await api.getInitialAppData();
        const role = (initialData.role || 'GUEST').toUpperCase();
        setUserRole(role);
        setAssignedClasses(initialData.assignedClasses || '');
        console.log("Initial App Data loaded. Role:", role, "Classes:", initialData.assignedClasses);

        // Finalize login flow
        setIsDashboardActive(true);
        setIsLoginVisible(false); // Close login modal if open

        // Tab redirection logic
        if (role === 'GUEST') {
          setActiveTab('search');
        } else {
          setActiveTab('hub');
        }
      } else {
        toast.error('Không thể xác thực thông tin đăng nhập.');
      }
    } catch (e) {
      console.error("Login processing error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tntt_auth_token');
    localStorage.removeItem('tntt_user_email');
    setIsAuthenticated(false);
    setIsDashboardActive(false); // Exit dashboard
    setUserEmail('');
    setUserRole('GUEST');

    // Reset Google Sign-In state if needed
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  // RENDER: Guest Profile View (No Login Required)
  if (guestProfileId) {
    return <StudentProfile studentId={guestProfileId} isGuestView={true} />;
  }

  // RENDER: Guest Search View
  if (isSearchMode) {
    return <StudentSearch />;
  }

  // RENDER: Login Screen Overlay
  if (isLoginVisible && !isAuthenticated) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsLoginVisible(false)}
          className="absolute top-6 left-6 z-50 p-2 bg-white/50 hover:bg-white rounded-full backdrop-blur-md transition-all text-slate-500 hover:text-slate-800"
        >
          ← Quay lại trang chủ
        </button>
        <Login onLoginSuccess={handleLoginSuccess} onLoginFailure={() => toast.error('Đăng nhập thất bại')} />
      </div>
    );
  }

  // RENDER: Landing Page (Entry Point for EVERYONE)
  // If authenticated, we pass props to show "Go to Dashboard" button
  if (!isDashboardActive) {
    return (
      <LandingPage
        onLoginClick={() => setIsLoginVisible(true)}
        isAuthenticated={isAuthenticated}
        onGoToDashboard={() => setIsDashboardActive(true)}
      />
    );
  }

  // RENDER: Loading
  if (loading) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'hub': return <Hub userRole={userRole} onTabChange={setActiveTab} />;
      case 'students': return <StudentList userRole={userRole} assignedClasses={assignedClasses} />;
      case 'attendance': return <AttendanceScanner userRole={userRole} />;
      case 'qrcodes': return <QRManager userRole={userRole} assignedClasses={assignedClasses} />;
      case 'badges': return <BadgePrinter userRole={userRole} assignedClasses={assignedClasses} />;
      case 'scores': return <GradeInput userRole={userRole} assignedClasses={assignedClasses} />;
      case 'summaries': return <Dashboard userRole={userRole} />;
      case 'export': return <Export userRole={userRole} assignedClasses={assignedClasses} />;
      case 'users': return <UserManagement />;
      case 'database': return <AcademicYearManager userRole={userRole} />;
      case 'notifications': return <AdminNotifications />;
      case 'profile': return <RoleRequest userEmail={userEmail} currentRole={userRole} />;
      case 'search':
        if (searchResultId) {
          return (
            <div className="w-full max-w-4xl mx-auto">
              <button
                onClick={() => setSearchResultId(null)}
                className="mb-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                ← Quay lại tìm kiếm
              </button>
              <StudentProfile
                studentId={searchResultId}
                isGuestView={false}
                onClose={() => setSearchResultId(null)}
              />
            </div>
          );
        }
        return (
          <div className="h-full flex flex-col items-center justify-center pt-10">
            <StudentSearch
              isEmbedded={true}
              onSearch={(id) => setSearchResultId(id)}
            />
          </div>
        );
      default: return <div>Tab not found</div>;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userRole={userRole}
      userEmail={userEmail}
      onLogout={handleLogout}
    >
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff', fontWeight: 'bold' } }} />
      {renderContent()}
    </Layout>
  );
};

export default App;