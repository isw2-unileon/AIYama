import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { loginUser } from '../services/auth.service';
import type { LoginFormData } from '../types/auth.types';

export const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (data: LoginFormData) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await loginUser(data);
            if (response.error) {
                setError(response.error);
                return;
            }
            if (response.token) {
                localStorage.setItem('token', response.token);
            }
            navigate('/dashboard');
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>Welcome back</h1>
                <p>Log in to your AIyama account</p>
                <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
                <p className="auth-switch">
                    Don't have an account? <Link to="/register">Sign up</Link>
                </p>
            </div>
        </div>
    );
};