import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";

export const LoginForm = ({ onSuccess }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(credentials.email, credentials.password);

      if (onSuccess) onSuccess();
      navigate("/dashboard");
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        setError("Email o contraseña incorrectos.");
      } else if (status === 403) {
        setError(detail || "Tu usuario está inactivo. Contacta al administrador.");
      } else {
        setError("No se pudo conectar con el servidor. Intenta nuevamente.");
      }

      Swal.fire({
        icon: "error",
        title: "No se pudo iniciar sesión",
        text: detail || "Revisa tus credenciales e inténtalo de nuevo",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="block text-sm font-medium mb-1.5 text-current"
        >
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={credentials.email}
            onChange={handleChange}
            placeholder="usuario@empresa.com"
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-sm sm:text-base"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="block text-sm font-medium mb-1.5 text-current"
        >
          Contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={credentials.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-sm sm:text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 sm:py-3 text-sm sm:text-base font-bold disabled:opacity-60"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Ingresando...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" />
            Iniciar Sesión
          </span>
        )}
      </Button>
    </form>
  );
};

export default LoginForm;
