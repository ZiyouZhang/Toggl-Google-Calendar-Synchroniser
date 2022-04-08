package toggl

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

const (
	URL       = "https://api.track.toggl.com/reports/api/v2/details"
	layoutISO = "2006-01-02"
)

var (
	workspace_id = os.Getenv("TOGGL_WORKSPACE_ID")
)

func TimeEntries(token string) {
	today := time.Now().Format(layoutISO)
	yearago := time.Now().AddDate(-1, 0, 0).Format(layoutISO)
	url := fmt.Sprintf("%v?workspace_id=%v&since=%v&until=%v&user_agent=api_integration", URL, workspace_id, yearago, today)
	resp, err := http.Get(url)
	if err != nil {
		log.Printf("Error when querying url: %v", err)
	}
	fmt.Print(resp)
}

func Bar() bool {
	return false
}
