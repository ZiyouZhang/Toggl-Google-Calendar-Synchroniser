package toggl

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

const (
	layoutISO    = "2006-01-02"
	authPassword = "api_token"
)

var (
	workspaceId = os.Getenv("TOGGL_WORKSPACE_ID")
	apiKey      = os.Getenv("TOGGL_API_TOKEN")
)

func TimeEntries() {
	// Get project mapping
	projectMapping := make(map[string]string)
	projects := requestData("https://api.track.toggl.com/api/v9/workspaces/" + workspaceId + "/projects")
	for _, p := range projects {
		pid := fmt.Sprint(p["id"])
		pname := fmt.Sprint(p["name"])
		projectMapping[pid] = pname
	}

	currDate := time.Now()
	entries := requestData(fmt.Sprintf("https://api.track.toggl.com/api/v9/me/time_entries?start_date=%v&end_date=%v", sub90Days(currDate).Format(layoutISO), currDate.Format(layoutISO)))
	for _, e := range entries {
		projectName := projectMapping[fmt.Sprint(e["project_id"])]
		fmt.Println(e["start"], e["stop"], e["description"], projectName)
	}
}

func sub90Days(originalTime time.Time) time.Time {
	return originalTime.AddDate(0, 0, -90)
}

func requestData(url string) []map[string]any {
	var result []map[string]any
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Print(err)
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.SetBasicAuth(apiKey, authPassword)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Print(err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Print(err)
	}
	err = json.Unmarshal([]byte(body), &result)
	if err != nil {
		log.Print(err)
	}
	return result
}

func Bar() bool {
	return false
}
