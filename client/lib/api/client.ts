import axios from "axios";

const BASE_URL = "http://localhost:8080/api/v1";

let getToken: () => string | null = () => localStorage.getItem("token");

// function to set the token
export const setTokenGetter = (fn: () => string | null) => {
  getToken = fn;
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// add  a request interceptor

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "auth/login";
    }
    return Promise.reject(error);
  }
);
