// backend/internal/handlers/user_handler.go
package handlers

import (
	"database/sql"
	"net/http"

	"aiyama-backend/internal/auth"
	"aiyama-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

func SetupUserRoutes(rg *gin.RouterGroup, db *sqlx.DB) {
	usersGroup := rg.Group("/users")
	{
		usersGroup.POST("/register", createRegisterHandler(db))
		usersGroup.POST("/login", createLoginHandler(db))
	}
}

func createRegisterHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RegisterRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data: " + err.Error()})
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error encrypting password"})
			return
		}

		var newUserID string
		query := `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id`

		err = db.QueryRow(query, req.Username, req.Email, string(hashedPassword)).Scan(&newUserID)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Username or email already registered"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "User successfully registered",
			"user_id": newUserID,
		})
	}
}

func createLoginHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		var user models.UserAuth

		query := `SELECT id, password_hash FROM users WHERE email = $1`
		err := db.Get(&user, query, req.Email)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		token, err := auth.GenerateToken(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Login successful",
			"user_id": user.ID,
			"token":   token,
		})
	}
}
