import test from "node:test";
import assert from "node:assert/strict";
import { app, response, deferred, tick } from "./helpers.js";

const event = (match = "Lakers vs Celtics") => ({
  match,
  start: new Date(Date.now() + 3600000).toISOString(),
  tournament: "League",
});

test("partial feed updates preserve alerts and read state for unloaded sports", async () => {
  const h = app();
  const n = await h.load("js/notifications.js");
  const basketball = event();
  n.syncSportsNotifications({ basketball: [basketball] }, ["basketball"]);
  n.markAllNotificationsAsRead();
  const id = n.getNotifications()[0].id;
  n.syncSportsNotifications({ football: [], cricket: [], golf: [] }, [
    "football",
    "cricket",
    "golf",
  ]);
  assert.equal(n.getNotifications()[0].id, id);
  assert.equal(n.getNotifications()[0].read, true);
  n.syncSportsNotifications({ basketball: [basketball] }, ["basketball"]);
  assert.equal(n.getNotifications()[0].read, true);
  n.syncSportsNotifications({ basketball: [] }, ["basketball"]);
  assert.equal(n.getNotifications().length, 0);
  h.close();
});

test("bad saved notification entries are ignored rather than crashing weather", async () => {
  const h = app({
    stored: {
      "skycast-notifications":
        '[null,7,{"id":"ok","type":"sports-event","read":true}]',
    },
  });
  const n = await h.load("js/notifications.js");
  assert.equal(n.getNotifications().length, 1);
  assert.equal(n.getUnreadNotificationCount(), 0);
  h.close();
});

test("all concurrent league requests settle before the full sports card is revealed", async () => {
  const pending = [deferred(), deferred(), deferred(), deferred()];
  let i = 0;
  const h = app({
    fetch: async (url) =>
      String(url).startsWith("/api/sports")
        ? response({})
        : pending[i++].promise,
  });
  const sports = await h.load("js/sports.js");
  const loaded = sports.loadSports("Mzuzu");
  await tick();
  const section = h.document.querySelector(".sports-section");
  assert.equal(i, 4);
  assert.equal(section.getAttribute("aria-busy"), "true");
  pending[0].resolve(response({ events: [event()] }));
  await tick();
  assert.equal(section.getAttribute("aria-busy"), "true");
  pending.slice(1).forEach((p) => p.resolve(response({ events: [] })));
  await loaded;
  await tick();
  assert.equal(section.getAttribute("aria-busy"), "false");
  assert.equal(section.hasAttribute("inert"), false);
  assert.equal(h.document.querySelectorAll(".sports-card").length, 1);
  h.close();
});

test("local sports failure still loads independent leagues and retains saved alerts", async () => {
  let leagueCalls = 0;
  const h = app({
    fetch: async (url) => {
      if (String(url).startsWith("/api/sports"))
        return response({ error: "Local sports unavailable" }, 502);
      leagueCalls++;
      return response({
        events: String(url).includes("basketball") ? [event()] : [],
      });
    },
  });
  const sports = await h.load("js/sports.js");
  await sports.loadSports("Mzuzu");
  assert.equal(leagueCalls, 4);
  assert.equal(
    h.document.querySelector(".sports-section").getAttribute("aria-busy"),
    "false",
  );
  assert.equal(h.document.querySelectorAll(".sports-card").length, 1);
  h.close();
});

test("superseded local sports cannot replace the newest location feed", async () => {
  const old = deferred();
  const h = app({
    fetch: async (url) => {
      if (String(url).includes("q=old")) return old.promise;
      if (String(url).startsWith("/api/sports"))
        return response({ football: [event("New City Match")] });
      return response({ events: [] });
    },
  });
  const sports = await h.load("js/sports.js");
  const first = sports.loadSports("old");
  await sports.loadSports("new");
  old.resolve(response({ football: [event("Old City Match")] }));
  await first;
  assert.match(
    h.document.getElementById("sports-container").textContent,
    /New City Match/,
  );
  assert.doesNotMatch(
    h.document.getElementById("sports-container").textContent,
    /Old City Match/,
  );
  h.close();
});

test("league completion cannot clear the loading mask while a new weather location is pending", async () => {
  const league = deferred();
  const h = app({
    fetch: async (url) =>
      String(url).startsWith("/api/sports") ? response({}) : league.promise,
  });
  const sports = await h.load("js/sports.js");
  const first = sports.loadSports("old");
  await tick();
  sports.invalidateSportsRequest();
  league.resolve(response({ events: [] }));
  await first;
  assert.equal(
    h.document.querySelector(".sports-section").getAttribute("aria-busy"),
    "true",
  );
  sports.invalidateSportsRequest(false);
  const { setSportsLoading } = await h.load("js/skeletons.js");
  setSportsLoading(false);
  assert.equal(
    h.document.querySelector(".sports-section").getAttribute("aria-busy"),
    "false",
  );
  h.close();
});
