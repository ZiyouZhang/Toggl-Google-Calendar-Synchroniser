const cal_id = "<CALENDAR_ID>"
const workspace_id = "<WORKSPACE_ID>"
const anth_info = "<API_TOKEN>:api_token"
const api_url = "https://api.track.toggl.com/api/v9"
var options = {
  'headers': {
    'content-type': 'application/json',
    'Authorization': 'Basic ' + Utilities.base64Encode(anth_info)
  }
};

function addEvent() {
  var cal = CalendarApp.getCalendarById(cal_id)
  var entries = getTogglEntries()
  for (let key in entries) {
    var e = entries[key]
    cal.createEvent(e.title, e.start, e.end)
    Logger.log(Utilities.formatString(`Adding event: %s at time [%s:%s]. Event id: %s.`, e.title, e.start, e.end, e.id))
  }
}

function getLastEntryTime() {
  var cal = CalendarApp.getCalendarById(cal_id)
  var events = cal.getEvents(get90DaysBeforeToday(), new Date())
  if (events.length == 0) {
    return get90DaysBeforeTodayUnix()
  }
  events.sort(function (a, b) { // Sort events by end time
    return b.getEndTime() - a.getEndTime();
  });
  Logger.log(events[0].getEndTime())
  return Math.floor(events[0].getEndTime().getTime() / 1000)
}

function get90DaysBeforeTodayUnix() {
  var now = new Date();
  var nintyDaysBeforeToday = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return Math.floor(nintyDaysBeforeToday.getTime() / 1000);
}

function get90DaysBeforeToday() {
  var today = new Date();
  var daysInMillis = 90 * 24 * 60 * 60 * 1000;
  return new Date(today.getTime() - daysInMillis);
}

function getTogglProjectMapping() {
  var mapping = {}
  var response = UrlFetchApp.fetch(`${api_url}/workspaces/${workspace_id}/projects`, options)
  var projects = JSON.parse(response);
  for (var p of projects) {
    mapping[p["id"]] = p["name"]
  }
  return mapping
}

function getTogglEntries() {
  var mapping = getTogglProjectMapping()
  var lastEntryTime = getLastEntryTime()
  var arg = Utilities.formatString("since=%s", lastEntryTime)
  Logger.log("Getting all entries after " + Utilities.formatDate(new Date(lastEntryTime * 1000), Session.getTimeZone(), 'yyyy-MM-dd HH:mm:ss'))
  var response = UrlFetchApp.fetch(`${api_url}/me/time_entries?${arg}`, options)
  var entries = JSON.parse(response)
  var togglEntries = {}
  for (e of entries) {
    if (e.server_deleted_at) { // Skip if it is deleted.
      continue
    }
    var startTime = new Date(e.start)
    if (e.stop && Math.floor(startTime.getTime() / 1000) > lastEntryTime) {
      togglEntries[e.id] = {
        "id": e.id,
        "title": Utilities.formatString("%s: %s", mapping[e.project_id], e.description),
        "start": new Date(e.start),
        "end": new Date(e.stop)
      }
    }
  }
  return togglEntries
}
