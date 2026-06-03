package repository

import (
	"context"
	"errors"

	"aiyama-backend/internal/middleware"
	"aiyama-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

// GetUserSleepTimes retrieves the user's sleep start and end times from the database.
func GetUserSleepTimes(ctx context.Context, db *sqlx.DB, userID string) (string, string, error) {
	var sleepStart, sleepEnd string
	query := `SELECT sleep_start, sleep_end FROM activity_profiles WHERE user_id = $1`
	err := db.QueryRowContext(ctx, query, userID).Scan(&sleepStart, &sleepEnd)
	return sleepStart, sleepEnd, err
}

// GetFixedBlocksByUserID retrieves the fixed blocks for a given user from the database.
func GetFixedBlocksByUserID(ctx context.Context, db *sqlx.DB, userID string) ([]models.FixedBlock, error) {
	var blocks []models.FixedBlock
	query := `SELECT id, user_id, name, day_of_week, start_time, end_time FROM fixed_blocks WHERE user_id = $1`
	err := db.SelectContext(ctx, &blocks, query, userID)
	return blocks, err
}

// insert the activity profile and fixed blocks into database
func SaveOnboarding(ctx context.Context, db *sqlx.DB, data models.OnboardingPayload) error {
	userID, ok := ctx.Value(middleware.UserIDKey).(string)
	if !ok {
		return errors.New("no se encontró el user_id en el contexto")
	}
	data.UserID = userID
	for i := range data.FixedBlocks {
		data.FixedBlocks[i].UserID = userID
	}
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	// the IDs are generated automatically by postgre
	profileQuery := `
		INSERT INTO activity_profiles (user_id, chronotype, sleep_hours_goal, sleep_start, sleep_end) 
		VALUES (:user_id, :chronotype, :sleep_hours_goal, :sleep_start, :sleep_end)
		ON CONFLICT (user_id) DO UPDATE SET 
			chronotype = EXCLUDED.chronotype,
			sleep_hours_goal = EXCLUDED.sleep_hours_goal,
			sleep_start = EXCLUDED.sleep_start,
			sleep_end = EXCLUDED.sleep_end;
	`
	_, err = tx.NamedExecContext(ctx, profileQuery, data)
	if err != nil {
		tx.Rollback()
		return err
	}

	if len(data.FixedBlocks) > 0 {
		blocksQuery := `
			INSERT INTO fixed_blocks (user_id, name, day_of_week, start_time, end_time) 
			VALUES (:user_id, :name, :day_of_week, :start_time, :end_time)
		`
		for _, block := range data.FixedBlocks {
			block.UserID = userID
			_, err = tx.NamedExecContext(ctx, blocksQuery, block)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}
	// commit the transaction only if successful
	return tx.Commit()
}
