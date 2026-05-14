export type LoginFormData = {
    email: string;
    password: string;
}

export type RegisterFormData = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export type AuthResponse = {
    token?: string;
    id?: string;
    message?: string;
    error?: string;
}