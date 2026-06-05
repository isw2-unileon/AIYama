import React, { useState } from 'react';
import { type CalendarEvent } from '../../types/calendar.types';

interface WeeklyCalendarProps {
    events: CalendarEvent[];
    onDeleteEvent?: (eventId: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const timeToPercentage = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return ((hours * 60 + minutes) / (24 * 60)) * 100;
};

const timeToMins = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (isNaN(m) ? 0 : m);
};

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ events, onDeleteEvent }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const startOfWeek = getStartOfWeek(currentDate);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
    });

    const monthName = startOfWeek.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const prevWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 7);
        setCurrentDate(d);
    };

    const nextWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        setCurrentDate(d);
    };

    const getLayoutForDay = (dayIndex: number) => {
        const targetDateObj = weekDays[dayIndex];
        const targetDateString = targetDateObj.toLocaleDateString('es-ES');

        const dayEvents = events.filter(e => {
            if (e.isFixed) {
                return e.dayOfWeek === dayIndex;
            } else {
                return e.date === targetDateString;
            }
        });

        const sorted = [...dayEvents].sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

        const columns: CalendarEvent[][] = [];

        sorted.forEach(ev => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const lastEventInCol = columns[i][columns[i].length - 1];
                if (timeToMins(lastEventInCol.endTime) <= timeToMins(ev.startTime)) {
                    columns[i].push(ev);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                columns.push([ev]);
            }
        });

        const layoutEvents: CalendarEvent[] = [];
        columns.forEach((col, colIndex) => {
            col.forEach(ev => {
                layoutEvents.push({
                    ...ev,
                    width: `${100 / columns.length}%`,
                    left: `${(colIndex * 100) / columns.length}%`
                });
            });
        });

        return layoutEvents;
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-extrabold text-slate-900 opacity-100 !text-slate-900 drop-shadow-sm tracking-tight pb-1">{capitalizedMonth}</h2>
                <div className="flex gap-2">
                    <button onClick={prevWeek} className="p-2 hover:bg-gray-200 rounded-full transition-colors">&lt;</button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-sm font-medium bg-white border border-gray-300 hover:bg-gray-50 rounded-md">Hoy</button>
                    <button onClick={nextWeek} className="p-2 hover:bg-gray-200 rounded-full transition-colors">&gt;</button>
                </div>
            </div>

            <div className="grid grid-cols-[60px_1fr] h-[800px] overflow-y-auto relative custom-scrollbar">
                <div className="border-r border-gray-200 bg-gray-50 sticky left-0 z-20">
                    {HOURS.map((hour) => (
                        <div key={`hour-${hour}`} className="h-20 border-b border-gray-200 relative">
                            <span className="absolute -top-3 right-2 text-xs text-gray-500 font-medium bg-gray-50 px-1">
                                {hour}:00
                            </span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 min-w-[700px]">
                    {weekDays.map((dateObj, dayIndex) => {
                        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
                        const dayNumber = dateObj.getDate();
                        const isToday = new Date().toDateString() === dateObj.toDateString();

                        return (
                            <div key={`day-${dayIndex}`} className="relative border-r border-gray-200 min-w-[100px]">
                                <div className={`sticky top-0 z-20 h-14 border-b border-gray-200 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm`}>
                                    <span className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{dayName}</span>
                                    <span className={`text-xl font-medium ${isToday ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mt-1' : 'text-gray-800'}`}>
                                        {dayNumber}
                                    </span>
                                </div>

                                <div className="relative">
                                    {HOURS.map((hour) => (
                                        <div key={`grid-${dayIndex}-${hour}`} className="h-20 border-b border-gray-100" />
                                    ))}

                                    {getLayoutForDay(dayIndex).map((event) => {
                                        const topPos = timeToPercentage(event.startTime);
                                        const height = timeToPercentage(event.endTime) - topPos;
                                        const colorStyle = event.isFixed
                                            ? "bg-slate-100 border-slate-400 text-slate-700"
                                            : (event.colorClass ? `${event.colorClass.bg} ${event.colorClass.border} ${event.colorClass.text}` : "bg-emerald-100 border-emerald-500 text-emerald-900");

                                        return (
                                            <div
                                                key={event.id}
                                                className="absolute group z-10 hover:z-[19] cursor-pointer"
                                                style={{
                                                    top: `${topPos}%`,
                                                    height: `${height}%`,
                                                    width: `calc(${event.width} - 4px)`,
                                                    left: `calc(${event.left} + 2px)`,
                                                }}
                                            >
                                                <div className={`absolute left-0 top-0 w-full min-h-full p-1.5 pr-6 rounded-md border-l-4 shadow-sm transition-all duration-300
                                                    group-hover:!w-[250px] group-hover:!h-auto group-hover:z-[9999] group-hover:shadow-2xl group-hover:cursor-pointer ${colorStyle}`}>

                                                    {!event.isFixed && onDeleteEvent && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteEvent(event.id);
                                                            }}
                                                            className="absolute top-1 right-1 p-1 text-red-600 bg-white/50 hover:bg-red-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50"
                                                            title="Borrar tarea"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    <div className="text-xs font-bold leading-tight truncate group-hover:whitespace-normal">
                                                        {event.title}
                                                    </div>
                                                    <div className="text-[10px] opacity-90 mt-0.5 truncate group-hover:whitespace-normal">
                                                        {event.startTime} - {event.endTime}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};