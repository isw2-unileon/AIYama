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
	router.GET("/onboarding", getOnboardingHandler(db))
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

func getOnboardingHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.MustGet("user_id").(string)

		payload, err := repository.GetOnboardingData(c.Request.Context(), db, userID)
		if err != nil {
			slog.Error("Error interno obteniendo onboarding", "userID", userID, "detalle_error", err.Error())
			c.JSON(http.StatusNotFound, gin.H{"error": "Onboarding data not found for this user"})
			return
		}

		c.JSON(http.StatusOK, payload)
	}
}
