package handlers

import (
	"database/sql"
	"net/http"

	"aiyama-backend/internal/auth"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	DB *sqlx.DB
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *UserHandler) Register(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos: " + err.Error()})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno al encriptar la contraseña"})
		return
	}

	var newUserID string
	query := `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id`

	err = h.DB.QueryRow(query, req.Username, req.Email, string(hashedPassword)).Scan(&newUserID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "El usuario o correo electrónico ya está registrado"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Usuario registrado con éxito",
		"user_id": newUserID,
	})
}

func (h *UserHandler) Login(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	var user struct {
		ID           string `db:"id"`
		PasswordHash string `db:"password_hash"`
	}

	query := `SELECT id, password_hash FROM users WHERE email = $1`
	err := h.DB.Get(&user, query, req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Correo o contraseña incorrectos"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar la base de datos"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Correo o contraseña incorrectos"})
		return
	}
	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar el token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login exitoso",
		"user_id": user.ID,
		"token":   token,
	})
}

func SetupUserRoutes(rg *gin.RouterGroup, db *sqlx.DB) {
	handler := &UserHandler{DB: db}

	usersGroup := rg.Group("/users")
	{
		usersGroup.POST("/register", handler.Register)
		usersGroup.POST("/login", handler.Login)
	}
}
