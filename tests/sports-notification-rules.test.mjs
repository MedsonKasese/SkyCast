import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSportsNotifications } from "../js/sports-notification-rules.js";

test("sports alert timing only includes events inside the selected window", () => {
  const now = Date.now();
  const events = {
    football: [
      { match: "Soon FC vs City", start: new Date(now + 10 * 60 * 1000).toISOString() },
      { match: "Later FC vs United", start: new Date(now + 45 * 60 * 1000).toISOString() },
      { match: "Tomorrow FC vs Rovers", start: new Date(now + 25 * 60 * 60 * 1000).toISOString() },
      { match: "Invalid start", start: "not-a-date" },
      { match: "Missing start" },
      { match: "Already started", start: new Date(now - 1000).toISOString() },
    ],
  };

  assert.deepEqual(
    evaluateSportsNotifications(events, 15 * 60 * 1000).map((item) => item.sportsEvent.match),
    ["Soon FC vs City"],
  );
  assert.deepEqual(
    evaluateSportsNotifications(events, 60 * 60 * 1000).map((item) => item.sportsEvent.match),
    ["Soon FC vs City", "Later FC vs United"],
  );
});

test("sports alerts include sport and match details", () => {
  const event = { football: [{ match: "Arsenal vs Chelsea", start: new Date(Date.now() + 5 * 60_000).toISOString() }] };
  const [alert] = evaluateSportsNotifications(event, 15 * 60_000);
  assert.match(alert.title, /Football: Arsenal vs Chelsea/);
  assert.equal(alert.sportsEvent.sport, "football");
});
