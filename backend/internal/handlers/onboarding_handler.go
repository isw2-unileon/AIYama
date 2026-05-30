package handlers

import (
	"log/slog"
	"net/http"

	"aiyama-backend/internal/models"
	"aiyama-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func SetupOnboardingRoutes(router *gin.RouterGroup, db *sqlx.DB) {
	router.POST("/onboarding", createOnBoardingHandler(db))
}

func createOnBoardingHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload models.OnboardingPayload

		if err := c.ShouldBindJSON(&payload); err != nil {
			slog.Error("Critical error", "detail", err.Error())
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data: " + err.Error()})
			return
		}
		err := repository.SaveOnboarding(c.Request.Context(), db, payload)
		if err != nil {
			slog.Error("Critical error", "detail", err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save onboarding data", "details": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Onboarding completed successfully"})
	}
}
