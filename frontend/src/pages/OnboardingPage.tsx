import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// que forma tiene un "Bloque Fijo"
export type FixedBlock = {
    name: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

// añadimos la lista de bloques a nuestros datos principales
export type OnboardingData = {
    chronotype: string;
    sleepHoursGoal: number;
    fixedBlocks: FixedBlock[]; // lista vacía inicialmente
};

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // la variable step sera la que se mueva entre el paso 1 y 2 del formulario

    const [formData, setFormData] = useState<OnboardingData>({
        chronotype: '',
        sleepHoursGoal: 8,
        fixedBlocks: [],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handleFinalSubmit = () => {
        navigate('/dashboard'); 
    };

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: '500px' }}>
                <h1>Configura tu AIyama</h1>
                <p>Paso {step} de 2: Perfil de actividad</p>

                {step === 1 && (
                    <form onSubmit={handleNextStep} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="chronotype">¿En qué momento del día rindes mejor? (Cronotipo)</label>
                            <select 
                                id="chronotype" 
                                name="chronotype" 
                                value={formData.chronotype} 
                                onChange={handleChange}
                                required
                                style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', width: '100%' }}
                            >
                                <option value="" disabled>Selecciona una opción</option>
                                <option value="morning">Mañana (Alondra)</option>
                                <option value="afternoon">Tarde (Colibrí)</option>
                                <option value="night">Noche (Búho)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="sleepHoursGoal">Objetivo de horas de sueño diario</label>
                            <input
                                id="sleepHoursGoal"
                                name="sleepHoursGoal"
                                type="number"
                                min="4"
                                max="12"
                                value={formData.sleepHoursGoal}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button type="submit" style={{ marginTop: '20px' }}>
                            Siguiente: Horarios Fijos
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <div>
                        <h2>Horarios inamovibles</h2>
                        <p>Aquí irá el componente de los bloques fijos...</p>
                        <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', marginTop: '10px' }}>
                            Volver atrás
                        </button>
                        
                        <button onClick={handleFinalSubmit} style={{ marginTop: '10px', marginLeft: '10px' }}>
                            Finalizar Onboarding
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
