package handlers

import (
	"database/sql"
	"net/http"

	"aiyama-backend/internal/models"
	"aiyama-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func SetupFlexibleTaskRoutes(routes *gin.RouterGroup, db *sqlx.DB) {
	tasks := routes.Group("/tasks")
	{
		tasks.POST("/", createTaskHandler(db))
		tasks.GET("/user/:user_id", getTasksByUserHandler(db))
		tasks.GET("/:id", getTaskByIDHandler(db))
		tasks.PUT("/:id", updateTaskHandler(db))
		tasks.DELETE("/:id", deleteTaskHandler(db))
	}
}

func createTaskHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var task models.FlexibleTask

		if err := c.ShouldBindJSON(&task); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data", "details": err.Error()})
			return
		}
		if err := repository.CreateFlexibleTask(c.Request.Context(), db, &task); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create flexible task", "details": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, task)
	}
}

func getTasksByUserHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("user_id")
		tasks, err := repository.GetFlexibleTasksByUserID(c.Request.Context(), db, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve tasks", "details": err.Error()})
			return
		}
		// if there are no tasks we create a empty task object
		if tasks == nil {
			tasks = []models.FlexibleTask{}
		}

		c.JSON(http.StatusOK, tasks)
	}
}

func getTaskByIDHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		tasks, err := repository.GetFlexibleTaskByID(c.Request.Context(), db, id)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve task", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, tasks)
	}
}

func updateTaskHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var tasks models.FlexibleTask

		if err := c.ShouldBindJSON(&tasks); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data", "details": err.Error()})
			return
		}
		tasks.ID = id

		if err := repository.UpdateFlexibleTask(c.Request.Context(), db, &tasks); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update flexible task", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Task updated successfully", "task": tasks})
	}
}

func deleteTaskHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := repository.DeleteFlexibleTask(c.Request.Context(), db, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete flexible task", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
	}
}
