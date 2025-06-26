import { apiRequest } from "./queryClient";
import type { LoginRequest } from "@shared/schema";

interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

class AuthService {
  private token: string | null = null;
  private user: AuthUser | null = null;

  constructor() {
    // Load from localStorage on initialization
    this.token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("auth_user");
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch {
        this.clearAuth();
      }
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });
    const data: AuthResponse = await response.json();
    
    this.setAuth(data.token, data.user);
    return data;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    const response = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    });
    const data: AuthResponse = await response.json();
    
    this.setAuth(data.token, data.user);
    return data;
  }

  logout(): void {
    this.clearAuth();
    window.location.href = "/app";
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  isAdmin(): boolean {
    return this.user?.role === "ADMIN";
  }

  isHunter(): boolean {
    return this.user?.role === "HUNTER";
  }

  isSuperAdmin(): boolean {
    return this.user?.role === "SUPERADMIN";
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.token) {
      return {};
    }
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  private setAuth(token: string, user: AuthUser): void {
    this.token = token;
    this.user = user;
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
  }

  private clearAuth(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }
}

export const authService = new AuthService();
export type { AuthUser, AuthResponse };
