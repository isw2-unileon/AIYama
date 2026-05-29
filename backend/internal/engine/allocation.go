package engine

import (
	"fmt"
	"strconv"
	"strings"

	"aiyama-backend/internal/models"
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

// FindFreeSlotsForDay is the motor function that unifies the sleep, flexible and fixed events to find the free slots for a given day.
func FindFreeSlotsForDay(dayOfWeek int, fixedBlocks []models.FixedBlock, scheduledEvents []ScheduledEvent, sleepStart string, sleepEnd string, taskDuration int) []FreeSlot {
	// 1440 minutes in a day (false = free, true = occupied)
	busyMinutes := make([]bool, 1440)

	// Mark sleep time as busy
	startSleep := TimeToMinutes(sleepStart)
	endSleep := TimeToMinutes(sleepEnd)

	if startSleep > endSleep {
		// Sleep time wraps around midnight
		for i := startSleep; i < 1440; i++ {
			busyMinutes[i] = true
		}
		for i := 0; i < endSleep; i++ {
			busyMinutes[i] = true
		}
	} else { // dont wrap around midnight
		for i := startSleep; i < endSleep; i++ {
			busyMinutes[i] = true
		}
	}

	// Mark fixed blocks as busy
	for _, block := range fixedBlocks {
		if block.DayOfWeek == dayOfWeek {
			start := TimeToMinutes(block.StartTime)
			end := TimeToMinutes(block.EndTime)
			for i := start; i < end; i++ {
				busyMinutes[i] = true
			}
		}
	}

	// Mark scheduled events as busy
	for _, event := range scheduledEvents {
		start := TimeToMinutes(event.StartTime)
		end := TimeToMinutes(event.EndTime)
		for i := start; i < end; i++ {
			busyMinutes[i] = true
		}
	}

	// Find free slots
	var freeSlots []FreeSlot
	currentFreeStart := -1
	currentFreeLength := 0

	for i := 0; i < 1440; i++ {
		if !busyMinutes[i] { // free minute
			if currentFreeStart == -1 {
				currentFreeStart = i
			}
			currentFreeLength++
		} else { // occupied minute
			if currentFreeStart != -1 && currentFreeLength >= taskDuration {
				// Add the free slot to the list
				freeSlots = append(freeSlots, FreeSlot{
					DayOfWeek: dayOfWeek,
					StartTime: MinutesToTime(currentFreeStart),
					EndTime:   MinutesToTime(currentFreeStart + currentFreeLength),
				})
			}
			currentFreeStart = -1
			currentFreeLength = 0
		}
	}

	// Check if there is a free slot at the end of the day
	if currentFreeStart != -1 {
		freeSlots = append(freeSlots, FreeSlot{
			DayOfWeek: dayOfWeek,
			StartTime: MinutesToTime(currentFreeStart),
			EndTime:   MinutesToTime(currentFreeStart + currentFreeLength),
		})
	}

	return freeSlots
}
