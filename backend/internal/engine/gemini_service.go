package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// GenerateScheduleProposal generates a schedule proposal using the Gemini API based on the provided parameters.
func GenerateScheduleProposal(apiKey, rawPrompt, taskName string, duration, frequency int, preferredDays, chronotype, freeSlots string) (string, error) {
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

	now := time.Now()
	todayStr := now.Format("2006-01-02 (Monday)")

	prompt := fmt.Sprintf(`
		ATENCIÓN - CONTEXTO TEMPORAL: Hoy es %s.

		Mensaje original del usuario: "%s"

		Información extraída:
		- Tarea: "%s"
		- Duración por sesión: %d minutos
		- Cronotipo: %s

		Huecos libres en el calendario:
		%s

		INSTRUCCIONES CLAVE:
		1. Lee el mensaje original del usuario. Si menciona fechas específicas ("el mes que viene los dos primeros martes", "mañana", "en diciembre"), DEBES partir de la fecha de hoy y calcular matemáticamente qué días exactos son esos.
		2. Si no menciona ninguna fecha, asume que es para los próximos días partiendo de hoy.
		3. Ignora los huecos libres si el usuario pide explícitamente un día concreto que no está en la lista de huecos. Prioriza siempre lo que el usuario ha escrito en su mensaje original.
		4. Devuelve el resultado en un JSON estricto. En el array "sessions" debes generar tantas sesiones como el usuario necesite (en tu ejemplo, 2 martes), usando fechas reales ISO-8601 (YYYY-MM-DDTHH:MM:SSZ).

		Usa ESTRICTAMENTE esta estructura JSON:
		{
			"reason": "Explicación de por qué elegiste estas fechas (ej: 'He programado la tarea para los dos primeros martes del mes que viene como pediste')",
			"sessions": [
				{
					"start_time": "<FECHA_REAL_CALCULADA>",
					"end_time": "<FECHA_REAL_CALCULADA>"
				}
			]
		}
	`, todayStr, rawPrompt, taskName, duration, chronotype, freeSlots)

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
