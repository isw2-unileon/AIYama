import React, { useState, useEffect } from 'react';
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
    sleepStart: string; // we can ask the user for this in the form, but for now we set it fixed
    sleepEnd: string; // we can ask the user for this in the form, but for now we set it fixed
    fixedBlocks: FixedBlock[]; // initially empty list
};

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // moves between step 1 and 2 of the form
    const [isLoading, setIsLoading] = useState(true); // prevents UI flicker while checking data

    const [formData, setFormData] = useState<OnboardingData>({
        chronotype: '',
        sleepHoursGoal: 8,
        sleepStart: '23:00', // by default
        sleepEnd: '07:00', // by default
        fixedBlocks: [],
    });

    // --- SMART ROUTING: CHECK IF USER HAS DATA ---
    useEffect(() => {
        const fetchExistingData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const response = await fetch('/api/onboarding', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Función para extraer solo el "HH:MM" del formato de Go ("0000-01-01T23:00:00Z" -> "23:00")
                    const formatTime = (t: string) => {
                        if (!t) return '';
                        if (t.includes('T')) return t.split('T')[1].substring(0, 5);
                        return t.substring(0, 5);
                    };
                    
                    // Si ya tiene un cronotipo guardado, saltamos al paso 2 con los datos limpios
                    if (data && data.chronotype) {
                        setFormData({
                            chronotype: data.chronotype,
                            sleepHoursGoal: data.sleep_hours_goal || 8,
                            sleepStart: formatTime(data.sleep_start) || '23:00',
                            sleepEnd: formatTime(data.sleep_end) || '07:00',
                            fixedBlocks: data.fixed_blocks ? data.fixed_blocks.map((b: any) => ({
                                name: b.name,
                                dayOfWeek: b.day_of_week,
                                startTime: formatTime(b.start_time),
                                endTime: formatTime(b.end_time)
                            })) : []
                        });
                        setStep(2); 
                    }
                }
            } catch (error) {
                console.error("Error fetching previous data:", error);
            } finally {
                setIsLoading(false); 
            }
        };

        fetchExistingData();
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handleFinalSubmit = async () => {
        try {
            // we get the user from supabase to have the user id to send to the backend
            const token = localStorage.getItem('token');

            if (!token) {
                alert("No se ha encontrado el usuario. Por favor, inicia sesión de nuevo.");
                navigate('/login');
                return;
            }

            // here we prepare the data to send to the backend
            const payload = {
                chronotype: formData.chronotype,
                sleep_hours_goal: Number(formData.sleepHoursGoal),
                sleep_start: formData.sleepStart, 
                sleep_end: formData.sleepEnd, 
                fixed_blocks: formData.fixedBlocks.map(block => ({
                    name: block.name,
                    day_of_week: Number(block.dayOfWeek),
                    start_time: block.startTime,
                    end_time: block.endTime
                }))
            };

            // we send it to the backend endpoint
            const response = await fetch('/api/onboarding', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            // we check if the response is ok
            if (response.ok) {
                console.log("Response status:", response.status);
                navigate('/dashboard'); // navigate to the main app after successful onboarding
            } else {
                const errorData = await response.json();
                console.error("Error response from backend:", errorData);
                alert("Hubo un error al guardar tu configuración. Por favor, inténtalo de nuevo.");
            }
        } catch (error) {
            console.error("Error during onboarding submission:", error);
            alert("No se pudo conectar con el servidor. ¿Está encendido el backend?");
        }
    };

    // --- TEMPORARY STATE TO ADD BLOCKS (MULTIPLE DAYS) ---
    const [currentBlock, setCurrentBlock] = useState({
        name: '',
        daysOfWeek: [] as number[], // now an array of days
        startTime: '',
        endTime: '',
    });

    const handleBlockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentBlock({ ...currentBlock, [e.target.name]: e.target.value });
    };

    // toggles a day in the array
    const handleDayToggle = (dayId: number) => {
        setCurrentBlock(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(dayId)
                ? prev.daysOfWeek.filter(d => d !== dayId) // remove if exists
                : [...prev.daysOfWeek, dayId] // add if missing
        }));
    };

    const handleAddBlock = (e: React.FormEvent) => {
        e.preventDefault(); // avoids page reload
        
        if (currentBlock.daysOfWeek.length === 0) {
            alert("Por favor, selecciona al menos un día de la semana.");
            return;
        }

        // create a separate block for each selected day
        const newBlocks = currentBlock.daysOfWeek.map(day => ({
            name: currentBlock.name,
            dayOfWeek: day,
            startTime: currentBlock.startTime,
            endTime: currentBlock.endTime
        }));

        // save all new blocks to the main list
        setFormData({
            ...formData,
            fixedBlocks: [...formData.fixedBlocks, ...newBlocks]
        });

        // clear temporary form
        setCurrentBlock({ name: '', daysOfWeek: [], startTime: '', endTime: '' });
    };

    const handleRemoveBlock = (indexToRemove: number) => {
        // filter the list to remove the block
        setFormData({
            ...formData,
            fixedBlocks: formData.fixedBlocks.filter((_, index) => index !== indexToRemove)
        });
    };

    // helper array for UI day buttons
    const weekDays = [
        { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'X' },
        { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' }, { id: 7, label: 'D' }
    ];

    if (isLoading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading profile...</div>;
    }

    return (
        <div className="auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
            <div className="auth-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', margin: '0 auto' }}>
                <h1>Configura tu AIyama</h1>
                <p style={{ marginBottom: '30px' }}>Paso {step} de 2: {step === 1 ? 'Perfil de actividad' : 'Horarios inamovibles'}</p>

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

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="sleepStart" style={{ fontWeight: '500' }}>¿A qué hora sueles acostarte?</label>
                            <input
                                id="sleepStart"
                                name="sleepStart"
                                type="time"
                                value={formData.sleepStart}
                                onChange={handleChange}
                                required
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="sleepEnd" style={{ fontWeight: '500' }}>¿A qué hora sueles despertarte?</label>
                            <input
                                id="sleepEnd"
                                name="sleepEnd"
                                type="time"
                                value={formData.sleepEnd}
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
                        <p style={{ marginBottom: '20px', color: 'var(--text)' }}>Añade tus clases, trabajo o compromisos fijos.</p>

                        {/* FORM TO ADD A BLOCK */}
                        <form onSubmit={handleAddBlock} className="auth-form" style={{ padding: '20px', background: 'var(--code-bg)', borderRadius: '8px', marginBottom: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '14px' }}>Nombre (Ej: Universidad)</label>
                                <input name="name" type="text" value={currentBlock.name} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                            </div>

                            {/* MULTI-DAY BUTTONS */}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '14px' }}>Días de la semana</label>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                                    {weekDays.map(day => (
                                        <button
                                            type="button"
                                            key={day.id}
                                            onClick={() => handleDayToggle(day.id)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '4px',
                                                border: '1px solid var(--border)',
                                                background: currentBlock.daysOfWeek.includes(day.id) ? 'var(--text-h)' : 'var(--bg)',
                                                color: currentBlock.daysOfWeek.includes(day.id) ? 'var(--bg)' : 'var(--text-h)',
                                                cursor: 'pointer',
                                                flex: 1,
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Hora Inicio</label>
                                    <input name="startTime" type="time" value={currentBlock.startTime} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Hora Fin</label>
                                    <input name="endTime" type="time" value={currentBlock.endTime} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                            </div>
                            <button type="submit" style={{ background: 'var(--text-h)', color: 'var(--bg)', marginTop: '5px', padding: '10px', fontWeight: 'bold' }}>+ Añadir bloques</button>
                        </form>

                        {/* LIST OF ADDED BLOCKS */}
                        <div style={{ textAlign: 'left', marginBottom: '25px' }}>
                            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Tus horarios guardados:</h3>
                            {formData.fixedBlocks.length === 0 ? (
                                <p style={{ color: 'var(--text)', fontSize: '14px' }}>Aún no has añadido ningún bloque.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {formData.fixedBlocks.map((block, index) => {
                                        const diaStr = weekDays.find(d => d.id === block.dayOfWeek)?.label || '';
                                        return (
                                            <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--code-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '14px' }}><strong>{block.name}</strong> ({diaStr} | {block.startTime} - {block.endTime})</span>
                                                <button onClick={() => handleRemoveBlock(index)} style={{ background: '#ea4335', color: 'white', padding: '4px 10px', width: 'auto', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>X</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* FINAL BUTTONS */}
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '12px', flex: 1, fontWeight: 'bold' }}>
                                Editar Perfil
                            </button>
                            <button onClick={handleFinalSubmit} style={{ flex: 2, padding: '12px', fontWeight: 'bold' }}>
                                Entrar a la Agenda
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};