package main

import (
	"context"
	"fmt"
	"log"

	"syncroniser/gcal"
	"syncroniser/toggl"
)

func main() {
	ctx := context.Background()

	srv := gcal.GetService(ctx)

	cals, err := srv.CalendarList.List().Do()
	if err != nil {
		log.Fatalf("Unable to retrieve calendars: %v", err)
	}
	fmt.Println("Calendars:")
	for _, item := range cals.Items {
		fmt.Printf("%v\n", item.Summary)
	}
	
	toggl.TimeEntries()
}
