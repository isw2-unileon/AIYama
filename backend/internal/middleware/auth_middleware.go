package middleware

import (
	"context"
	"net/http"
	"strings"

	"aiyama-backend/internal/auth"

	"github.com/gin-gonic/gin"
)

type contextKey string

const UserIDKey contextKey = "user_id"

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization token"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			c.Abort()
			return
		}

		claims, err := auth.VerifyToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}
		userID := claims["user_id"].(string)
		c.Set("user_id", userID)
		ctx := context.WithValue(c.Request.Context(), UserIDKey, userID)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}
