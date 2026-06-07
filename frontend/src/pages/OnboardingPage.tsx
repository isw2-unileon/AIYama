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

const formatTimeRobust = (timeStr: string) => {
    if (!timeStr) return "00:00";
    if (timeStr.includes('T')) {
        return timeStr.split('T')[1].substring(0, 5);
    }
    return timeStr.substring(0, 5);
};

const daysOfWeek = [
    { value: 0, label: 'Todos los días' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
    { value: 7, label: 'Dom' }
];

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // moves between step 1 and 2 of the form
    const [isLoading, setIsLoading] = useState(true); // prevents UI flicker while checking data

    const [formData, setFormData] = useState<OnboardingData>({
        chronotype: '',
        sleepHoursGoal: 8, // keeping it at 8 by default since we removed it from the UI
        sleepStart: '23:00', // by default
        sleepEnd: '07:00', // by default
        fixedBlocks: [],
    });

<<<<<<< HEAD
    // --- TEMPORARY STATE TO ADD A BLOCK ---
    const [currentBlock, setCurrentBlock] = useState<FixedBlock>({
        name: '',
        dayOfWeek: 0, // Everyday by default
        startTime: '',
        endTime: '',
    });

    useEffect(() => {
        const fetchExistingData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const response = await fetch('/api/onboarding', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.chronotype) {
                        const rawBlocks = (data.fixed_blocks || [])
                            .map((block: any) => ({
                                name: block.name,
                                dayOfWeek: Number(block.day_of_week),
                                startTime: formatTimeRobust(block.start_time),
                                endTime: formatTimeRobust(block.end_time)
                            }))
                            .filter((block: any) => block.name !== 'Sleep'); // hide sleep blocks from the visual list

                        const uniqueBlocks = rawBlocks.filter((block: any, index: number, self: any[]) =>
                            index === self.findIndex((b) => (
                                b.name === block.name &&
                                b.dayOfWeek === block.dayOfWeek &&
                                b.startTime === block.startTime &&
                                b.endTime === block.endTime
                            ))
                        );

                        setFormData({
                            chronotype: data.chronotype,
                            sleepHoursGoal: data.sleep_hours_goal || 8,
                            sleepStart: formatTimeRobust(data.sleep_start) || '23:00',
                            sleepEnd: formatTimeRobust(data.sleep_end) || '07:00',
                            fixedBlocks: uniqueBlocks
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching existing data:", error);
=======
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
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd
            }
        };

        fetchExistingData();
<<<<<<< HEAD
    }, []);
=======
    }, [navigate]);
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd

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
                alert("Usuario no encontrado. Por favor, inicia sesión de nuevo.");
                navigate('/login');
                return;
            }

<<<<<<< HEAD
            const expandedBlocks: any[] = [];

            // 1. AUTO-GENERATE SLEEP HOURS FOR THE CALENDAR (Monday to Sunday)
            for (let d = 1; d <= 7; d++) {
                expandedBlocks.push({
                    name: 'Sleep',
                    day_of_week: d,
                    start_time: formData.sleepStart,
                    end_time: formData.sleepEnd
                });
            }

            // 2. EXPAND USER BLOCKS (if Everyday is selected, it is multiplied by 7)
            formData.fixedBlocks.forEach(block => {
                if (Number(block.dayOfWeek) === 0) {
                    for (let d = 1; d <= 7; d++) {
                        expandedBlocks.push({
                            name: block.name,
                            day_of_week: d,
                            start_time: block.startTime,
                            end_time: block.endTime
                        });
                    }
                } else {
                    expandedBlocks.push({
                        name: block.name,
                        day_of_week: Number(block.dayOfWeek),
                        start_time: block.startTime,
                        end_time: block.endTime
                    });
                }
            });

            // here we prepare the data to send to the backend, we can do some transformations if needed
            const payload = {
                chronotype: formData.chronotype,
                sleep_hours_goal: 8, // sent as fixed since we removed it from the survey
                sleep_start: formData.sleepStart,
                sleep_end: formData.sleepEnd,
                fixed_blocks: expandedBlocks
            };

            // we send it to the backend API
            const response = await fetch('/api/onboarding', {
=======
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
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd
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
<<<<<<< HEAD
                navigate('/dashboard'); // navigate to the dashboard after successful onboarding
=======
                navigate('/dashboard'); // navigate to the main app after successful onboarding
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd
            } else {
                const errorData = await response.json();
                console.error("Error response from backend:", errorData);
                alert("Ha ocurrido un error al guardar tu configuración. Por favor, inténtalo de nuevo.");
            }
        } catch (error) {
            console.error("Error during onboarding submission:", error);
<<<<<<< HEAD
            alert("No se pudo conectar con el servidor.");
            return;
        }
    };

    // --- FUNCTIONS FOR FIXED BLOCKS ---
    const handleBlockChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
=======
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
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd
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
<<<<<<< HEAD

        // avoid the user pressing the button twice and adding the exact same block visually
        const isDuplicate = formData.fixedBlocks.some(b =>
            b.name === currentBlock.name &&
            Number(b.dayOfWeek) === Number(currentBlock.dayOfWeek) &&
            b.startTime === currentBlock.startTime &&
            b.endTime === currentBlock.endTime
        );

        if (!isDuplicate) {
            // save the block in the main list
            setFormData({
                ...formData,
                fixedBlocks: [...formData.fixedBlocks, currentBlock]
            });
        }

        // clear the temporary form to be able to add another new block
        setCurrentBlock({ name: '', dayOfWeek: 0, startTime: '', endTime: '' });
    };

    const handleRemoveBlock = (indexToRemove: number) => {
        // filter the list to remove the block the user clicked on
=======
        
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
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd
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
<<<<<<< HEAD
                <h1>Configurar AIyama</h1>
                <p style={{ marginBottom: '30px' }}>Paso {step} de 2: Perfil de actividad</p>
=======
                <h1>Configura tu AIyama</h1>
                <p style={{ marginBottom: '30px' }}>Paso {step} de 2: {step === 1 ? 'Perfil de actividad' : 'Horarios inamovibles'}</p>
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd

                {step === 1 && (
                    <form onSubmit={handleNextStep} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="chronotype" style={{ fontWeight: '500' }}>¿Cuándo rindes mejor? (Cronotipo)</label>
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
                            <label htmlFor="sleepStart" style={{ fontWeight: '500' }}>Hora de acostarse</label>
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
                            <label htmlFor="sleepEnd" style={{ fontWeight: '500' }}>Hora de levantarse</label>
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
<<<<<<< HEAD
                        <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Horarios Fijos</h2>
                        <p style={{ marginBottom: '20px', color: 'var(--text)' }}>Añade tus clases, trabajo u otros compromisos fijos.</p>
=======
                        <p style={{ marginBottom: '20px', color: 'var(--text)' }}>Añade tus clases, trabajo o compromisos fijos.</p>
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd

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
<<<<<<< HEAD
                                    <label style={{ fontSize: '14px' }}>Nombre (ej. Universidad)</label>
                                    <input name="name" type="text" value={currentBlock.name} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Día de la semana</label>
                                    <select name="dayOfWeek" value={currentBlock.dayOfWeek} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', width: '100%' }}>
                                        <option value="0">Todos los días</option>
                                        <option value="1">Lun</option>
                                        <option value="2">Mar</option>
                                        <option value="3">Mié</option>
                                        <option value="4">Jue</option>
                                        <option value="5">Vie</option>
                                        <option value="6">Sáb</option>
                                        <option value="7">Dom</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Hora de inicio</label>
=======
                                    <label style={{ fontSize: '14px' }}>Hora Inicio</label>
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd
                                    <input name="startTime" type="time" value={currentBlock.startTime} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Hora de fin</label>
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
<<<<<<< HEAD
                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {formData.fixedBlocks.map((block, index) => {
                                        const dayLabel = daysOfWeek.find(d => d.value === Number(block.dayOfWeek))?.label;
                                        return (
                                            <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--code-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '14px' }}><strong>{block.name}</strong> ({dayLabel} | {block.startTime} - {block.endTime})</span>
=======
                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {formData.fixedBlocks.map((block, index) => {
                                        const diaStr = weekDays.find(d => d.id === block.dayOfWeek)?.label || '';
                                        return (
                                            <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--code-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '14px' }}><strong>{block.name}</strong> ({diaStr} | {block.startTime} - {block.endTime})</span>
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd
                                                <button onClick={() => handleRemoveBlock(index)} style={{ background: '#ea4335', color: 'white', padding: '4px 10px', width: 'auto', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>X</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* FINAL BUTTONS */}
                        <div style={{ display: 'flex', gap: '15px' }}>
<<<<<<< HEAD
                            <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '2px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', padding: '12px', flex: 1, fontWeight: 'bold' }}>
                                Volver
                            </button>
                            <button onClick={handleFinalSubmit} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', flex: 2, padding: '12px', fontWeight: 'bold' }}>
                                Finalizar configuración
=======
                            <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '12px', flex: 1, fontWeight: 'bold' }}>
                                Editar Perfil
                            </button>
                            <button onClick={handleFinalSubmit} style={{ flex: 2, padding: '12px', fontWeight: 'bold' }}>
                                Entrar a la Agenda
>>>>>>> 365c3bde87fa9d2eed8717d603a4c5b90d90c2fd
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};