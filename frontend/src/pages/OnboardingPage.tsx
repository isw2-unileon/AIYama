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
    { value: 0, label: 'Everyday' }, // Añadida opción todos los días
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 7, label: 'Sun' }
];

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // the step variable will be the one that moves between step 1 and 2 of the form

    const [formData, setFormData] = useState<OnboardingData>({
        chronotype: '',
        sleepHoursGoal: 8, // Lo mantenemos en 8 por defecto ya que lo hemos quitado de la UI
        sleepStart: '23:00', // by default
        sleepEnd: '07:00', // by default
        fixedBlocks: [],
    });

    // --- TEMPORARY STATE TO ADD A BLOCK ---
    const [currentBlock, setCurrentBlock] = useState<FixedBlock>({
        name: '',
        dayOfWeek: 0, // Everyday por defecto
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
                            .filter((block: any) => block.name !== 'Sleep'); // Ocultamos los bloques de sueño de la lista visual

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
            }
        };

        fetchExistingData();
    }, []);

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
                alert("User not found. Please log in again.");
                navigate('/login');
                return;
            }

            const expandedBlocks: any[] = [];

            // 1. AUTO-GENERAR HORAS DE SUEÑO PARA EL CALENDARIO (Lunes a Domingo)
            for (let d = 1; d <= 7; d++) {
                expandedBlocks.push({
                    name: 'Sleep',
                    day_of_week: d,
                    start_time: formData.sleepStart,
                    end_time: formData.sleepEnd
                });
            }

            // 2. EXPANDIR BLOQUES DEL USUARIO (Si marca Everyday, se multiplica por 7)
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
                sleep_hours_goal: 8, // Se manda fijo porque lo quitamos de la encuesta
                sleep_start: formData.sleepStart,
                sleep_end: formData.sleepEnd,
                fixed_blocks: expandedBlocks
            };

            // we send it to the window of backend (which will be listened by the main process and then forwarded to the real backend)
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
                navigate('/dashboard'); // we navigate to the dashboard or main page of the app after successful onboarding
            } else {
                const errorData = await response.json();
                console.error("Error response from backend:", errorData);
                alert("There was an error saving your configuration. Please try again.");
            }
        } catch (error) {
            console.error("Error during onboarding submission:", error);
            alert("Could not connect to the server.");
            return;
        }
    };

    // --- FUNCTIONS FOR FIXED BLOCKS ---
    const handleBlockChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCurrentBlock({ ...currentBlock, [e.target.name]: e.target.value });
    };

    const handleAddBlock = (e: React.FormEvent) => {
        e.preventDefault(); // avoids page reload

        // Evitar que el usuario pulse el botón dos veces y meta exactamente el mismo bloque visualmente
        const isDuplicate = formData.fixedBlocks.some(b =>
            b.name === currentBlock.name &&
            Number(b.dayOfWeek) === Number(currentBlock.dayOfWeek) &&
            b.startTime === currentBlock.startTime &&
            b.endTime === currentBlock.endTime
        );

        if (!isDuplicate) {
            // We save the block in the big list
            setFormData({
                ...formData,
                fixedBlocks: [...formData.fixedBlocks, currentBlock]
            });
        }

        // We clear the temporary form to be able to add another new block
        setCurrentBlock({ name: '', dayOfWeek: 0, startTime: '', endTime: '' });
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
                <h1>Configure AIyama</h1>
                <p style={{ marginBottom: '30px' }}>Step {step} of 2: Activity Profile</p>

                {step === 1 && (
                    <form onSubmit={handleNextStep} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="chronotype" style={{ fontWeight: '500' }}>When do you perform best? (Chronotype)</label>
                            <select
                                id="chronotype"
                                name="chronotype"
                                value={formData.chronotype}
                                onChange={handleChange}
                                required
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--code-bg)', color: 'var(--text-h)', width: '100%', boxSizing: 'border-box' }}
                            >
                                <option value="" disabled>Select an option</option>
                                <option value="morning">Morning (Lark)</option>
                                <option value="afternoon">Afternoon (Hummingbird)</option>
                                <option value="night">Night (Owl)</option>
                            </select>
                        </div>

                        {/* SE ELIMINÓ EL OBJETIVO DE HORAS DE SUEÑO AQUÍ COMO PEDISTE */}

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="sleepStart" style={{ fontWeight: '500' }}>Bedtime</label>
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
                            <label htmlFor="sleepEnd" style={{ fontWeight: '500' }}>Wake up time</label>
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
                            Next: Fixed Schedules
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Fixed Schedules</h2>
                        <p style={{ marginBottom: '20px', color: 'var(--text)' }}>Add your classes, work, or fixed commitments.</p>

                        {/* FORM TO ADD A BLOCK */}
                        <form onSubmit={handleAddBlock} className="auth-form" style={{ padding: '20px', background: 'var(--code-bg)', borderRadius: '8px', marginBottom: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Name (e.g., University)</label>
                                    <input name="name" type="text" value={currentBlock.name} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Day of the week</label>
                                    <select name="dayOfWeek" value={currentBlock.dayOfWeek} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', width: '100%' }}>
                                        <option value="0">Everyday</option>
                                        <option value="1">Mon</option>
                                        <option value="2">Tue</option>
                                        <option value="3">Wed</option>
                                        <option value="4">Thu</option>
                                        <option value="5">Fri</option>
                                        <option value="6">Sat</option>
                                        <option value="7">Sun</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>Start Time</label>
                                    <input name="startTime" type="time" value={currentBlock.startTime} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '14px' }}>End Time</label>
                                    <input name="endTime" type="time" value={currentBlock.endTime} onChange={handleBlockChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                                </div>
                            </div>
                            <button type="submit" style={{ background: 'var(--text-h)', color: 'var(--bg)', marginTop: '5px', padding: '10px', fontWeight: 'bold' }}>+ Add block</button>
                        </form>

                        {/* LIST OF ADDED BLOCKS */}
                        <div style={{ textAlign: 'left', marginBottom: '25px' }}>
                            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Your saved schedules:</h3>
                            {formData.fixedBlocks.length === 0 ? (
                                <p style={{ color: 'var(--text)', fontSize: '14px' }}>You haven't added any blocks yet.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {formData.fixedBlocks.map((block, index) => {
                                        const dayLabel = daysOfWeek.find(d => d.value === Number(block.dayOfWeek))?.label;
                                        return (
                                            <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--code-bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '14px' }}><strong>{block.name}</strong> ({dayLabel} | {block.startTime} - {block.endTime})</span>
                                                <button onClick={() => handleRemoveBlock(index)} style={{ background: '#ea4335', color: 'white', padding: '4px 10px', width: 'auto', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>X</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* FINAL BUTTONS */}
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '2px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', padding: '12px', flex: 1, fontWeight: 'bold' }}>
                                Go back
                            </button>
                            <button onClick={handleFinalSubmit} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', flex: 2, padding: '12px', fontWeight: 'bold' }}>
                                Finish Onboarding
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};