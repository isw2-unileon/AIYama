import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// what shape does a "Fixed Block" have?
export type FixedBlock = {
    name: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

// we added the block list to our main data
export type OnboardingData = {
    chronotype: string;
    sleepHoursGoal: number;
    fixedBlocks: FixedBlock[]; // initially empty list
};

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // the step variable will be the one that moves between step 1 and 2 of the form

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

    const handleFinalSubmit = async () => {
        try{
            // here we prepare the data to send to the backend, we can do some transformations if needed
            const payload = {
                user_id: "user-123", //later we will get the real user id from the auth context or similar
                chronotype: formData.chronotype,
                sleep_hours_goal: Number(formData.sleepHoursGoal),
                sleep_start: "23:00", // for now we set fixed sleep times, but ideally we would ask the user for them in the form
                sleep_end: "07:00",
                fixed_blocks: formData.fixedBlocks.map(block => ({
                    name: block.name,
                    day_of_week: Number(block.dayOfWeek),
                    start_time: block.startTime,
                    end_time: block.endTime
                }))
            };
            
            // we send it to the window of backend (which will be listened by the main process and then forwarded to the real backend)
            const response = await fetch('http://localhost:8080/api/onboarding', { // endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            // we check if the response is ok
            if (response.ok) {
                console.log("Response status:", response.status);
                navigate('/dashboard'); // we navigate to the dashboard or main page of the app after successful onboarding
            }else{
                const errorData = await response.json();
                console.error("Error response from backend:", errorData);
                alert("Hubo un error al guardar tu configuración. Por favor, inténtalo de nuevo.");
            }
        }catch(error){
            console.error("Error during onboarding submission:", error);
            alert("No se pudo conectar con el servidor. ¿Está encendido el backend?");
            return;
        }
    };

    // --- TEMPORARY STATE TO ADD A BLOCK ---
    const [currentBlock, setCurrentBlock] = useState<FixedBlock>({
        name: '',
        dayOfWeek: 1,
        startTime: '',
        endTime: '',
    });

    // --- FUNCTIONS FOR FIXED BLOCKS ---
    const handleBlockChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCurrentBlock({ ...currentBlock, [e.target.name]: e.target.value });
    };

    const handleAddBlock = (e: React.FormEvent) => {
        e.preventDefault(); // avoids page reload
        // We save the block in the big list
        setFormData({
            ...formData,
            fixedBlocks: [...formData.fixedBlocks, currentBlock]
        });
        // We clear the temporary form to be able to add another new block
        setCurrentBlock({ name: '', dayOfWeek: 1, startTime: '', endTime: '' });
    };

    const handleRemoveBlock = (indexToRemove: number) => {
        // We filter the list to remove the block on which the user clicked
        setFormData({
            ...formData,
            fixedBlocks: formData.fixedBlocks.filter((_, index) => index !== indexToRemove)
        });
    };

    return (
        <div className="auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
            <div className="auth-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', margin: '0 auto' }}>
                <h1>Configura tu AIyama</h1>
                <p style={{ marginBottom: '30px' }}>Paso {step} de 2: Perfil de actividad</p>

                {step === 1 && (
                    <form onSubmit={handleNextStep} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="chronotype" style={{ fontWeight: '500' }}>¿En qué momento del día rindes mejor? (Cronotipo)</label>
                            <select 
                                id="chronotype" 
                                name="chronotype" 
                                value={formData.chronotype} 
                                onChange={handleChange}
                                required
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', width: '100%', boxSizing: 'border-box' }}
                            >
                                <option value="" disabled>Selecciona una opción</option>
                                <option value="morning">Mañana (Alondra)</option>
                                <option value="afternoon">Tarde (Colibrí)</option>
                                <option value="night">Noche (Búho)</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="sleepHoursGoal" style={{ fontWeight: '500' }}>Objetivo de horas de sueño diario</label>
                            <input
                                id="sleepHoursGoal"
                                name="sleepHoursGoal"
                                type="number"
                                min="4"
                                max="12"
                                value={formData.sleepHoursGoal}
                                onChange={handleChange}
                                required
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

                        <button type="submit" style={{ marginTop: '10px', padding: '12px', width: '100%', fontWeight: 'bold' }}>
                            Siguiente: Horarios Fijos
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Horarios inamovibles</h2>
                        <p style={{ marginBottom: '20px', color: 'var(--text)' }}>Añade tus clases, trabajo o compromisos fijos.</p>

                        {/* FORM TO ADD A BLOCK */}
                        <form onSubmit={handleAddBlock} className="auth-form" style={{ padding: '20px', background: 'var(--code-bg)', borderRadius: '8px', marginBottom: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Nombre (Ej: Universidad)</label>
                                    <input name="name" type="text" value={currentBlock.name} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Día de la semana</label>
                                    <select name="dayOfWeek" value={currentBlock.dayOfWeek} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', width: '100%' }}>
                                        <option value="1">Lunes</option>
                                        <option value="2">Martes</option>
                                        <option value="3">Miércoles</option>
                                        <option value="4">Jueves</option>
                                        <option value="5">Viernes</option>
                                        <option value="6">Sábado</option>
                                        <option value="7">Domingo</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Hora Inicio</label>
                                    <input name="startTime" type="time" value={currentBlock.startTime} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Hora Fin</label>
                                    <input name="endTime" type="time" value={currentBlock.endTime} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                            </div>
                            <button type="submit" style={{ background: 'var(--text-h)', color: 'var(--bg)', marginTop: '5px', padding: '10px', fontWeight: 'bold' }}>+ Añadir bloque</button>
                        </form>

                        {/* LIST OF ADDED BLOCKS */}
                        <div style={{ textAlign: 'left', marginBottom: '25px' }}>
                            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Tus horarios guardados:</h3>
                            {formData.fixedBlocks.length === 0 ? (
                                <p style={{ color: 'var(--text)', fontSize: '14px' }}>Aún no has añadido ningún bloque.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {formData.fixedBlocks.map((block, index) => (
                                        <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--code-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                            <span style={{ fontSize: '14px' }}><strong>{block.name}</strong> (Día {block.dayOfWeek} | {block.startTime} - {block.endTime})</span>
                                            <button onClick={() => handleRemoveBlock(index)} style={{ background: '#ea4335', color: 'white', padding: '4px 10px', width: 'auto', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>X</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* FINAL BUTTONS */}
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '12px', flex: 1, fontWeight: 'bold' }}>
                                Volver atrás
                            </button>
                            <button onClick={handleFinalSubmit} style={{ flex: 2, padding: '12px', fontWeight: 'bold' }}>
                                Finalizar Onboarding
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
