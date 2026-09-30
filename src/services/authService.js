 
import axiosInstance from "./axiosInstance";

export const loginUser = async (
  username,
  password
) => {
  try {
    const response =
      await axiosInstance.post(
        "/auth/login",
        {
          username,
          password,
          expiresInMins: 30,
        }
      );

    return response.data;
  } catch (error) {
    throw createAuthError(
      error,
      "Login failed"
    );
  }
};

export const getCurrentUser = async () => {
  try {
    const response =
      await axiosInstance.get(
        "/auth/me"
      );

    return response.data;
  } catch (error) {
    throw createAuthError(
      error,
      "Session check failed"
    );
  }
};

export const refreshToken = async (
  refreshTokenValue
) => {
  try {
    const response =
      await axiosInstance.post(
        "/auth/refresh",
        {
          refreshToken:
            refreshTokenValue,
          expiresInMins: 30,
        }
      );

    return response.data;
  } catch (error) {
    throw createAuthError(
      error,
      "Token refresh failed"
    );
  }
};

const createAuthError = (
  error,
  fallbackMessage
) => {
  const status =
    error?.response?.status ?? null;

  const serverMessage =
    error?.response?.data?.message;

  const message =
    serverMessage ||
    error?.message ||
    fallbackMessage;

  const authError =
    new Error(message);

  authError.status = status;

  authError.code =
    error?.code || "AUTH_ERROR";

  authError.data =
    error?.response?.data || null;

  return authError;
};
