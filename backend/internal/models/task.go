package models

import "time"

type FlexibleTask struct {
	ID              string     `json:"id" db:"id"`
	UserID          string     `json:"user_id" db:"user_id" binding:"required"`
	Name            string     `json:"name" db:"name" binding:"required"`
	DurationMinutes int        `json:"duration_minutes" db:"duration_minutes" binding:"required,gt=0"`
	WeeklyFrequency int        `json:"weekly_frequency" db:"weekly_frequency" binding:"required,gt=0"`
	EnergyLevel     string     `json:"energy_level" db:"energy_level" binding:"required,oneof=low medium high"`
	ScheduledAt     *time.Time `json:"scheduled_at" db:"scheduled_at"`
	ScheduledEnd    *time.Time `json:"scheduled_end" db:"scheduled_end"`
}
