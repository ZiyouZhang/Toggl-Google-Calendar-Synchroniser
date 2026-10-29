# Toggl-Google-Calendar-Synchroniser

Import completed Toggl 2.0 activity entries into Google Calendar with Google Apps Script.

## Setup

1. Create a project at [Google Apps Script](https://script.google.com/) and paste the root [code.gs](code.gs) into its script file.
2. Replace the five placeholders at the top of the script:
   - `cal_id`: your target Google Calendar ID, as a quoted string.
   - `workspace_id`: your Toggl workspace ID, as a number without quotes.
   - `organization_id`: your Toggl organization ID, as a number without quotes.
   - `toggl_user_id`: your Toggl user ID, as a number without quotes; filtering uses strict equality.
   - `api_key`: your Toggl 2.0 API key, as a quoted string.
3. Run `previewEvents()` and grant the requested permissions to inspect the proposed imports.
4. Run `addEvent()` to import them, then add a time-driven trigger for `addEvent` at your preferred interval. Existing triggers can keep calling `addEvent`.

Keep your real IDs and API key in your private Apps Script project. Commit only placeholders.

## Behaviour

- Uses the Toggl 2.0 API at `https://focus.toggl.com/api`.
- Imports completed activity entries for the configured user, excluding deleted, planned-only, running, and zero-duration entries.
- Fetches all pages before creating events and uses a script lock to prevent overlapping imports.
- Titles events as `project: description`, with task details used as fallbacks.
- Uses the latest calendar event's end time as its cutoff, or an 89-day lookback when the calendar has no events in that window. Entries must start strictly after the cutoff, rounded to seconds.

Use a dedicated target calendar because every event in it contributes to the cutoff. This is an incremental importer: edits, deletions, and older backfilled Toggl entries are not reconciled.
