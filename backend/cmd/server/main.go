package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"aiyama-backend/internal/config"
	"aiyama-backend/internal/database"
	"aiyama-backend/internal/handlers"
	"aiyama-backend/internal/middleware"

	"github.com/gin-contrib/cors"

	"github.com/gin-gonic/gin"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

func main() {
	ctx := context.Background()

	cfg := config.Load()

	db := database.InitDB(cfg.DatabaseURL)
	defer db.Close()

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept"}

	r.Use(cors.New(corsConfig))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	{
		handlers.SetupUserRoutes(api, db)

		protected := api.Group("/")
		protected.Use(middleware.AuthRequired())
		{
			handlers.SetupOnboardingRoutes(protected, db)
			handlers.SetupFlexibleTaskRoutes(protected, db)
			handlers.SetupAIRoutes(protected, db, cfg)
		}

		api.DELETE("/calendar/snapshots", func(c *gin.Context) {
			_, err := db.Exec("DELETE FROM calendar_snapshots")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudieron limpiar los snapshots"})
				return
			}

			c.JSON(http.StatusOK, gin.H{"message": "Snapshots limpiados correctamente"})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = cfg.Port
		if port == "" {
			port = "8080"
		}
	}

	srv := &http.Server{
		Addr:         "0.0.0.0:" + cfg.Port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown error", "error", err)
	}

	logger.Info("server stopped")
}
