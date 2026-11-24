# Postilla DeepL proxy

This small Node.js service is required because DeepL explicitly blocks direct calls from browser-based applications (CORS / HTTP 403).

## Environment
- PORT=8091
- CORS_ORIGINS=https://postilla.isolabellart.it.com
- No server-side DeepL key is stored: each signed-in user supplies their own key in the browser session, sent over HTTPS in the X-DeepL-API-Key header and forwarded for this request only.

## Run
Use Node 20 or newer:
`PORT=8091 CORS_ORIGINS=https://postilla.isolabellart.it.com node server.mjs`

Reverse proxy the API hostname over HTTPS to 127.0.0.1:8091. Set VITE_POSTILLA_TRANSLATION_API in the web build to the public HTTPS endpoint `/v1/deepl/translate`.

The key is never logged or persisted by this service. Add authentication/rate limiting at the edge as appropriate before production. This proxy also has an in-process per-IP rate limit and strict origin allowlist; it is a staging foundation, not a substitute for a full production security review.
