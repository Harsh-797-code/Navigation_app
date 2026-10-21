/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
  onContinueAsGuest: () => void;
  enlargedFont: boolean;
  onToggleFontSize: (enlarged: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
  enlargedFont,
  onToggleFontSize,
}) => {
  const [email, setEmail] = useState('patient@hospital.org');
  const [password, setPassword] = useState('Medipath@2025');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('English');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        onLoginSuccess(email);
      }, 700);
    }, 900);
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between bg-[#faf8ff] text-[#131b2e] ${enlargedFont ? 'text-[17px]' : 'text-[15px]'}`}>
      {/* Top Header */}
      <header className="w-full bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-slate-100">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[#00685f]">
              <span className="material-symbols-outlined text-[30px] text-[#00685f]">explore</span>
              <span className="text-xl font-bold tracking-tight text-[#131b2e]">
                Medi<span className="text-[#00685f]">Path</span>
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-[#f2f3ff] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#3d4947]">
              <span className="material-symbols-outlined text-[16px] text-[#00685f]">domain</span>
              <span>St. Jude Regional Medical Center • Indoor Navigation Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eaedff] text-xs font-bold text-[#3d4947]">
              <span className="material-symbols-outlined text-[18px] text-[#00685f]">call</span>
              <span>Help Desk: (555) 019-8320</span>
            </div>

            {/* Accessibility Font Size Toggle */}
            <div className="flex items-center gap-1 bg-[#f2f3ff] rounded-full p-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => onToggleFontSize(false)}
                aria-label="Standard font size"
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                  !enlargedFont
                    ? 'bg-white text-[#131b2e] shadow-xs'
                    : 'text-[#3d4947] hover:text-[#131b2e]'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => onToggleFontSize(true)}
                aria-label="Enlarged font size"
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                  enlargedFont
                    ? 'bg-white text-[#131b2e] shadow-xs'
                    : 'text-[#3d4947] hover:text-[#131b2e]'
                }`}
              >
                A+
              </button>
            </div>

            {/* Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                aria-label="Select language"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f2f3ff] text-[#3d4947] hover:bg-[#eaedff] hover:text-[#131b2e] transition-colors text-xs font-bold"
              >
                <span className="material-symbols-outlined text-[18px]">language</span>
                <span>{selectedLang}</span>
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  {['English', 'Español', 'Français', 'Tagalog', 'Tiếng Việt'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSelectedLang(lang);
                        setLangMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>{lang}</span>
                      {selectedLang === lang && (
                        <span className="material-symbols-outlined text-[16px] text-[#00685f]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="w-full flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="relative w-full max-w-lg">
          {/* Subtle Ambient Glow Orbs */}
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-[#6bd8cb]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-12 w-72 h-72 bg-[#cce5ff]/30 rounded-full blur-3xl pointer-events-none" />

          {/* Login Card */}
          <div className="relative bg-white rounded-2xl shadow-[0_12px_40px_-10px_rgba(0,104,95,0.08),0_2px_12px_rgba(19,27,46,0.04)] border border-slate-100 p-6 sm:p-8 flex flex-col gap-5">
            {/* Logo and Tagline */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-13 h-13 rounded-2xl bg-[#e6f6f4] border border-[#00685f]/20 flex items-center justify-center p-2.5 shadow-sm text-[#00685f]">
                  <span className="material-symbols-outlined text-[32px] text-[#00685f]">explore</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f2f3ff] rounded-full border border-slate-200/50">
                  <span className="material-symbols-outlined text-[14px] text-[#00685f]">near_me</span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#00685f]">
                    Hospital Wayfinding
                  </span>
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#131b2e] tracking-tight">
                  Welcome to MediPath
                </h1>
                <p className="text-xs sm:text-sm text-[#3d4947] max-w-xs sm:max-w-sm mx-auto mt-1 font-medium">
                  Find your way around the hospital with ease.
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email / ID Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-[#131b2e] flex items-center justify-between" htmlFor="emailInput">
                  <span>Email address</span>
                  <span className="text-[11px] font-semibold text-slate-400">Patient or Staff ID</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 material-symbols-outlined text-[20px] text-slate-400 pointer-events-none">
                    mail
                  </span>
                  <input
                    id="emailInput"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g., name@example.com"
                    className="w-full h-11 pl-10 pr-4 bg-[#f2f3ff] text-[#131b2e] text-xs sm:text-sm font-semibold rounded-xl border border-transparent shadow-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00685f] focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-[#131b2e]" htmlFor="passwordInput">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 material-symbols-outlined text-[20px] text-slate-400 pointer-events-none">
                    lock
                  </span>
                  <input
                    id="passwordInput"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your secure password"
                    className="w-full h-11 pl-10 pr-11 bg-[#f2f3ff] text-[#131b2e] text-xs sm:text-sm font-semibold rounded-xl border border-transparent shadow-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00685f] focus:border-transparent transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-[#131b2e] hover:bg-[#eaedff] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00685f] focus:ring-[#00685f] border-slate-300"
                  />
                  <span className="text-xs font-semibold text-[#131b2e]">
                    Remember me on this device
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-bold text-[#00685f] hover:underline transition-colors focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || submitSuccess}
                className="w-full h-12 mt-1 bg-[#00685f] hover:bg-[#00534c] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-[0_4px_16px_rgba(0,104,95,0.24)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-75 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>Verifying credentials...</span>
                  </>
                ) : submitSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Welcome to MediPath</span>
                  </>
                ) : (
                  <>
                    <span>Log In</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Or instant navigation
              </span>
            </div>

            {/* Continue as Guest Button */}
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full h-11 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#00685f] text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] border border-slate-200/40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-[#00685f]">person_search</span>
              <span>Visiting a patient? Continue as Guest</span>
            </button>

            {/* Create Account Link */}
            <div className="text-center">
              <p className="text-xs text-[#3d4947]">
                New here?{' '}
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="font-bold text-[#00685f] hover:underline transition-colors"
                >
                  Create an account
                </button>
              </p>
            </div>

            {/* Assistance Callout */}
            <div className="bg-[#f2f3ff] rounded-xl p-3 sm:p-3.5 flex items-start gap-2.5 text-left border border-slate-200/50">
              <span className="material-symbols-outlined text-[18px] text-[#00685f] shrink-0 mt-0.5">
                info
              </span>
              <p className="text-xs text-[#3d4947] leading-relaxed">
                Need immediate assistance or wheelchair-accessible wayfinding? Speak to any Information Desk in the Main Lobby.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#00685f]">
              <span className="material-symbols-outlined text-[24px]">lock_reset</span>
              <h3 className="font-extrabold text-slate-900 text-base">Password Recovery</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              For hospital account security, please contact the IT Help Desk at <strong>(555) 019-8320</strong> or visit the registration desk in person with valid photo identification.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="mt-2 w-full py-2 rounded-xl bg-[#00685f] text-white text-xs font-bold hover:bg-[#00534c]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#00685f]">
              <span className="material-symbols-outlined text-[24px]">badge</span>
              <h3 className="font-extrabold text-slate-900 text-base">Patient & Visitor Registration</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Patient accounts are provisioned at appointment check-in. For instant wayfinding without an account, choose &ldquo;Continue as Guest&rdquo;.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRegisterModal(false);
                  onContinueAsGuest();
                }}
                className="flex-1 py-2 rounded-xl bg-[#00685f] text-white text-xs font-bold hover:bg-[#00534c]"
              >
                Continue as Guest
              </button>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] py-4 border-t border-slate-100">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[#f2f3ff] rounded-xl px-4 py-2 border border-slate-200/50">
            <div className="flex items-center gap-2 text-left">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[20px] shrink-0">
                emergency_home
              </span>
              <p className="text-xs font-bold text-[#131b2e]">
                For medical emergencies, please dial 911 immediately or visit the ER on Floor 1.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[#3d4947] text-xs font-bold shrink-0">
              <span className="material-symbols-outlined text-[#00685f] text-[16px]">
                accessibility_new
              </span>
              <span>WCAG 2.1 AA Compliant</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[#3d4947] text-xs">
            <p>© 2025 St. Jude Regional Medical Center. All rights reserved.</p>
            <div className="flex items-center gap-4 flex-wrap">
              <button type="button" className="hover:text-[#00685f] transition-colors">
                Hospital Privacy Policy
              </button>
              <button type="button" className="hover:text-[#00685f] transition-colors">
                Accessibility Statement
              </button>
              <button type="button" className="hover:text-[#00685f] transition-colors">
                Visitor Assistance
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
