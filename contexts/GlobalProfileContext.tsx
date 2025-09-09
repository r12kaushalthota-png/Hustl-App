import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalProfileContextType {
  isProfilePanelVisible: boolean;
  showProfilePanel: () => void;
  hideProfilePanel: () => void;
}

const GlobalProfileContext = createContext<GlobalProfileContextType | undefined>(undefined);

export function GlobalProfileProvider({ children }: { children: ReactNode }) {
  const [isProfilePanelVisible, setIsProfilePanelVisible] = useState(false);

  const showProfilePanel = () => {
    setIsProfilePanelVisible(true);
  };

  const hideProfilePanel = () => {
    setIsProfilePanelVisible(false);
  };

  return (
    <GlobalProfileContext.Provider value={{
      isProfilePanelVisible,
      showProfilePanel,
      hideProfilePanel,
    }}>
      {children}
    </GlobalProfileContext.Provider>
  );
}

export function useGlobalProfile() {
  const context = useContext(GlobalProfileContext);
  if (context === undefined) {
    throw new Error('useGlobalProfile must be used within a GlobalProfileProvider');
  }
  return context;
}