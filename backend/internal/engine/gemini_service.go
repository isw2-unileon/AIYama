package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// GenerateScheduleProposal generates a schedule proposal using the Gemini API based on the provided parameters.
func GenerateScheduleProposal(apiKey, taskName string, duration, frequency int, preferredDays, chronotype, freeSlots string) (string, error) {
	ctx := context.Background()

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", fmt.Errorf("error al crear el cliente de Gemini: %v", err)
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-3.5-flash")

	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text("Eres un experto en productividad. Debes proponer horarios basándote en los huecos libres. Responde SIEMPRE con un ÚNICO OBJETO JSON que contenga un array llamado 'sessions' con tantas sesiones como indique la frecuencia."),
		},
	}

	prompt := fmt.Sprintf(`
		Necesita agendar la tarea "%s".
		Duración de cada sesión: %d minutos.
		Veces que debe repetirse en la semana (frecuencia): %d.
		Cronotipo del usuario: %s.
		Días preferidos (si los hay): %s.

		Nuestro motor matemático ha filtrado el calendario y estos son los ÚNICOS huecos libres disponibles que cumplen las reglas:
		%s

		Analiza la información y elige los %d MEJORES huecos distintos de la lista proporcionada. Si la frecuencia es mayor a los huecos disponibles, usa los que puedas.

		Para construir las variables de fecha en formato ISO-8601 matemático ("YYYY-MM-DDTHH:MM:SSZ"), asume esta semana de referencia según el día que elijas:
		- Lunes: 2026-06-01
		- Martes: 2026-06-02
		- Miércoles: 2026-06-03
		- Jueves: 2026-06-04
		- Viernes: 2026-06-05
		- Sábado: 2026-06-06
		- Domingo: 2026-06-07

		Usa ESTRICTAMENTE esta estructura JSON:
		{
			"reason": "Explicación breve de por qué has elegido este plan semanal",
			"sessions": [
				{
					"start_time": "<INSERTA_FECHA_INICIO_ISO>",
					"end_time": "<INSERTA_FECHA_FIN_ISO>"
				}
			]
		}
	`, taskName, duration, frequency, chronotype, preferredDays, freeSlots, frequency)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("error al contactar con la API de Gemini: %v", err)
	}

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

// ExtractedInfo saves the structured information extracted from the user's natural language input, including the task name, duration in minutes, and frequency per week.
type ExtractedInfo struct {
	Name            string `json:"name"`
	DurationMinutes int    `json:"duration_minutes"`
	Frequency       int    `json:"frequency"`
}

// ExtractTaskInfo analyzes the user's natural language input
func ExtractTaskInfo(apiKey, userText string) (*ExtractedInfo, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-3.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text("Eres un extractor de datos. Lee la frase del usuario y extrae el nombre de la tarea, su duración en minutos y cuántos días a la semana quiere hacerla. Si no especifica duración, asume 60. Si no especifica frecuencia, asume 1. Limpia el nombre (ej: de 'quiero estudiar 2h', el nombre es 'Estudiar'). Devuelve SOLO un JSON válido."),
		},
	}

	prompt := fmt.Sprintf(`Frase del usuario: "%s"

	Devuelve estrictamente este formato JSON:
	{
		"name": "Nombre de la tarea",
		"duration_minutes": 60,
		"frequency": 1
	}`, userText)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		responseText := fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])
		responseText = strings.TrimSpace(responseText)
		responseText = strings.TrimPrefix(responseText, "```json")
		responseText = strings.TrimPrefix(responseText, "```")
		responseText = strings.TrimSuffix(responseText, "```")

		var info ExtractedInfo
		if err := json.Unmarshal([]byte(responseText), &info); err != nil {
			return nil, fmt.Errorf("error al leer el JSON de Gemini: %v", err)
		}
		return &info, nil
	}
	return nil, fmt.Errorf("gemini no devolvió datos")
}
