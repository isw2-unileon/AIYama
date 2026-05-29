package engine

import (
	"testing"

	"aiyama-backend/internal/models"
)

func TestFindFreeSlotsForDay(t *testing.T) {
	// sleep
	sleepStart := "23:00"
	sleepEnd := "07:00"

	// fixed blocks (ex. university classes)
	fixedBlocks := []models.FixedBlock{
		{
			DayOfWeek: 1,
			StartTime: "9:00",
			EndTime:   "14:00",
		},
	}

	// scheduled events (ex. flexible tasks already scheduled)
	scheduledEvents := []ScheduledEvent{
		{
			StartTime: "15:00",
			EndTime:   "16:00",
		},
	}

	taskDuration := 60 // duration of the task to schedule in minutes

	dayOfWeek := 1 // Monday

	freeSlots := FindFreeSlotsForDay(dayOfWeek, fixedBlocks, scheduledEvents, sleepStart, sleepEnd, taskDuration)

	// result:
	// hole 1 -> 07:00 - 09:00
	// hole 2 -> 14:00 - 15:00
	// hole 3 -> 16:00 - 23:00

	if len(freeSlots) != 3 {
		t.Errorf("Expected 3 free slots, got %d", len(freeSlots))
	}

	// check hole 1
	if freeSlots[0].StartTime != "07:00" || freeSlots[0].EndTime != "09:00" {
		t.Errorf("Expected first free slot to be 07:00 - 09:00, got %s - %s", freeSlots[0].StartTime, freeSlots[0].EndTime)
	}

	// check hole 2
	if freeSlots[1].StartTime != "14:00" || freeSlots[1].EndTime != "15:00" {
		t.Errorf("Expected second free slot to be 14:00 - 15:00, got %s - %s", freeSlots[1].StartTime, freeSlots[1].EndTime)
	}

	// check hole 3
	if freeSlots[2].StartTime != "16:00" || freeSlots[2].EndTime != "23:00" {
		t.Errorf("Expected third free slot to be 16:00 - 23:00, got %s - %s", freeSlots[2].StartTime, freeSlots[2].EndTime)
	}
}
