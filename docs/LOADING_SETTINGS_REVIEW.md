# SkyCast: loading, settings, and forecast review

## What changed

The loading mask now covers the **whole card**, not just its weather values. Headings, icons, controls, and content stay hidden until their data is ready. This applies to current weather, all four detail cards, sun times, radar, hourly and daily forecasts, and the sports card. Initial loading starts in the HTML, before JavaScript runs. Busy cards cannot receive keyboard or pointer interaction, and the shimmer respects reduced-motion preferences.

The settings page now has clearer Appearance and Sports sections, touch-friendly theme/unit choices, readable light and dark styles, live theme previews, selected-sports counts, Select all/none, and a reset-to-defaults preview. Changes are marked unsaved across every field. Reset does not persist anything until Save is selected; save failures retain the edits.

## Bugs found and fixed

| Problem | Fix |
| --- | --- |
| Partial skeletons left labels, icons, and card edges visible. | Card-sized overlays hide all descendants, including headings and padding. |
| Starting a refresh deleted the previous hourly/daily forecast, so failure left empty cards. | Loading no longer replaces the forecast DOM. The last successful forecast remains available. |
| A failed renderer could leave loading stuck. | Weather loading always clears in a request-owned `finally` block. |
| An aborted startup could overwrite a newer search with offline data or errors. | Superseded requests are ignored; location is committed only by the current weather request. |
| Slow sports requests held weather searches open and allowed old location state to win. | Weather completes independently; sports uses its own request ownership. |
| Overlapping sports feeds could reveal the card too soon, duplicate league requests, or hide a provider failure. | Pending feeds are tracked, league requests are deduplicated, and partial failures remain visible. |
| Loading only some sports erased other sports' saved alerts and their read state. | Notification updates replace only the successfully refreshed sports. Failed/unloaded feeds are preserved. |
| The service worker returned HTML for failed API requests, breaking offline JSON handling. | Only navigation requests receive the app-shell fallback. API failures can reach the existing weather-cache recovery path. |
| Service-worker activation deleted unrelated caches. | Cleanup now deletes only older SkyCast caches; the app cache is versioned to v10 and includes the daily forecast page and its modules. |
| Corrupt favorites/cache data or blocked storage could crash startup or spoil a successful live response. | Storage is best-effort; cached weather and stored favorites/notifications are checked before use. |
| Missing/broken Leaflet could make valid weather look like a weather failure. | Radar is isolated, owns its loading state, has a bounded frame-fetch wait, and reports an unavailable/base-map state. |
| Attribute values and a city-name message were not consistently escaped. | Shared escaping handles quotes as well as markup characters; affected API/storage-derived insertions are escaped. |
| Date-only forecast parsing could display the previous weekday west of UTC. | Forecast dates are parsed as local calendar dates; provider local date/time strings use the ISO `T` separator. |
| Unsupported geolocation could leave a disabled button. | Capability detection restores the control and explains the issue. |
| API proxies accepted unsupported methods/unbounded or repeated queries and could expose raw exception details. | GET-only, bounded scalar-query validation, 10-second upstream timeouts, and sanitized upstream failures. |
| Theme previews could revert incorrectly on an OS theme change. | OS changes follow the active preview choice, not an outdated saved choice. Preferences are normalized and deduplicated. |

## Forecast navigation and expected-weather details

The Today card scrolls to the page top without leaving the current forecast, respects reduced motion, and moves keyboard focus to the current location. The next two cards open `forecast.html` for the exact date and location coordinates. The selected day shows high/low/average temperatures, rain probability and amount, maximum wind, humidity, UV, sunrise/sunset, and hourly conditions. Missing measurements say Unavailable rather than inventing zeros.

Expected-condition notifications now retain their detailed messages instead of falling back to generic text. Heat/cold amounts use the saved °C/°F choice; wind and rainfall use corresponding metric/imperial units. Rain probability is labelled Rain Likely, not Heavy Rain. The legacy internal event identity is retained so previously read rain alerts remain read. Notifications link to their own date/location, even if another location is currently loaded; expired dates receive an actionable unavailable page.

Independent reviews found and prompted fixes for notification links depending on the currently loaded city, same-name location ambiguity in destinations, incomplete accessible card names, invalid button child markup, and legacy rain read-state compatibility. Tests cover those fixes. Offline day details only use a saved forecast matching both the requested location and date; saved data is clearly labelled. The service worker caches the detail shell separately from API responses and retains query parameters in the page URL.

## Checks completed

- `npm test`: **43 tests passed**, covering weather, forecast navigation/detail rendering, units, legacy notification read state, loading, request races, storage/offline recovery, sports alerts, settings, proxies, and service-worker routing.
- JavaScript syntax checks and `git diff --check`: passed.
- `npm audit`: no known vulnerabilities reported in the installed dependency tree. This is a dependency check, not a source-code security scan.
- Browser preview: confirmed all nine weather loading targets hide their children, remain inert, and use an edge-to-edge overlay during a delayed request. Also checked loaded weather and the settings save confirmation.
- Settings layout checks at 320, 390, and 768 CSS-pixel iframe viewport widths found no horizontal overflow. Light and dark themes were visually inspected. These are browser checks, not physical-device tests.
- Daily detail layout checks at 320, 390, and 768 CSS-pixel iframe widths in light/dark themes found no horizontal overflow, with all 24 fixture hours loaded. Browser interaction checks confirmed day-two/day-three destinations, Today's completed scroll to `scrollY: 0`, and an expected-temperature notification opening its matching date and marking itself read.
- A GitHub Actions regression workflow is included for future pull requests.

Browser/API tests used local fixtures and mocked providers; they do not establish that the deployment's live API keys, quotas, provider availability, or production settings are correct.

## DeepCode review and merge recommendation

Independent source reviews were completed, including targeted follow-up review of the forecast changes. **An actual DeepCode/Snyk Code scan was not run: no scanner is connected here, no CLI scanner is installed, and no saved scanner credentials were available.** The manual reviews, dependency audit, and tests must not be described as a passing DeepCode scan or a guarantee that every bug in SkyCast has been eliminated.

No blocking code defect remained in the final independent review. The code is ready for owner review, but **keep the PR unmerged until**:

1. GitHub regression checks pass on the exact PR commit.
2. The owner verifies the deployed preview with real weather/sports providers, an invalid-place search, offline recovery after a successful load, settings persistence, and temperature/wind units.
3. The owner's required DeepCode/Snyk Code scan is run and any blocking findings are resolved.
4. The owner approves the changes.

For the required scan, enable Snyk Code on this repository/PR or use an authenticated Snyk CLI with `snyk code test` on the exact PR head; attach the scan result to the PR and fix blocking findings before merging. Do not treat the dependency-only `npm audit` result as this scan.

**Recommendation: merge after those gates pass, not automatically.** Nothing in this task merges or enables auto-merge.

## Remaining operational follow-up

The public weather/sports proxies still need deployment-level quota protection: durable rate limiting, suitable caching, and provider budget alerts. Query validation and timeouts reduce risk but do not stop repeated valid requests from consuming quota. Verify any existing platform protection before choosing an implementation; no in-memory pseudo-rate-limiter was added.

Offline radar still depends on external Leaflet/map services. The app now degrades explicitly instead of claiming weather failed; live precipitation cannot be promised without those services.
