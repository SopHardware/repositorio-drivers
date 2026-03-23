'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface User {
  userId: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('accessToken');
    const userData = Cookies.get('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error de autenticación');
    }

    const data = await response.json();
    Cookies.set('accessToken', data.data.accessToken, { expires: 1 });
    Cookies.set('refreshToken', data.data.refreshToken, { expires: 7 });
    Cookies.set('user', JSON.stringify({ userId: data.data.userId, username, role: data.data.role }), { expires: 1 });
    
    setUser({ userId: data.data.userId, username, role: data.data.role });
  };

  const logout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}