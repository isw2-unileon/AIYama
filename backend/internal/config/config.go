package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	GinMode         string
	CORSAllowOrigin string
	DatabaseURL     string
	JWTSecret       string
}

func Load() *Config {
	_ = godotenv.Load() // Load .env file if it exists

	return &Config{
		Port:            getEnv("PORT", "8080"),
		GinMode:         getEnv("GIN_MODE", "debug"),
		CORSAllowOrigin: getEnv("CORS_ALLOW_ORIGIN", "*"),
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		JWTSecret:       getEnv("JWT_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
