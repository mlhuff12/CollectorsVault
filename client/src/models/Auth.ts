export interface AuthState {
    token: string | null;
    username: string | null;
    isAuthenticated: boolean;
}

export interface SignupResponse {
    username: string;
    totpUri: string;
    totpSecret: string;
}

export interface LoginResponse {
    token: string;
    username: string;
    isAdmin: boolean;
}
