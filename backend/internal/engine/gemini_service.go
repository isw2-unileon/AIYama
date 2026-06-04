package engine

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// GenerateScheduleProposal generates a schedule proposal using the Gemini API based on the provided parameters.
func GenerateScheduleProposal(apiKey, taskName string, duration, frequency int, preferredDays, chronotype, freeSlots string) (string, error) {
	// create the context for the API call
	ctx := context.Background()

	// connect to the Gemini API using the provided API key
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", fmt.Errorf("error al crear el cliente de Gemini: %v", err)
	}
	defer client.Close() // close the client connection when done

	// choose the Gemini model to use for generating the schedule proposal
	model := client.GenerativeModel("gemini-3.5-flash")

	// configure the system instruction (rules and guidelines for the model)
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text("Eres un experto en productividad y gestión del tiempo. Tu objetivo es buscar el mejor momento para realizar tareas basándote en el cronotipo del usuario y sus restricciones. Debes responder siempre y de forma estricta con un ÚNICO OBJETO JSON, sin texto adicional y usando horas exactas."),
		},
	}

	// build the user prompt with the task details and user preferences
	prompt := fmt.Sprintf(`
		Necesita agendar la tarea "%s".
		Duración de cada sesión: La que se indique en el promt de usuario. Por defecto se tendrá que asignar 1 hora.
		Veces que debe repetirse en la semana (frecuencia): %d.
		Cronotipo del usuario: %s.
		Días preferidos (si los hay): %s.

		Nuestro motor matemático ha filtrado el calendario y estos son los ÚNICOS huecos libres disponibles que cumplen las reglas:
		%s

		Analiza la información y elige el MEJOR hueco de la lista proporcionada para realizar la tarea, respetando su cronotipo.

		IMPORTANTE: Devuelve SOLO y EXCLUSIVAMENTE un objeto JSON válido. No devuelvas un array. No incluyas texto antes ni después, ni uses bloques de código markdown (sin "json").
		
		Para construir las variables de fecha en formato ISO-8601 matemático ("YYYY-MM-DDTHH:MM:SSZ"), asume esta semana de referencia según el día que elijas:
		- Lunes: 2026-06-01
		- Martes: 2026-06-02
		- Miércoles: 2026-06-03
		- Jueves: 2026-06-04
		- Viernes: 2026-06-05
		- Sábado: 2026-06-06
		- Domingo: 2026-06-07

		Usa estrictamente esta estructura de llaves:
		{
			"start_time": "2026-06-03T16:00:00Z",
			"end_time": "2026-06-03T16:50:00Z",
			"reason": "Explicación breve de por qué es el mejor momento"
		}
	`, taskName, duration, frequency, chronotype, preferredDays, freeSlots)

	// send the prompt to the Gemini model and get the response
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("error al contactar con la API de Gemini: %v", err)
	}

	// read the generated content from the response
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		responseText := fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])
		responseText = strings.TrimSpace(responseText)
		responseText = strings.TrimPrefix(responseText, "```json")
		responseText = strings.TrimPrefix(responseText, "```")
		responseText = strings.TrimSuffix(responseText, "```")
		responseText = strings.TrimSpace(responseText)
		return responseText, nil
	}

	return "", fmt.Errorf("gemini no devolvió ninguna respuesta")
}
