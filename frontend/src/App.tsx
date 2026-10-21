/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { NavigationScreen } from './components/NavigationScreen';

type Screen = 'login' | 'navigation';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [userEmail, setUserEmail] = useState<string>('');
  const [enlargedFont, setEnlargedFont] = useState<boolean>(false);

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setCurrentScreen('navigation');
  };

  const handleContinueAsGuest = () => {
    setUserEmail('Guest Visitor');
    setCurrentScreen('navigation');
  };

  const handleLogout = () => {
    setUserEmail('');
    setCurrentScreen('login');
  };

  return (
    <div className={`w-full min-h-screen ${enlargedFont ? 'text-[17px]' : 'text-[15px]'}`}>
      {currentScreen === 'login' ? (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={handleContinueAsGuest}
          enlargedFont={enlargedFont}
          onToggleFontSize={setEnlargedFont}
        />
      ) : (
        <NavigationScreen
          userEmail={userEmail}
          onLogout={handleLogout}
          enlargedFont={enlargedFont}
        />
      )}
    </div>
  );
}
