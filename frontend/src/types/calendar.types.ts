export interface CalendarEvent {
    id: string;
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isFixed: boolean;
    colorClass?: {
        bg: string;
        border: string;
        text: string;
    };
    width?: string;
    left?: string;
}