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
    console.warn("Usando MOCK de Gemini API para desarrollo");

    return new Promise((resolve) => {
      // Simulamos el tiempo de carga del bot (1.5 segundos)
      setTimeout(() => {

        // Calculamos fechas para mañana (para que salgan en el calendario)
        const mananaInicio = new Date();
        mananaInicio.setDate(mananaInicio.getDate() + 1);
        mananaInicio.setHours(10, 0, 0, 0); // Mañana a las 10:00

        const mananaFin = new Date(mananaInicio);
        mananaFin.setHours(11, 0, 0, 0); // Mañana a las 11:00

        resolve({
          task_name: "Estudiar ISW2 (Simulado)",
          duration_minutes: 60,
          weekly_frequency: 1,
          reason: "Esta es una respuesta simulada (MOCK) para probar la UI sin gastar tokens de la API.",
          sessions: [
            {
              start_time: mananaInicio.toISOString(),
              end_time: mananaFin.toISOString()
            }
          ]
        });
      }, 1500);
    });
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