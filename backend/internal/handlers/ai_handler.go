package handlers

import (
	"net/http"

	"aiyama-backend/internal/config"
	"aiyama-backend/internal/engine"

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

		// For demonstration purposes, we'll use a mock string for free slots. In a real implementation, you would call your scheduling engine to get this data based on the user's calendar and constraints.
		freeSlotsMock := "- Lunes de 16:00 a 19:00\n- Miércoles de 10:00 a 14:00\n- Viernes de 16:00 a 20:00"
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
			freeSlotsMock,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al consultar a Gemini", "details": err.Error()})
			return
		}

		// return the Gemini response as JSON
		c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(responseJSON))
	}
}
