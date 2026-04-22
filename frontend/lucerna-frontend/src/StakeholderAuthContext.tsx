import React, { createContext, useContext, useState, useEffect } from "react";

interface StakeholderProfile {
  id: string;
  name: string;
  email: string;
  stakeholder_type: string;
}

interface StakeholderAuthContextType {
  stakeholder: StakeholderProfile | null;
  stakeholderToken: string | null;
  setStakeholderAuth: (profile: StakeholderProfile, token: string) => void;
  clearStakeholderAuth: () => void;
  isLoading: boolean;
}

const StakeholderAuthContext = createContext<
  StakeholderAuthContextType | undefined
>(undefined);

const STORAGE_KEY_PROFILE = "LUCERNAStakeholderProfile";
const STORAGE_KEY_TOKEN = "LUCERNAStakeholderToken";

export const StakeholderAuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [stakeholder, setStakeholder] = useState<StakeholderProfile | null>(
    null
  );
  const [stakeholderToken, setStakeholderToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);

    if (savedToken && savedProfile) {
      try {
        setStakeholder(JSON.parse(savedProfile));
        setStakeholderToken(savedToken);
      } catch {
        clearStakeholderAuth();
      }
    }
    setIsLoading(false);
  }, []);

  const setStakeholderAuth = (
    profile: StakeholderProfile,
    token: string
  ) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    setStakeholder(profile);
    setStakeholderToken(token);
  };

  const clearStakeholderAuth = () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    setStakeholder(null);
    setStakeholderToken(null);
  };

  return (
    <StakeholderAuthContext.Provider
      value={{
        stakeholder,
        stakeholderToken,
        setStakeholderAuth,
        clearStakeholderAuth,
        isLoading,
      }}
    >
      {children}
    </StakeholderAuthContext.Provider>
  );
};

export const useStakeholderAuth = () => {
  const context = useContext(StakeholderAuthContext);
  if (!context)
    throw new Error(
      "useStakeholderAuth must be used within a StakeholderAuthProvider"
    );
  return context;
};
