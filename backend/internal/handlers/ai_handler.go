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

		// fetch and clean sleep times
		sleepStart, sleepEnd, err := repository.GetUserSleepTimes(ctx, db, req.UserID)
		if err != nil {
			sleepStart = "23:00"
			sleepEnd = "07:00"
		} else {
			if len(sleepStart) >= 5 {
				sleepStart = sleepStart[:5]
			}
			if len(sleepEnd) >= 5 {
				sleepEnd = sleepEnd[:5]
			}
		}

		// helper to format any time string to "HH:MM"
		cleanTime := func(timeStr string) string {
			if t, err := time.Parse(time.RFC3339, timeStr); err == nil {
				return t.Format("15:04")
			}
			if len(timeStr) >= 16 {
				return timeStr[11:16]
			}
			if len(timeStr) >= 5 {
				return timeStr[:5]
			}
			return timeStr
		}

		// fetch fixed blocks
		fixedBlocks, err := repository.GetFixedBlocksByUserID(ctx, db, req.UserID)
		if err != nil {
			fixedBlocks = []models.FixedBlock{}
		}

		// clean fixed blocks and split them if they cross midnight
		var processedBlocks []models.FixedBlock
		for _, b := range fixedBlocks {
			b.StartTime = cleanTime(b.StartTime)
			b.EndTime = cleanTime(b.EndTime)

			if b.StartTime > b.EndTime {
				// split block at midnight
				b1 := b
				b1.EndTime = "23:59"
				processedBlocks = append(processedBlocks, b1)

				b2 := b
				b2.StartTime = "00:00"
				processedBlocks = append(processedBlocks, b2)
			} else {
				processedBlocks = append(processedBlocks, b)
			}
		}
		fixedBlocks = processedBlocks

		scheduledEvents, err := repository.GetCalendarEventsByUserID(ctx, db, req.UserID)
		if err != nil {
			scheduledEvents = []engine.ScheduledEvent{}
		}
		// clean scheduled events times
		for i := range scheduledEvents {
			scheduledEvents[i].StartTime = cleanTime(scheduledEvents[i].StartTime)
			scheduledEvents[i].EndTime = cleanTime(scheduledEvents[i].EndTime)
		}

		// 2. use the duration extracted by Gemini to find the free slots in the user's calendar that fit that duration, taking into account the fixed blocks and sleep times
		now := time.Now()
		horaActualStr := now.Format("15:04")

		var realFreeSlots strings.Builder

		// check the next 7 days for free slots
		for i := 0; i < 7; i++ {
			targetDate := now.AddDate(0, 0, i)

			// Weekday in Go: 0=Domingo, 1=Lunes... 6=Sábado
			goDay := int(targetDate.Weekday())

			// translate to our DB format: 1=Lunes, 2=Martes... 7=Domingo
			dbDay := goDay
			if dbDay == 0 {
				dbDay = 7
			}

			// search for free slots on that day
			slots := engine.FindFreeSlotsForDay(dbDay, fixedBlocks, scheduledEvents, sleepStart, sleepEnd, extracted.DurationMinutes)

			for _, slot := range slots {
				// If we are evaluating "today" (i == 0), we block the hours that have already passed
				if i == 0 {
					if slot.EndTime <= horaActualStr {
						continue // Discard slot if it has already passed
					}
					if slot.StartTime < horaActualStr {
						slot.StartTime = horaActualStr // if the slot has already started but not ended, we adjust the start time to the current time
					}
				}

				// extract the real date for that day of the week (we know que el targetDate es el día que estamos evaluando, así que ya tenemos la fecha real calculada)
				dateStr := targetDate.Format("2006-01-02")
				dayName := dayOfWeekToString(goDay)

				realFreeSlots.WriteString(fmt.Sprintf("- %s (%s) de %s a %s\n", dateStr, dayName, slot.StartTime, slot.EndTime))
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
			req.RawPrompt,
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
