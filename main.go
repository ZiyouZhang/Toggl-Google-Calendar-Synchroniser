package main

import (
	"os"
	"syncroniser/gcal"
	"syncroniser/toggl"
)

func main() {
	gcal.Foo()
	toggl.TimeEntries(os.Getenv("TOGGL_API_TOKEN"))
}
