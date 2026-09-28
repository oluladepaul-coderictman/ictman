import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface ImpersonatedCompany {
  id: number;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  impersonatedCompany: ImpersonatedCompany | null;
  login: (token: string) => void;
  logout: () => void;
  startImpersonating: (id: number, name: string) => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("cbt_token"));
  const [, setLocation] = useLocation();
  const [impersonatedCompany, setImpersonatedCompany] = useState<ImpersonatedCompany | null>(() => {
    try {
      const stored = sessionStorage.getItem("cbt_impersonate");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const { data: user, isLoading, isError } = useGetMe({
    query: { enabled: !!token, retry: false } as any
  });

  useEffect(() => {
    if (isError) logout();
  }, [isError]);

  const login = (newToken: string) => {
    localStorage.setItem("cbt_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("cbt_token");
    sessionStorage.removeItem("cbt_impersonate");
    setToken(null);
    setImpersonatedCompany(null);
    setLocation("/");
  };

  const startImpersonating = (id: number, name: string) => {
    const data = { id, name };
    sessionStorage.setItem("cbt_impersonate", JSON.stringify(data));
    setImpersonatedCompany(data);
  };

  const stopImpersonating = () => {
    sessionStorage.removeItem("cbt_impersonate");
    setImpersonatedCompany(null);
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading: isLoading && !!token,
      impersonatedCompany,
      login,
      logout,
      startImpersonating,
      stopImpersonating,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
