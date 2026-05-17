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

// failing test
func TestCreateOnboardingHandler_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.Default()

	router.POST("/api/onboarding", createOnBoardingHandler(nil))

	// failing test without id_user
	invalidJSON := []byte(`{"chronotype": "morning", "sleep_hours_goal": 8}`)
	req, _ := http.NewRequest(http.MethodPost, "/api/onboarding", bytes.NewBuffer(invalidJSON))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// server must return 400 Bad request
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, but got %d", w.Code)
	}
}

// passing test
func TestCreateOnboardingHandler_Success(t *testing.T) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Error creating database mock: %v", err)
	}
	defer mockDB.Close()

	sqlxDB := sqlx.NewDb(mockDB, "sqlmock")

	gin.SetMode(gin.TestMode)
	router := gin.Default()
	router.POST("/api/onboarding", createOnBoardingHandler(sqlxDB))

	validJSON := []byte(`{
		"user_id": "user-123",
		"chronotype": "morning",
		"sleep_hours_goal": 8,
		"sleep_start": "23:00",
		"sleep_end": "07:00",
		"fixed_blocks": [
			{
				"name": "Clases",
				"day_of_week": 1,
				"start_time": "09:00",
				"end_time": "14:00"
			}
		]
	}`)

	mock.ExpectBegin()

	mock.ExpectExec(`INSERT INTO activity_profiles`).
		// we expect 5 arguments
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectExec(`INSERT INTO fixed_blocks`).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectCommit()

	req, _ := http.NewRequest(http.MethodPost, "/api/onboarding", bytes.NewBuffer(validJSON))
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
