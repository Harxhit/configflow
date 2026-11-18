import { createContext, useContext } from "react";

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  userAuth: User | null;
  loading: boolean;
  setUserAuth: React.Dispatch<React.SetStateAction<User | null>>;
  logIn: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("Error finding context");
  }

  return context;
};

export { useAuth, AuthContext };