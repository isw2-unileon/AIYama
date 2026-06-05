export interface CalendarEvent {
    id: string;
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isFixed: boolean;
    date?: string;
    colorClass?: {
        bg: string;
        border: string;
        text: string;
    };
    width?: string;
    left?: string;
}