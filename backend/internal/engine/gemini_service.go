package engine

import (
	"context"
	"fmt"

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
			genai.Text("Eres un experto en productividad y gestión del tiempo. Tu objetivo es buscar el mejor momento para realizar tareas basándote en el cronotipo del usuario y sus restricciones. Debes responder siempre y de forma estricta con un ARRAY en formato JSON, sin texto adicional."),
		},
	}

	// build the user prompt with the task details and user preferences
	prompt := fmt.Sprintf(`
		Necesita agendar la tarea "%s".
		Duración de cada sesión: %d minutos.
		Veces que debe repetirse en la semana (frecuencia): %d.
		Cronotipo del usuario: %s.
		Días preferidos (si los hay): %s.

		Nuestro motor matemático ha filtrado el calendario y estos son los ÚNICOS huecos libres disponibles que cumplen las reglas:
		%s

		Analiza la información y elige exactamente %d huecos distintos de la lista proporcionada. Intenta espaciarlos de forma lógica (por ejemplo, no días seguidos si son varias sesiones) y respetando su cronotipo.

		IMPORTANTE: Devuelve SOLO y EXCLUSIVAMENTE un ARRAY de objetos JSON válido. No incluyas texto antes ni después, ni bloques de código markdown:
		[
			{
				"recommended_slot": "Nombre o descripción del hueco elegido",
				"reason": "Explicación breve de por qué es el mejor momento"
			}
		]
	`, taskName, duration, frequency, chronotype, preferredDays, freeSlots, frequency)

	// send the prompt to the Gemini model and get the response
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("error al contactar con la API de Gemini: %v", err)
	}

	// read the generated content from the response
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		responseText := fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])
		return responseText, nil
	}

	return "", fmt.Errorf("gemini no devolvió ninguna respuesta")
}
