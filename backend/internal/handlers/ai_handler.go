package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"aiyama-backend/internal/config"
	"aiyama-backend/internal/engine"
	"aiyama-backend/internal/models"
	"aiyama-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// ProposalRequest represents the expected JSON payload for the /proposal endpoint.
type ProposalRequest struct {
	UserID        string `json:"user_id" binding:"required"`
	RawPrompt     string `json:"raw_prompt" binding:"required"` // Recibe the entire natural language input from the user, e.g., "Quiero estudiar 2h los lunes y miércoles por la tarde"
	PreferredDays string `json:"preferred_days"`
	Chronotype    string `json:"chronotype" binding:"required"`
}

// dayOfWeekToString converts an integer representing the day of the week to its corresponding string in Spanish.
func dayOfWeekToString(day int) string {
	days := []string{"Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"}
	if day >= 0 && day <= 6 {
		return days[day]
	}
	return "Desconocido"
}

func SetupAIRoutes(router *gin.RouterGroup, db *sqlx.DB, cfg *config.Config) {
	router.POST("/propose-schedule", createProposalHandler(db, cfg))
}

func createProposalHandler(db *sqlx.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ProposalRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
			return
		}

		ctx := context.Background()

		// 1. call the Gemini model to extract the structured information from the user's natural language input
		extracted, err := engine.ExtractTaskInfo(cfg.GeminiAPIKey, req.RawPrompt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al entender la frase", "details": err.Error()})
			return
		}

		sleepStart, sleepEnd, err := repository.GetUserSleepTimes(ctx, db, req.UserID)
		if err != nil {
			sleepStart = "23:00"
			sleepEnd = "07:00"
		}

		fixedBlocks, err := repository.GetFixedBlocksByUserID(ctx, db, req.UserID)
		if err != nil {
			fixedBlocks = []models.FixedBlock{}
		}

		scheduledEvents, err := repository.GetCalendarEventsByUserID(ctx, db, req.UserID)
		if err != nil {
			scheduledEvents = []engine.ScheduledEvent{}
		}

		// 2. use the duration extracted by Gemini to find the free slots in the user's calendar that fit that duration, taking into account the fixed blocks and sleep times
		now := time.Now()

		indiceHoy := int(now.Weekday())
		horaActualStr := now.Format("15:04")

		var realFreeSlots strings.Builder
		for day := 0; day < 7; day++ {
			if day < indiceHoy {
				continue
			}
			slots := engine.FindFreeSlotsForDay(day, fixedBlocks, scheduledEvents, sleepStart, sleepEnd, extracted.DurationMinutes)

			for _, slot := range slots {
				if day == indiceHoy {
					if slot.EndTime <= horaActualStr {
						continue
					}
					if slot.StartTime < horaActualStr {
						slot.StartTime = horaActualStr
					}
				}
				dayName := dayOfWeekToString(slot.DayOfWeek)
				realFreeSlots.WriteString(fmt.Sprintf("- %s de %s a %s\n", dayName, slot.StartTime, slot.EndTime))
			}
		}

		freeSlotsText := realFreeSlots.String()
		if freeSlotsText == "" {
			freeSlotsText = "No hay huecos disponibles que cumplan la duración."
		}

		if req.PreferredDays == "" {
			req.PreferredDays = "Ninguno en particular"
		}

		// 3. call Gemini again to generate a schedule proposal based on the extracted information and the free slots found in the calendar
		responseJSON, err := engine.GenerateScheduleProposal(
			cfg.GeminiAPIKey,
			extracted.Name,
			extracted.DurationMinutes,
			extracted.Frequency,
			req.PreferredDays,
			req.Chronotype,
			freeSlotsText,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al consultar a Gemini", "details": err.Error()})
			return
		}

		// 4. join the response from Gemini with the extracted information and return it to the frontend as a JSON
		var geminiMap map[string]interface{}
		if err := json.Unmarshal([]byte(responseJSON), &geminiMap); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Respuesta inválida", "details": err.Error()})
			return
		}

		geminiMap["task_name"] = extracted.Name
		geminiMap["duration_minutes"] = extracted.DurationMinutes
		geminiMap["weekly_frequency"] = extracted.Frequency

		c.JSON(http.StatusOK, geminiMap)
	}
}
