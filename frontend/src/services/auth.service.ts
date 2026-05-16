import { supabase } from '../lib/supabase';
import type { LoginFormData, RegisterFormData, AuthResponse } from '../types/auth.types';

export const loginUser = async (data: LoginFormData): Promise<AuthResponse> => {
    const { data: session, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
    });

    if (error) return { error: error.message };
    return { token: session.session?.access_token };
};

export const registerUser = async (data: RegisterFormData): Promise<AuthResponse> => {
    const { data: result, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: { username: data.username }
        }
    });

    if (error) return { error: error.message };
    return { id: result.user?.id, message: 'User created successfully' };
};