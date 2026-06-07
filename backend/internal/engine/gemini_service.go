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

		Huecos libres en el calendario (SOLO PUEDES ELEGIR DE AQUÍ):
		%s

		INSTRUCCIONES CLAVE:
		1. Lee el mensaje original del usuario. Si menciona fechas o días específicos ("mañana", "el lunes"), busca esos días ÚNICAMENTE dentro de la lista de 'Huecos libres en el calendario'.
		2. Si no menciona ninguna fecha, asume que es para los próximos días partiendo de hoy, priorizando el hueco que mejor encaje con su cronotipo.
		3. REGLA ESTRICTA: DEBES elegir los horarios OBLIGATORIAMENTE de la lista de 'Huecos libres en el calendario'. BAJO NINGÚN CONCEPTO inventes horarios ni te saltes las restricciones. Si el usuario pide explícitamente un día u hora que NO está en la lista de huecos libres, IGNORA su petición y asígnale el hueco libre válido más cercano.
		4. Devuelve el resultado en un JSON estricto. Genera las fechas en formato ISO-8601 pero CON LA ZONA HORARIA DE ESPAÑA (+02:00) en lugar de la Z de UTC.

		Usa ESTRICTAMENTE esta estructura JSON:
		{
			"reason": "Explicación breve, natural y amigable de por qué elegiste estas fechas (ej: 'He programado tus sesiones a las 15:00 ya que es tu primer hueco libre después de tus bloques fijos'). NO hables como un robot, NO menciones 'huecos leídos' ni pongas números de lista.",
			"sessions": [
				{
					"start_time": "YYYY-MM-DDTHH:MM:SS+02:00",
					"end_time": "YYYY-MM-DDTHH:MM:SS+02:00"
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
