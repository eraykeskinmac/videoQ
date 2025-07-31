import { apiClient } from "./client";
import { User } from "./types";

export const authApi = {
  async login(data: any): Promise<any> {
    const response = await apiClient.post("/auth/login", data);
    return response.data.data;
  },
  async register(data: any): Promise<any> {
    const response = await apiClient.post("/auth/register", data);
    return response.data.data;
  },

  async getCurrentUser(): Promise<any> {
    const response = await apiClient.get("/auth/me");
  }
};
