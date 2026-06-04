import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';
import { type CalendarEvent } from '../types/calendar.types';
import { ChatbotPanel } from '../components/chatbot/ChatbotPanel';

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
        console.error("Error decodificando el token", e);
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
                            startTime: startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                            endTime: endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                            isFixed: false,
                            colorClass: randomColor
                        };
                    });
            }

            setEvents([...fixedEvents, ...flexibleEvents]);
            setError(null);
        } catch (err: any) {
            setError("Error de conexión con el servidor.");
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    if (isLoading && events.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl font-semibold text-gray-600 animate-pulse">Cargando tu horario...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 drop-shadow-sm tracking-tight pb-1">Mi Calendario Semanal</h1>
                            <p className="text-gray-500 mt-2">Horario sincronizado con la base de datos</p>
                        </div>

                        {error && (
                            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-6 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-slate-100 border-l-4 border-slate-400 rounded"></div>
                                <span className="text-sm font-medium text-gray-700">Bloques Fijos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-emerald-100 border-l-4 border-emerald-500 rounded"></div>
                                <span className="text-sm font-medium text-gray-700">Tareas Inteligentes</span>
                            </div>
                        </div>
                    </header>

                    <WeeklyCalendar events={events} />
                </div>
            </div>

            <ChatbotPanel
                userId={userId}
                chronotype={chronotype}
                onTaskCreated={fetchCalendarData}
            />

        </div>
    );
};