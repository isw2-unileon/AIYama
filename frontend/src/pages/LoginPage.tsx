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
                setIsLoading(false);
                return;
            }
            if (response.token) {
                localStorage.setItem('token', response.token);

                const needsOnboarding = localStorage.getItem(`needsOnboarding_${data.email}`);

                if (needsOnboarding === 'true') {
                    localStorage.removeItem(`needsOnboarding_${data.email}`);
                    navigate('/onboarding');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch {
            setError('Algo ha ido mal. Por favor, inténtalo de nuevo.');
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <img src="/favicon.svg" alt="AIyama Logo" className="auth-logo" />
                <h1>Bienvenido de vuelta</h1>
                <p>Inicia sesión en tu cuenta de AIyama</p>
                <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
                <p className="auth-switch">
                    ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
                </p>
            </div>
        </div>
    );
};