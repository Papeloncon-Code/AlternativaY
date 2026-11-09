# TodoTube NewPipe Resolver

Small Java 17 service that runs NewPipe Extractor outside the Cloudflare Workers runtime. It resolves one YouTube video ID into a browser-consumable progressive stream URL; the TodoTube web player owns playback controls.

## Run locally

Set a random API key of at least 32 characters:

```bash
export RESOLVER_API_KEY='replace-with-a-long-random-secret'
gradle clean test shadowJar
java -jar build/libs/todotube-newpipe-resolver-0.1.0-all.jar
```

The service listens on `PORT` (8080 by default). Check `GET /health`, then call:

```bash
curl -H "Authorization: Bearer $RESOLVER_API_KEY" \
  http://localhost:8080/v1/resolve/dQw4w9WgXcQ
```

Build a container with `docker build -t todotube-newpipe-resolver .`. Configure the service with `RESOLVER_API_KEY` and `PORT`.

## Connect Cloudflare

Set `NEWPIPE_RESOLVER_URL` on the TodoTube web Worker to the service's HTTPS base URL and set the Worker secret `NEWPIPE_RESOLVER_TOKEN` to the exact same key. The browser calls only TodoTube's same-origin `/api/youtube/resolve/:id`; the shared key never reaches the browser.

The resolver intentionally returns only direct, progressive streams that include audio and video in one file. It does not claim DASH adaptive quality or live-stream support. If the extractor returns no compatible muxed stream, the endpoint returns `422 NO_MUXED_STREAM` rather than handing the player a silent video-only track.

The extracted stream URL is temporary and must not be persisted or logged. The service caches a successful resolution briefly to avoid resolving the same ID on every player render.
