import type { LoginFormData, RegisterFormData, AuthResponse } from '../types/auth.types';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const loginUser = async (data: LoginFormData): Promise<AuthResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: data.email,
                password: data.password,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            return { error: result.error || 'Correo o contraseña incorrectos' };
        }

        if (result.user_id) {
            localStorage.setItem('current_user_id', result.user_id);
        }

        return { token: result.token, id: result.user_id };

    } catch (err) {
        console.error("Login request error:", err);
        return { error: 'Error de red' };
    }
};

export const registerUser = async (data: RegisterFormData): Promise<AuthResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: data.username,
                email: data.email,
                password: data.password,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            return { error: result.error || 'Error al crear el usuario' };
        }

        if (result.user_id) {
            localStorage.setItem('current_user_id', result.user_id);
        }

        return { id: result.user_id, message: result.message || 'Usuario creado correctamente' };

    } catch (err) {
        console.error("Register request error:", err);
        return { error: 'Error de red.' };
    }
};