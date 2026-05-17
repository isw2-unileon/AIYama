package repository

import (
	"context"

	"alyama-backend/internal/models"

	"github.com/jmoiron/sqlx"
)

// insert the activity profile and fixed blocks into database
func SaveOnboarding(ctx context.Context, db *sqlx.DB, data models.OnboardingPayload) error {
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
			block.UserID = data.UserID
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
