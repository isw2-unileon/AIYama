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
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <img src="/favicon.svg" alt="AIyama Logo" className="auth-logo" />
                <h1>Create account</h1>
                <p>Start optimizing your time with AIyama</p>
                {success ? (
                    <p className="success-message">
                        Account created successfully! Redirecting to login...
                    </p>
                ) : (
                    <>
                        <RegisterForm onSubmit={handleRegister} isLoading={isLoading} error={error} />
                        <p className="auth-switch">
                            Already have an account? <Link to="/login">Log in</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};