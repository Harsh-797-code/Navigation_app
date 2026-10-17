import React, { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { NavigationPage } from './components/NavigationPage';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'navigation'>('login');
  const [userEmail, setUserEmail] = useState<string>('');
  const [fontSizeLarge, setFontSizeLarge] = useState<boolean>(false);

  const handleLoginSuccess = (email?: string) => {
    setUserEmail(email || 'patient.guest@stjude-health.org');
    setCurrentScreen('navigation');
  };

  const handleContinueAsGuest = () => {
    setUserEmail('guest.visitor@stjude-health.org');
    setCurrentScreen('navigation');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  const handleToggleFontSize = () => {
    setFontSizeLarge((prev) => !prev);
  };

  return (
    <div className={fontSizeLarge ? 'text-[1.08rem]' : ''}>
      {currentScreen === 'login' ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={handleContinueAsGuest}
          fontSizeLarge={fontSizeLarge}
          onToggleFontSize={handleToggleFontSize}
        />
      ) : (
        <NavigationPage
          userEmail={userEmail}
          onLogout={handleLogout}
          fontSizeLarge={fontSizeLarge}
          onToggleFontSize={handleToggleFontSize}
        />
      )}
    </div>
  );
}
