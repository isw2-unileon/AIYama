package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"

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
	TaskName      string `json:"task_name" binding:"required"`
	Duration      int    `json:"duration_minutes" binding:"required"`
	Frequency     int    `json:"weekly_frequency" binding:"required"`
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

		// receive and validate the request body
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
			return
		}

		ctx := context.Background()

		// obtain data from the database needed for the Gemini prompt
		sleepStart, sleepEnd, err := repository.GetUserSleepTimes(ctx, db, req.UserID)
		if err != nil {
			sleepStart = "23:00"
			sleepEnd = "07:00"
		}

		fixedBlocks, err := repository.GetFixedBlocksByUserID(ctx, db, req.UserID)
		if err != nil {
			fixedBlocks = []models.FixedBlock{}
		}

		// we only want the events that are proposed or confirmed, because the rejected ones are not relevant for the scheduling
		scheduledEvents, err := repository.GetCalendarEventsByUserID(ctx, db, req.UserID)
		if err != nil {
			scheduledEvents = []engine.ScheduledEvent{} // if there's an error, we assume there are no events, which is safer than failing the whole proposal generation
		}

		// calculate the free slots based on the retrieved data
		var realFreeSlots strings.Builder
		for day := 0; day < 7; day++ {
			slots := engine.FindFreeSlotsForDay(day, fixedBlocks, scheduledEvents, sleepStart, sleepEnd, req.Duration)

			for _, slot := range slots {
				dayName := dayOfWeekToString(slot.DayOfWeek)
				realFreeSlots.WriteString(fmt.Sprintf("- %s de %s a %s\n", dayName, slot.StartTime, slot.EndTime))
			}
		}

		freeSlotsText := realFreeSlots.String()
		if freeSlotsText == "" {
			freeSlotsText = "No hay huecos disponibles que cumplan la duración."
		}

		//

		if req.PreferredDays == "" {
			req.PreferredDays = "Ninguno en particular"
		}

		// call the Gemini service to get a schedule proposal based on the request data and the mock free slots
		responseJSON, err := engine.GenerateScheduleProposal(
			cfg.GeminiAPIKey,
			req.TaskName,
			req.Duration,
			req.Frequency,
			req.PreferredDays,
			req.Chronotype,
			freeSlotsText,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al consultar a Gemini", "details": err.Error()})
			return
		}

		// return the Gemini response as JSON
		c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(responseJSON))
	}
}
