import api from "./api";

const AUTH_PREFIX = "/api/v1/auth";

/**
 * Inicia sesión contra el backend.
 * FastAPI/OAuth2PasswordRequestForm espera form-urlencoded con
 * los campos "username" y "password".
 */
const login = async (email, password) => {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  const response = await api.post(`${AUTH_PREFIX}/login`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data; // { access_token, refresh_token, token_type }
};

const refresh = async (refreshToken) => {
  const response = await api.post(`${AUTH_PREFIX}/refresh`, {
    refresh_token: refreshToken,
  });
  return response.data;
};

const getMe = async () => {
  const response = await api.get(`${AUTH_PREFIX}/me`);
  return response.data;
};

const authService = { login, refresh, getMe };

export default authService;
