import React, { useState } from 'react';
import { Compass, Mail, Lock, Eye, EyeOff, UserCheck, AlertTriangle, Phone, Globe, Info } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (email?: string) => void;
  onContinueAsGuest: () => void;
  fontSizeLarge: boolean;
  onToggleFontSize: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
  fontSizeLarge,
  onToggleFontSize
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !password.trim()) {
      // Allow demo login even if blank or entered
      onLoginSuccess('patient.guest@stjude-health.org');
      return;
    }
    onLoginSuccess(email || 'patient.guest@stjude-health.org');
  };

  return (
    <div className={`min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 ${fontSizeLarge ? 'text-lg' : 'text-sm'}`}>
      {/* 1. TOP HEADER */}
      <header className="w-full bg-white border-b border-slate-200 py-4 px-4 sm:px-8 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#00685f] flex items-center justify-center text-white shadow-md shadow-[#00685f]/20 shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-[#00685f]">MediPath</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                St. Jude Regional Medical Center • Indoor Navigation Portal
              </p>
            </div>
          </div>

          <div className="flex items-center self-start sm:self-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <Phone className="w-3.5 h-3.5 text-[#00685f]" />
              <span>Help Desk: (555) 019-8320</span>
            </div>

            <button
              type="button"
              onClick={onToggleFontSize}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              title="Toggle Text Size for Accessibility"
            >
              {fontSizeLarge ? 'A Normal' : 'A A+'}
            </button>

            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>English</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN LOGIN FORM CONTAINER */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[460px] bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8 flex flex-col items-center">
          {/* Centered Wayfinding Icon */}
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00685f] mb-3 shadow-inner">
            <Compass className="w-7 h-7" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#00685f] text-[11px] font-extrabold uppercase tracking-wider mb-2">
            <Compass className="w-3 h-3" />
            <span>Hospital Wayfinding</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center tracking-tight">
            Welcome to MediPath
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 text-center mt-1 mb-6 font-medium">
            Find your way around the hospital with ease.
          </p>

          {errorMsg && (
            <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            {/* Email / Patient ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Email address</label>
                <span className="text-[11px] font-semibold text-slate-400">Patient or Staff ID</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#00685f] focus:ring-3 focus:ring-[#00685f]/10 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#00685f] focus:ring-3 focus:ring-[#00685f]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00685f] focus:ring-[#00685f]"
                />
                <span>Remember me on this device</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link sent to your registered email or patient coordinator.')}
                className="font-bold text-[#00685f] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#00685f] hover:bg-[#00534c] text-white font-extrabold text-sm transition-all shadow-md shadow-[#00685f]/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Log In</span>
              <span>→</span>
            </button>
          </form>

          {/* Divider */}
          <div className="w-full relative my-5 flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              OR INSTANT NAVIGATION
            </span>
          </div>

          {/* Guest Button */}
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-[#00685f] font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <UserCheck className="w-4 h-4" />
            <span>Visiting a patient? Continue as Guest</span>
          </button>

          <p className="text-xs text-slate-500 font-medium mt-4">
            New here?{' '}
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-[#00685f] font-bold hover:underline"
            >
              Create an account
            </button>
          </p>

          {/* Immediate Assistance Notice */}
          <div className="w-full mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <Info className="w-4 h-4 text-[#00685f] shrink-0 mt-0.5" />
            <span>
              Need immediate assistance or wheelchair-accessible wayfinding? Speak to any Information Desk in the Main Lobby.
            </span>
          </div>
        </div>
      </main>

      {/* 3. EMERGENCY CALLOUT BANNER */}
      <aside aria-label="Emergency Notice" className="w-full max-w-6xl mx-auto px-4 sm:px-8 mb-4">
        <div className="w-full p-3 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold text-red-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>For medical emergencies, please dial 911 immediately or visit the ER on Floor 1.</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px] font-bold">
            <span>♿</span>
            <span>WCAG 2.1 AA Compliant</span>
          </div>
        </div>
      </aside>

      {/* 4. FOOTER */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-4 sm:px-8 shrink-0 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2025 St. Jude Regional Medical Center. All rights reserved.</span>
          <div className="flex items-center gap-4 text-slate-600 font-semibold">
            <button type="button" className="hover:text-[#00685f] transition-colors">Hospital Privacy Policy</button>
            <span>•</span>
            <button type="button" className="hover:text-[#00685f] transition-colors">Accessibility Statement</button>
            <span>•</span>
            <button type="button" className="hover:text-[#00685f] transition-colors">Visitor Assistance</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
