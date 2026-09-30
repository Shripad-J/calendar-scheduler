import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://dummyjson.com",
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeToRefresh = (
  resolve,
  reject
) => {
  refreshSubscribers.push({
    resolve,
    reject,
  });
};

const notifyRefreshSuccess = (
  newAccessToken
) => {
  refreshSubscribers.forEach(
    ({ resolve }) => {
      resolve(newAccessToken);
    }
  );

  refreshSubscribers = [];
};

const notifyRefreshFailure = (
  error
) => {
  refreshSubscribers.forEach(
    ({ reject }) => {
      reject(error);
    }
  );

  refreshSubscribers = [];
};

const refreshAccessToken = async () => {
  const refreshToken =
    localStorage.getItem("refreshToken");

  if (!refreshToken) {
    throw new Error(
      "No refresh token available"
    );
  }

  const response = await axios.post(
    "https://dummyjson.com/auth/refresh",
    {
      refreshToken,
      expiresInMins: 30,
    }
  );

  const newAccessToken =
    response.data.accessToken;

  localStorage.setItem(
    "accessToken",
    newAccessToken
  );

  return newAccessToken;
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest =
      error.config;

    // Only handle 401 once
    if (
      error.response?.status !== 401 ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Another request is already
    // refreshing the token
    if (isRefreshing) {
      return new Promise(
        (resolve, reject) => {
          subscribeToRefresh(
            resolve,
            reject
          );
        }
      ).then((newAccessToken) => {
        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return axiosInstance(
          originalRequest
        );
      });
    }

    isRefreshing = true;

    try {
      const newAccessToken =
        await refreshAccessToken();

      notifyRefreshSuccess(
        newAccessToken
      );

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return axiosInstance(
        originalRequest
      );
    } catch (refreshError) {
      notifyRefreshFailure(
        refreshError
      );

      localStorage.removeItem(
        "accessToken"
      );

      localStorage.removeItem(
        "refreshToken"
      );

      return Promise.reject(
        refreshError
      );
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosInstance;