package work.papelon.todotube;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.localization.Localization;
import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException;
import org.schabi.newpipe.extractor.stream.StreamInfo;
import org.schabi.newpipe.extractor.stream.VideoStream;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

public final class Main {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String API_KEY = System.getenv("RESOLVER_API_KEY");
    private static final int CACHE_SECONDS = Math.max(10, Integer.parseInt(
            System.getenv().getOrDefault("CACHE_SECONDS", "45")));
    private static final ConcurrentHashMap<String, Cached> CACHE = new ConcurrentHashMap<>();
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private record Cached(long expiresAt, Map<String, Object> body) {}

    private Main() {}

    public static void main(String[] args) throws Exception {
        if (API_KEY == null || API_KEY.length() < 32) {
            throw new IllegalStateException("RESOLVER_API_KEY must be configured with at least 32 characters");
        }

        NewPipe.init(new JdkDownloader(), new Localization("es", "US"));

        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 64);
        server.setExecutor(Executors.newFixedThreadPool(Math.max(4,
                Runtime.getRuntime().availableProcessors())));
        server.createContext("/health", Main::health);
        server.createContext("/v1/resolve/", Main::resolve);
        server.start();
        System.out.println("TodoTube NewPipe resolver listening on :" + port);
    }

    static boolean validVideoId(String id) {
        return id != null && id.matches("[A-Za-z0-9_-]{11}");
    }

    private static void health(HttpExchange exchange) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) {
            send(exchange, 405, Map.of("ok", false, "error", "Method not allowed"));
            return;
        }
        send(exchange, 200, Map.of("ok", true, "service", "todotube-newpipe-resolver"));
    }

    private static void resolve(HttpExchange exchange) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) {
            send(exchange, 405, Map.of("error", "Method not allowed"));
            return;
        }
        if (!authorized(exchange)) {
            send(exchange, 401, Map.of("error", "Unauthorized"));
            return;
        }

        String path = exchange.getRequestURI().getPath();
        String id = path.substring("/v1/resolve/".length());
        if (!validVideoId(id) || id.contains("/")) {
            send(exchange, 400, Map.of("error", "Invalid YouTube video ID"));
            return;
        }

        Cached cached = CACHE.get(id);
        if (cached != null && cached.expiresAt() > System.currentTimeMillis()) {
            send(exchange, 200, cached.body());
            return;
        }

        try {
            Map<String, Object> result = extract(id);
            CACHE.put(id, new Cached(System.currentTimeMillis() + CACHE_SECONDS * 1000L, result));
            if (CACHE.size() > 500) {
                long now = System.currentTimeMillis();
                CACHE.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= now);
            }
            send(exchange, 200, result);
        } catch (NoPlayableStreamException exception) {
            send(exchange, 422, Map.of("error", exception.getMessage(), "code", "NO_MUXED_STREAM"));
        } catch (Exception exception) {
            // Never log stream URLs, cookies, request headers or extractor payloads.
            System.err.println("NewPipe resolution failed for " + id + ": "
                    + exception.getClass().getSimpleName());
            send(exchange, 502, Map.of(
                    "error", "NewPipe no pudo resolver un flujo reproducible para este vídeo.",
                    "code", "EXTRACTION_FAILED"
            ));
        }
    }

    private static Map<String, Object> extract(String id) throws IOException, ReCaptchaException {
        String watchUrl = "https://www.youtube.com/watch?v=" + id;
        StreamInfo info = StreamInfo.getInfo(watchUrl);

        List<VideoStream> muxed = new ArrayList<>();
        for (VideoStream stream : info.getVideoStreams()) {
            if (stream == null || stream.isVideoOnly() || !stream.isUrl()) continue;
            String content = stream.getContent();
            if (isAllowedStreamUrl(content)) muxed.add(stream);
        }
        if (muxed.isEmpty()) {
            throw new NoPlayableStreamException(
                    "NewPipe no devolvió un flujo progresivo con audio y vídeo para este ID.");
        }

        VideoStream selected = muxed.stream()
                .max(Comparator
                        .comparingInt((VideoStream stream) -> isMp4(stream) ? 1 : 0)
                        .thenComparingInt(VideoStream::getHeight)
                        .thenComparingInt(VideoStream::getBitrate))
                .orElseThrow();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("videoId", id);
        result.put("title", nullToEmpty(info.getName()));
        result.put("channel", nullToEmpty(info.getUploaderName()));
        result.put("streamUrl", selected.getContent());
        result.put("mimeType", selected.getFormat() == null
                ? "video/mp4" : selected.getFormat().getMimeType());
        result.put("resolution", nullToEmpty(selected.getResolution()));
        result.put("width", selected.getWidth());
        result.put("height", selected.getHeight());
        result.put("durationSeconds", info.getDuration());
        result.put("provider", "newpipe");
        result.put("resolvedAt", System.currentTimeMillis());
        result.put("cacheSeconds", CACHE_SECONDS);
        return result;
    }

    private static boolean isMp4(VideoStream stream) {
        return stream.getFormat() != null
                && "video/mp4".equalsIgnoreCase(stream.getFormat().getMimeType());
    }

    private static boolean isAllowedStreamUrl(String value) {
        if (value == null || value.isBlank()) return false;
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme())
                    && host != null
                    && (host.equalsIgnoreCase("googlevideo.com")
                    || host.toLowerCase().endsWith(".googlevideo.com"));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static boolean authorized(HttpExchange exchange) {
        String value = exchange.getRequestHeaders().getFirst("Authorization");
        return value != null && value.startsWith("Bearer ")
                && constantTimeEquals(API_KEY, value.substring(7));
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) return false;
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = actual.getBytes(StandardCharsets.UTF_8);
        if (a.length != b.length) return false;
        int diff = 0;
        for (int i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
        return diff == 0;
    }

    private static void send(HttpExchange exchange, int status, Map<String, ?> body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private static final class NoPlayableStreamException extends RuntimeException {
        private NoPlayableStreamException(String message) { super(message); }
    }

    private static final class JdkDownloader extends Downloader {
        @Override
        public Response execute(Request request) throws IOException, ReCaptchaException {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(request.url()))
                    .timeout(Duration.ofSeconds(25));
            request.headers().forEach((name, values) -> {
                if (name == null || values == null) return;
                String lower = name.toLowerCase();
                if (List.of("host", "connection", "content-length", "expect",
                        "upgrade", "transfer-encoding").contains(lower)) return;
                for (String value : values) {
                    try { builder.header(name, value); }
                    catch (IllegalArgumentException ignored) { /* JDK-managed or invalid header */ }
                }
            });

            byte[] data = request.dataToSend();
            HttpRequest.BodyPublisher publisher = data == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofByteArray(data);
            builder.method(request.httpMethod(), publisher);

            try {
                var response = CLIENT.send(builder.build(), BodyHandlers.ofString(StandardCharsets.UTF_8));
                Map<String, List<String>> headers = new LinkedHashMap<>(response.headers().map());
                return new Response(response.statusCode(), "", headers,
                        response.body(), response.uri().toString());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IOException("Interrupted while downloading extractor resource", exception);
            }
        }
    }
}
