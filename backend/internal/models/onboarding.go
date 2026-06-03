package models

type OnboardingPayload struct {
	UserID         string       `json:"-" db:"user_id"`
	Chronotype     string       `json:"chronotype" db:"chronotype" binding:"required"`
	SleepHoursGoal int          `json:"sleep_hours_goal" db:"sleep_hours_goal" binding:"required"`
	SleepStart     string       `json:"sleep_start" db:"sleep_start" binding:"required"`
	SleepEnd       string       `json:"sleep_end" db:"sleep_end" binding:"required"`
	FixedBlocks    []FixedBlock `json:"fixed_blocks"`
}

type FixedBlock struct {
	UserID    string `json:"-" db:"user_id"`
	Name      string `json:"name" db:"name" binding:"required"`
	DayOfWeek int    `json:"day_of_week" db:"day_of_week" binding:"required"`
	StartTime string `json:"start_time" db:"start_time" binding:"required"`
	EndTime   string `json:"end_time" db:"end_time" binding:"required"`
}
