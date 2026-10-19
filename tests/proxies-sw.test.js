import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import weatherHandler from "../api/weather.js";
import sportsHandler from "../api/sports.js";
import leaguesHandler from "../api/leagues.js";

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function invoke(handler, { method = "GET", query = {} } = {}) {
  const res = responseRecorder();
  await handler({ method, query }, res);
  return res;
}

function mockResponse({ ok = true, status = 200, data = {} } = {}) {
  return { ok, status, json: async () => data };
}

test("weather and sports proxies validate methods and a single bounded q string", async (t) => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.WEATHER_API_KEY;
  process.env.WEATHER_API_KEY = "test-weather-key";
  let fetchCalls = 0;
  let options;
  globalThis.fetch = async (_url, passedOptions) => {
    fetchCalls += 1;
    options = passedOptions;
    return mockResponse({ data: { ok: true } });
  };
  t.after(() => {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = oldKey;
  });

  for (const handler of [weatherHandler, sportsHandler]) {
    assert.equal(
      (await invoke(handler, { method: "POST", query: { q: "Paris" } }))
        .statusCode,
      405,
    );
    const missing = await invoke(handler);
    assert.equal(missing.statusCode, 400);
    assert.deepEqual(missing.body, { error: "Missing query parameter q" });
    for (const q of [["Paris", "London"], "   ", "x".repeat(201)]) {
      const result = await invoke(handler, { query: { q } });
      assert.equal(result.statusCode, 400);
      assert.equal(result.body.error, "Invalid query parameter q");
    }
  }

  for (const handler of [weatherHandler, sportsHandler]) {
    const result = await invoke(handler, { query: { q: "  New York  " } });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, { ok: true });
  }
  assert.equal(fetchCalls, 2);
  assert.equal(options.signal.aborted, false);
  assert.equal(options.signal.reason, undefined);
  // The timeout signal's configured duration is exercised indirectly through the handler's argument.
  assert.equal(options.signal.constructor.name, "AbortSignal");
});

test("weather and sports proxies return generic 502s for provider errors without disclosing secrets", async (t) => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.WEATHER_API_KEY;
  const secret = "secret-test-api-key";
  process.env.WEATHER_API_KEY = secret;
  t.after(() => {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = oldKey;
  });

  for (const handler of [weatherHandler, sportsHandler]) {
    globalThis.fetch = async (url) => {
      throw new Error(`request failed at ${url} with key=${secret}`);
    };
    const thrown = await invoke(handler, { query: { q: "Paris" } });
    assert.equal(thrown.statusCode, 502);
    assert.equal(
      thrown.body.error,
      handler === weatherHandler
        ? "Weather service unavailable"
        : "Sports service unavailable",
    );
    assert.equal(JSON.stringify(thrown.body).includes(secret), false);
    assert.equal(
      JSON.stringify(thrown.body).includes("api.weatherapi.com"),
      false,
    );

    globalThis.fetch = async () =>
      mockResponse({
        ok: false,
        status: 401,
        data: { error: { message: `Invalid key ${secret}` } },
      });
    const rejected = await invoke(handler, { query: { q: "Paris" } });
    assert.equal(rejected.statusCode, 502);
    assert.equal(JSON.stringify(rejected.body).includes(secret), false);
  }

  delete process.env.WEATHER_API_KEY;
  globalThis.fetch = async () =>
    assert.fail("fetch must not run without configuration");
  const unconfigured = await invoke(weatherHandler, { query: { q: "Paris" } });
  assert.equal(unconfigured.statusCode, 500);
  assert.equal(unconfigured.body.error, "WEATHER_API_KEY is not configured");
});

test("league proxy accepts only GET and supported scalar league keys and hides upstream failures", async (t) => {
  const oldFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = oldFetch;
  });
  globalThis.fetch = async () => mockResponse({ data: { events: [] } });

  assert.equal(
    (
      await invoke(leaguesHandler, {
        method: "POST",
        query: { league: "basketball" },
      })
    ).statusCode,
    405,
  );
  for (const league of [undefined, ["basketball"], "not-a-league"]) {
    const result = await invoke(leaguesHandler, {
      query: league === undefined ? {} : { league },
    });
    assert.equal(result.statusCode, 400);
    assert.equal(result.body.error, "Unsupported league");
  }
  const valid = await invoke(leaguesHandler, {
    query: { league: "basketball" },
  });
  assert.equal(valid.statusCode, 200);
  assert.deepEqual(valid.body, { league: "NBA", events: [] });

  globalThis.fetch = async () => {
    throw new Error("upstream URL with private token");
  };
  const failed = await invoke(leaguesHandler, {
    query: { league: "basketball" },
  });
  assert.equal(failed.statusCode, 502);
  assert.deepEqual(failed.body, { error: "League schedule is unavailable" });
});

test("service worker scopes requests, uses navigation-only fallback, and cleans only SkyCast caches", async () => {
  const listeners = new Map();
  const cacheEntries = new Map([["/index.html", { offline: "shell" }]]);
  const cache = {
    addAll: async (files) => {
      cache.addedFiles = files;
    },
    match: async (request) => {
      const key =
        typeof request === "string"
          ? request
          : new URL(request.url).pathname + new URL(request.url).search;
      return cacheEntries.get(key);
    },
  };
  const deleted = [];
  const caches = {
    open: async (name) => {
      caches.opened = name;
      return cache;
    },
    keys: async () => ["skycast-v8", "skycast-v9", "unrelated-cache"],
    delete: async (key) => {
      deleted.push(key);
      return true;
    },
  };
  const networkCalls = [];
  const context = {
    URL,
    self: {
      location: { origin: "https://skycast.example" },
      addEventListener: (name, callback) => listeners.set(name, callback),
    },
    caches,
    fetch: async (request) => {
      networkCalls.push(request);
      throw new Error("offline");
    },
  };
  vm.runInNewContext(
    await (
      await import("node:fs/promises")
    ).readFile(new URL("../sw.js", import.meta.url), "utf8"),
    context,
  );

  let pending;
  listeners.get("install")({
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
  assert.equal(caches.opened, "skycast-v9");
  assert.ok(cache.addedFiles.includes("/js/storage.js"));

  listeners.get("activate")({
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
  assert.deepEqual(deleted, ["skycast-v8"]);

  const dispatchFetch = (request) => {
    let intercepted = false;
    let result;
    listeners.get("fetch")({
      request,
      respondWith: (promise) => {
        intercepted = true;
        result = promise;
      },
    });
    return { intercepted, result };
  };

  assert.equal(
    dispatchFetch({
      url: "https://elsewhere.example/data",
      method: "GET",
      mode: "cors",
    }).intercepted,
    false,
  );
  assert.equal(
    dispatchFetch({
      url: "https://skycast.example/api/weather?q=Paris",
      method: "POST",
      mode: "cors",
    }).intercepted,
    false,
  );

  const navigation = dispatchFetch({
    url: "https://skycast.example/page",
    method: "GET",
    mode: "navigate",
  });
  assert.equal(navigation.intercepted, true);
  assert.deepEqual(await navigation.result, { offline: "shell" });

  const api = dispatchFetch({
    url: "https://skycast.example/api/weather?q=Paris",
    method: "GET",
    mode: "cors",
  });
  assert.equal(api.intercepted, true);
  await assert.rejects(api.result, /offline/);
  assert.equal(networkCalls.length, 2);
});
