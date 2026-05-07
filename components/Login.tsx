import React, { useEffect, useRef } from 'react';
import { GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { GOOGLE_CLIENT_ID } from '../constants';

interface LoginProps {
  onLoginSuccess: (credential: string) => void;
  onLoginFailure: () => void;
}

declare global {
  interface Window {
    google: any;
  }
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onLoginFailure }) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeGoogleBtn = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (response.credential) onLoginSuccess(response.credential);
              else onLoginFailure();
            },
            auto_select: false,
            cancel_on_tap_outside: false,
          });

          if (googleButtonRef.current) {
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'continue_with',
              shape: 'pill',
            });
          }
          return true;
        } catch (e) {
          console.error("Error initializing Google Button:", e);
          return false;
        }
      }
      return false;
    };

    if (!initializeGoogleBtn()) {
      const intervalId = setInterval(() => {
        if (initializeGoogleBtn()) clearInterval(intervalId);
      }, 500);
      return () => clearInterval(intervalId);
    }
  }, [onLoginSuccess, onLoginFailure]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden font-sans">
      {/* Animated Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-400/10 rounded-full blur-[100px] animate-bounce duration-[10s]"></div>
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="bg-white/70 backdrop-blur-2xl p-10 rounded-[3rem] shadow-2xl border border-white flex flex-col items-center">
          {/* Logo Area */}
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 transform scale-150 rounded-full animate-pulse"></div>
            <div className="relative z-10 w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-200">
              <GraduationCap className="h-12 w-12" />
            </div>

          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">TNTT Kim Thành</h1>
            <p className="text-slate-500 font-bold px-6">Hệ thống Quản lý Học sinh & Sổ điểm trực tuyến</p>
          </div>

          <div className="w-full space-y-8 flex flex-col items-center">
            <div className="relative w-full group">

              <div className="relative flex justify-center bg-white rounded-full border border-slate-100">
                {/* Google Button Mount Point */}
                <div ref={googleButtonRef}></div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Bảo mật bởi Google</span>
            </div>


            <div className="bg-slate-50 p-4 rounded-2xl w-full border border-slate-100 flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
              <p className="text-[11px] font-bold text-slate-500 leading-tight">Vui lòng đăng nhập để tiếp tục quản lý dữ liệu học sinh & điểm số</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
          &copy; {new Date().getFullYear()} TNTT Kim Thành Management
        </div>
      </div>

      <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(-5%) translateX(-5%); }
            50% { transform: translateY(5%) translateX(5%); }
          }
        `}</style>
    </div>
  );
};

export default Login;