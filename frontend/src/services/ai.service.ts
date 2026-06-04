// This file defines the types for the AI service, which is responsible for generating schedule proposals based on user input and calendar data.
export interface ScheduleRequest {
  user_id: string;
  task_name: string;
  duration_minutes: number;
  weekly_frequency: number;
  preferred_days: string;
  chronotype: string;
}

// The aiService object contains the proposeSchedule method, which sends a POST request to the backend endpoint that handles schedule proposals, passing the user input as JSON in the request body. It returns the response as JSON, which should contain the proposed schedule or an error message.
export const aiService = {
  proposeSchedule: async (data: ScheduleRequest, token: string) => {
    try {
      // we send a POST request to the backend endpoint that handles schedule proposals, passing the user input as JSON in the request body
      const response = await fetch('/api/propose-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor de IA');
      }
      // we return the response as JSON, which should contain the proposed schedule or an error message
      return await response.json();
    } catch (error) {
      console.error("Error en proposeSchedule:", error);
      throw error;
    }
  }
};