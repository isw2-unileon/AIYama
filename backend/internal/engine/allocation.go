package engine

import (
	"fmt"
	"strconv"
	"strings"
)

// FreeSlot represents a time slot that is available for scheduling an event.
type FreeSlot struct {
	DayOfWeek int
	StartTime string
	EndTime   string
}

// ScheduledEvent represents an event that has been scheduled (flexible).
type ScheduledEvent struct {
	StartTime string
	EndTime   string
}

// TimeToMinutes converts a time string in "HH:MM" format to the total number of minutes since midnight. (Ej: "08:30" -> 510)
func TimeToMinutes(time string) int {
	parts := strings.Split(time, ":")
	if len(parts) != 2 {
		return 0 // Invalid time format
	}
	h, _ := strconv.Atoi(parts[0])
	m, _ := strconv.Atoi(parts[1])
	return h*60 + m
}

// MinutesToTime converts a total number of minutes since midnight back to a time string in "HH:MM" format. (Ej: 510 -> "08:30")
func MinutesToTime(minutes int) string {
	h := minutes / 60
	m := minutes % 60
	if h == 24 {
		h = 0 // Wrap around to 00:00
	}
	return fmt.Sprintf("%02d:%02d", h, m)
}

// FinfFreeSlotsForDay is the motor function that unifies the sleep, flexible and fixed events to find the free slots for a given day.
/*func FindFreeSlotsForDay(dayOfWeek int, fixedBlocks []models.FixedBlock, scheduledEvents []SheduledEvent, sleepStart string, sleepEnd string, taskDuration int) []FreeSlot {
	//por hacer
}
*/
