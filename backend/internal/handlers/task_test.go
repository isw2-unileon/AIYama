package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func setupTaskTestDB(t *testing.T) (*sqlx.DB, sqlmock.Sqlmock) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Error creating mock database: %v", err)
	}
	return sqlx.NewDb(mockDB, "sqlmock"), mock
}

func TestCreateTaskHandler_Success(t *testing.T) {
	sqlxDB, mock := setupTaskTestDB(t)
	defer sqlxDB.Close()

	gin.SetMode(gin.TestMode)
	router := gin.Default()

	api := router.Group("/api")
	SetupFlexibleTaskRoutes(api, sqlxDB)

	validJSON := []byte(`{
		"user_id": "user-123",
		"name": "Study Go",
		"duration_minutes": 60,
		"weekly_frequency": 3,
		"energy_level": "high"
	}`)

	mock.ExpectQuery(`INSERT INTO flexible_tasks`).
		WithArgs("user-123", "Study Go", 60, 3, "high").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("new-task-uuid-123"))

	req, _ := http.NewRequest(http.MethodPost, "/api/tasks/", bytes.NewBuffer(validJSON))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201 Created, but got %d. Body: %s", w.Code, w.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Database expectations were not met: %s", err)
	}
}

func TestGetTasksByUserHandler_Success(t *testing.T) {
	sqlxDB, mock := setupTaskTestDB(t)
	defer sqlxDB.Close()

	gin.SetMode(gin.TestMode)
	router := gin.Default()

	api := router.Group("/api")
	SetupFlexibleTaskRoutes(api, sqlxDB)

	rows := sqlmock.NewRows([]string{"id", "user_id", "name", "duration_minutes", "weekly_frequency", "energy_level"}).
		AddRow("task-uuid-1", "user-123", "Gym", 90, 4, "high")

	mock.ExpectQuery(`SELECT (.+) FROM flexible_tasks WHERE user_id = \$1`).
		WithArgs("user-123").
		WillReturnRows(rows)

	req, _ := http.NewRequest(http.MethodGet, "/api/tasks/user/user-123", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 OK, but got %d. Body: %s", w.Code, w.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Database expectations were not met: %s", err)
	}
}

func TestGetTaskByIDHandler_NotFound(t *testing.T) {
	sqlxDB, mock := setupTaskTestDB(t)
	defer sqlxDB.Close()

	gin.SetMode(gin.TestMode)
	router := gin.Default()

	api := router.Group("/api")
	SetupFlexibleTaskRoutes(api, sqlxDB)

	mock.ExpectQuery(`SELECT (.+) FROM flexible_tasks WHERE id = \$1`).
		WithArgs("missing-uuid").
		WillReturnRows(sqlmock.NewRows([]string{}))

	req, _ := http.NewRequest(http.MethodGet, "/api/tasks/missing-uuid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404 Not Found, but got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestDeleteTaskHandler_Success(t *testing.T) {
	sqlxDB, mock := setupTaskTestDB(t)
	defer sqlxDB.Close()

	gin.SetMode(gin.TestMode)
	router := gin.Default()

	api := router.Group("/api")
	SetupFlexibleTaskRoutes(api, sqlxDB)

	mock.ExpectExec(`DELETE FROM flexible_tasks WHERE id = \$1`).
		WithArgs("task-uuid-123").
		WillReturnResult(sqlmock.NewResult(0, 1))

	req, _ := http.NewRequest(http.MethodDelete, "/api/tasks/task-uuid-123", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 OK, but got %d. Body: %s", w.Code, w.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("Database expectations were not met: %s", err)
	}
}
