import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';
import { registerUser } from '../services/auth.service';
import type { RegisterFormData } from '../types/auth.types';

export const RegisterPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (data: RegisterFormData) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await registerUser(data);
            if (response.error) {
                setError(response.error);
                setIsLoading(false);
                return;
            }

            localStorage.setItem(`needsOnboarding_${data.email}`, 'true');

            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch {
            setError('Algo ha ido mal. Por favor, inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <img src="/favicon.svg" alt="AIyama Logo" className="auth-logo" />
                <h1>Crear cuenta</h1>
                <p>Empieza a optimizar tu tiempo con AIyama</p>
                {success ? (
                    <p className="success-message">
                        ¡Cuenta creada con éxito! Redirigiendo al inicio de sesión...
                    </p>
                ) : (
                    <>
                        <RegisterForm onSubmit={handleRegister} isLoading={isLoading} error={error} />
                        <p className="auth-switch">
                            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};