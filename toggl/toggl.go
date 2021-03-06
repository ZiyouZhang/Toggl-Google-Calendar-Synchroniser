package toggl

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

const (
	URL          = "https://api.track.toggl.com/reports/api/v2/details"
	layoutISO    = "2006-01-02"
	authPassword = "api_token"
	userAgent    = "application"
)

var (
	workspaceId = os.Getenv("TOGGL_WORKSPACE_ID")
	apiKey      = os.Getenv("TOGGL_API_TOKEN")
)

func TimeEntries() {
	today := time.Now().Format(layoutISO)
	yearAgo := time.Now().AddDate(-1, 0, 0).Format(layoutISO)
	url := fmt.Sprintf("%v?workspace_id=%v&since=%v&until=%v&user_agent=%v", URL, workspaceId, yearAgo, today, userAgent)
	fmt.Println(url)
	c := http.Client{Timeout: time.Duration(10) * time.Second}
	req, err := http.NewRequest("Get", url, nil)
	if err != nil {
		log.Printf("Error when generating request: %v", err)
	}
	fmt.Println(apiKey)
	req.SetBasicAuth(apiKey, authPassword)
	fmt.Println(req.URL)
	resp, err := c.Do(req)
	if err != nil {
		log.Printf("Error when querying url: %v", err)
	}
	defer resp.Body.Close()
	resBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Status: %d\n", resp.StatusCode)
	fmt.Printf("Body: %s\n", string(resBody))
}

func Bar() bool {
	return false
}
