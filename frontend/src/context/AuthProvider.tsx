
import { useState, useEffect } from "react";
import { AuthContext, type User } from "./AuthContext";
import api from "../lib/api";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userAuth, setUserAuth] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isLoggedIn = !!userAuth;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        setUserAuth(response.data.data.user);
      } catch {
        console.warn("Auth check failed");
        setUserAuth(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logIn = (user: User) => {
    setUserAuth(user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/signout");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setUserAuth(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        userAuth,
        loading,
        logIn,
        logout,
        setUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider };
