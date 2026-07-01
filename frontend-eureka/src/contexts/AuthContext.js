import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import authService from "../services/auth.service";
import { clearTokens, getAccessToken, setTokens } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const me = await authService.getMe();
      setUser(me);
    } catch (error) {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    // Si la instancia de Axios no logra refrescar el token, limpia la sesión.
    const handleForcedLogout = () => setUser(null);
    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, [loadUser]);

  const login = async (email, password) => {
    const tokens = await authService.login(email, password);
    setTokens(tokens);

    const me = await authService.getMe();
    setUser(me);
    return me;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  /**
   * Verifica si el usuario actual tiene alguno de los permisos indicados.
   * Uso: hasPermission("companies.create") o hasPermission("a", "b") (OR).
   * user.role.permissions es un array de objetos {id, code, name, ...}
   */
  const hasPermission = (...codes) => {
    if (!user?.role?.permissions) return false;
    const permCodes = user.role.permissions.map((p) =>
      typeof p === "string" ? p : p.code
    );
    return codes.some((code) => permCodes.includes(code));
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
};

export default AuthContext;
