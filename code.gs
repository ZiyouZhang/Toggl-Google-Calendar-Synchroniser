// Toggl 2.0 -> Google Calendar. Existing triggers can continue calling addEvent().
const cal_id = '<CALENDAR_ID>';
const workspace_id = '<WORKSPACE_ID>';
const organization_id = '<ORGANIZATION_ID>';
const toggl_user_id = '<TOGGL_USER_ID>';
const api_key = '<API_KEY>';
const api_url = 'https://focus.toggl.com/api';
const workspace_path = `/organizations/${organization_id}/workspaces/${workspace_id}`;

function addEvent() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const cal = getCalendar();
    // Fetch every page before writing any events.
    const entries = Object.values(getTogglEntries());
    entries.sort((a, b) => a.end - b.end || a.start - b.start);
    for (const e of entries) {
      const event = cal.createEvent(e.title, e.start, e.end);
      Logger.log(`Adding event: ${e.title} [${e.start.toISOString()} - ${e.end.toISOString()}]. Toggl ID: ${e.id}; Calendar ID: ${event.getId()}`);
    }
    Logger.log(`Added ${entries.length} events.`);
  } finally {
    lock.releaseLock();
  }
}

// Optional: inspect the proposed imports without creating calendar events.
function previewEvents() {
  const entries = Object.values(getTogglEntries());
  for (const e of entries) {
    Logger.log(`${e.title} [${e.start.toISOString()} - ${e.end.toISOString()}]; Toggl ID: ${e.id}`);
  }
  Logger.log(`Would add ${entries.length} events.`);
}

function getCalendar() {
  const cal = CalendarApp.getCalendarById(cal_id);
  if (!cal) throw new Error('Calendar not found or not accessible: ' + cal_id);
  return cal;
}

function getLastEntryTime() {
  const events = getCalendar().getEvents(get90DaysBeforeToday(), new Date());
  if (events.length === 0) return get90DaysBeforeTodayUnix();
  events.sort((a, b) => b.getEndTime() - a.getEndTime());
  Logger.log(`Last entry's time: ${events[0].getEndTime()}`);
  return Math.floor(events[0].getEndTime().getTime() / 1000);
}

function get90DaysBeforeToday() {
  // Preserve the original 89-day lookback despite the historical function name.
  return new Date(Date.now() - 89 * 24 * 60 * 60 * 1000);
}

function get90DaysBeforeTodayUnix() {
  return Math.floor(get90DaysBeforeToday().getTime() / 1000);
}

function getTogglEntries() {
  const lastEntryTime = getLastEntryTime();
  const now = new Date();
  const from = new Date(lastEntryTime * 1000);
  if (from >= now) return {};
  Logger.log('Getting entries after ' + from.toISOString());

  // 204 means no timer is running. Never import a currently running entry.
  const current = togglGet(workspace_path + '/tracking/current');
  const entries = togglGetPages(workspace_path + '/time-entries', {
    date_from: from.toISOString(),
    date_to: now.toISOString(),
    include_taskless: true,
    type: 'activity',
    order_by: 'start'
  });

  const result = {};
  for (const e of entries) {
    if (e.deleted_at || e.type !== 'activity') continue;
    if (e.toggl_user_id !== toggl_user_id) continue;
    if (current && e.id === current.id) continue;
    // Planned-only entries have planned_start/planned_duration, not actual start.
    // Missing/negative durations are not completed; zero-length events are skipped.
    if (!e.start || typeof e.duration !== 'number' || !Number.isFinite(e.duration) || e.duration <= 0) continue;

    const start = new Date(e.start);
    const end = new Date(start.getTime() + e.duration * 1000);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) continue;

    // INTENTIONAL: preserve the original strict comparison, including second rounding.
    // All entries are compared against the cutoff captured BEFORE this run's writes.
    if (Math.floor(start.getTime() / 1000) <= lastEntryTime) continue;

    const task = e.task || {};
    // Entry-level project takes precedence; use task project only when no override exists.
    const project = e.project || (e.project_id == null ? task.project : null) || {};
    const description = e.description || task.name || '';
    result[e.id] = {
      id: e.id,
      title: `${project.name || ''}: ${description}`,
      start: start,
      end: end
    };
  }
  return result;
}

function togglGetPages(path, params) {
  const all = [];
  // Bound malformed pagination; throw before any Calendar writes on failure.
  for (let page = 1; page <= 100; page++) {
    const response = togglGet(path, Object.assign({}, params, { page: page, per_page: 100 }));
    if (!response || !Array.isArray(response.data) ||
        !Number.isInteger(response.per_page) || response.per_page <= 0 || response.page !== page) {
      throw new Error('Unexpected Toggl pagination response for ' + path);
    }
    all.push(...response.data);
    if (response.data.length < response.per_page) return all;
  }
  throw new Error('Toggl pagination exceeded 100 pages; no events were imported.');
}

function togglGet(path, params) {
  const query = Object.keys(params || {}).map(key =>
    encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
  ).join('&');
  const response = UrlFetchApp.fetch(api_url + path + (query ? '?' + query : ''), {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + api_key
    },
    muteHttpExceptions: true,
    followRedirects: false
  });
  const status = response.getResponseCode();
  if (status === 204) return null;
  if (status < 200 || status >= 300) {
    throw new Error(`Toggl API ${status} for ${path}. ` +
      (status === 402 ? 'Hourly API quota exhausted; retry after it resets.' :
       status === 401 ? 'API key is invalid or revoked.' :
       'Check endpoint access and request parameters.'));
  }
  return JSON.parse(response.getContentText());
}
