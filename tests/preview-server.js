// Test-only preview. Never used by the deployed app or by the production API.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { weather, root } from "./helpers.js";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".json": "application/json",
  ".ico": "image/x-icon",
};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const delay = url.searchParams.get("q") === "slow" ? 15000 : 800;
    await new Promise((done) => setTimeout(done, delay));
    const data =
      url.pathname === "/api/weather"
        ? weather(
            url.searchParams.get("q") === "slow"
              ? "Mzuzu"
              : url.searchParams.get("q") || "Mzuzu",
          )
        : url.pathname === "/api/leagues"
          ? { events: [] }
          : {
              football: [
                {
                  match: "Arsenal vs Chelsea",
                  tournament: "Premier League",
                  start: new Date(Date.now() + 7200000).toISOString(),
                  stadium: "Test venue",
                  country: "England",
                },
              ],
            };
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    return res.end(JSON.stringify(data));
  }
  const path = resolve(
    root,
    "." +
      (url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname)),
  );
  if (
    !path.startsWith(root + "/") ||
    url.pathname.split("/").some((part) => part.startsWith("."))
  ) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const data = await readFile(path);
    res.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(4173, "0.0.0.0", () =>
  process.stdout.write("Fixture preview ready on port 4173\n"),
);
