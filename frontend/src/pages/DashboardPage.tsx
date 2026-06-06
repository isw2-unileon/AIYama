import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';
import { type CalendarEvent } from '../types/calendar.types';
import { ChatbotPanel } from '../components/chatbot/ChatbotPanel';
import { supabase } from '../lib/supabase';

const formatTimeRobust = (timeStr: string) => {
    if (!timeStr) return "00:00";
    if (timeStr.includes('T')) {
        return timeStr.split('T')[1].substring(0, 5);
    }
    return timeStr.substring(0, 5);
};

const colorPalettes = [
    { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
    { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
    { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800' },
    { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800' },
    { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-800' },
    { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800' },
    { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800' },
    { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
    { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-800' },
    { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800' },
    { bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', text: 'text-fuchsia-800' },
    { bg: 'bg-lime-100', border: 'border-lime-500', text: 'text-lime-800' },
    { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-800' }
];

const getPersistentColor = (id: string) => {
    if (!id) return colorPalettes[0];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalettes.length;
    return colorPalettes[index];
};

const getUserIdFromToken = (token: string | null): string => {
    if (!token) return '';
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload).user_id || JSON.parse(jsonPayload).sub || '';
    } catch (e) {
        return '';
    }
};

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string>('');
    const [chronotype, setChronotype] = useState<string>('Intermediate');
    const [showUndo, setShowUndo] = useState(false);

    const handleLogout = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // CORRECCIÓN: Usar la ruta relativa para aprovechar el proxy de Vite
                await fetch('/api/calendar/snapshots', {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (error) {
                console.error(error);
            }
        }

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error(error);
        }

        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleEditPreferences = () => {
        navigate('/onboarding');
    };

    const fetchCalendarData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setUserId(getUserIdFromToken(token));

        try {
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
            const tasksRes = await fetch('/api/tasks', { headers, cache: 'no-store' }).catch(() => null);
            const onboardingRes = await fetch('/api/onboarding', { headers, cache: 'no-store' }).catch(() => null);

            let fixedEvents: CalendarEvent[] = [];
            let flexibleEvents: CalendarEvent[] = [];

            if (onboardingRes && onboardingRes.ok) {
                const onboardingData = await onboardingRes.json();
                if (onboardingData.chronotype) setChronotype(onboardingData.chronotype);

                fixedEvents = (onboardingData.fixed_blocks || []).map((block: any) => ({
                    id: `fixed-${block.name}-${block.day_of_week}`,
                    title: block.name,
                    dayOfWeek: block.day_of_week - 1,
                    startTime: formatTimeRobust(block.start_time),
                    endTime: formatTimeRobust(block.end_time),
                    isFixed: true
                }));
            }

            if (tasksRes && tasksRes.ok) {
                const tasksData = await tasksRes.json();
                flexibleEvents = (tasksData || [])
                    .filter((task: any) => task.scheduled_at && task.scheduled_end)
                    .map((task: any) => {
                        const startDate = new Date(task.scheduled_at);
                        const endDate = new Date(task.scheduled_end);
                        let dayOfWeek = startDate.getDay() - 1;
                        if (dayOfWeek === -1) dayOfWeek = 6;

                        const randomColor = getPersistentColor(task.id);
                        return {
                            id: `task-${task.id}`,
                            title: task.title || task.name,
                            dayOfWeek: dayOfWeek,
                            startTime: startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                            endTime: endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                            isFixed: false,
                            colorClass: randomColor,
                            date: startDate.toLocaleDateString('en-US')
                        };
                    });
            }

            setEvents([...fixedEvents, ...flexibleEvents]);
            setError(null);
        } catch (err: any) {
            setError("Server connection error.");
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    const handleDeleteEvent = async (eventId: string) => {
        if (!eventId.startsWith('task-')) return;

        const realTaskId = eventId.replace('task-', '');

        const confirmDelete = window.confirm('Are you sure you want to delete this task?');
        if (!confirmDelete) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`/api/tasks/${realTaskId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchCalendarData();
                setShowUndo(true);
            } else {
                const data = await response.json();
                alert(`Could not delete task: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('Connection error while trying to delete the task.');
        }
    };

    const handleUndo = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/tasks/undo', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setShowUndo(false);
                fetchCalendarData();
            } else {
                alert("Could not undo action (it may have expired).");
            }
        } catch (error) { }
    };

    if (isLoading && events.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl font-semibold text-gray-600 animate-pulse">Loading your schedule...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 drop-shadow-sm tracking-tight pb-1">My Weekly Calendar</h1>
                            <p className="text-gray-500 mt-2">Schedule synchronized with database</p>
                        </div>

                        {error && (
                            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <div className="flex gap-6 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-slate-100 border-l-4 border-slate-400 rounded"></div>
                                    <span className="text-sm font-medium text-gray-700">Fixed Blocks</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-emerald-100 border-l-4 border-emerald-500 rounded"></div>
                                    <span className="text-sm font-medium text-gray-700">Smart Tasks</span>
                                </div>
                            </div>
                            <button
                                onClick={handleEditPreferences}
                                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors"
                            >
                                Edit Preferences
                            </button>
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors"
                            >
                                Log out
                            </button>
                        </div>
                    </header>

                    <WeeklyCalendar events={events} onDeleteEvent={handleDeleteEvent} />
                </div>
            </div>

            <ChatbotPanel
                userId={userId}
                chronotype={chronotype}
                onTaskCreated={fetchCalendarData}
            />
            {showUndo && (
                <div className="fixed bottom-8 right-8 lg:right-[340px] bg-slate-900 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-300 border border-slate-700">
                    <span className="text-sm font-medium">Task deleted</span>
                    <button
                        onClick={handleUndo}
                        className="text-emerald-400 hover:text-emerald-300 font-bold text-sm px-3 py-1.5 rounded hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        Undo
                    </button>
                </div>
            )}
        </div>
    );
};