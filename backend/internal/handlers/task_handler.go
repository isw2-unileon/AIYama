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
		tasks.GET("/", getTasksByUserHandler(db))
		tasks.GET("/:id", getTaskByIDHandler(db))
		tasks.PUT("/:id", updateTaskHandler(db))
		tasks.DELETE("/:id", deleteTaskHandler(db))
		tasks.POST("/undo", undoActionHandler(db))
	}
}

func createTaskHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var task models.FlexibleTask

		if err := c.ShouldBindJSON(&task); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data", "details": err.Error()})
			return
		}

		task.UserID = c.MustGet("user_id").(string)

		if err := repository.CreateFlexibleTask(c.Request.Context(), db, &task); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create flexible task", "details": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, task)
	}
}

func getTasksByUserHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.MustGet("user_id").(string)

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

		tasks.UserID = c.MustGet("user_id").(string)

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
		userID := c.MustGet("user_id").(string)

		if err := repository.CreateSnapshot(c.Request.Context(), db, userID, "DELETE_TASK"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "The snapshot couldnt be saved"})
			return
		}

		if err := repository.DeleteFlexibleTask(c.Request.Context(), db, id, userID); err != nil {
			if err.Error() == "task not found or unauthorized" {
				c.JSON(http.StatusForbidden, gin.H{"error": "The task doesnt exists or its not yours"})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete flexible task", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
	}
}

func undoActionHandler(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.MustGet("user_id").(string)

		if err := repository.UndoLastAction(c.Request.Context(), db, userID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "There are no actions or the process failed", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Action undo correctly"})
	}
}
