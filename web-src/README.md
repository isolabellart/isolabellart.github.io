# Postilla Web — staging preview

This staging preview is deliberately separate from the public landing page. The current workflow publishes only the generated `web-preview/` directory on `main`; it does not modify the landing page or add a public Postilla button.

Preview URL: `https://postilla.isolabellart.it.com/web-preview/`

## Staging deployment

The branch `staging/postilla-web-preview-20261124` builds the React/Vite client and runs the TypeScript check and Vitest suite before publishing the preview.

Required repository configuration:

- `BREEZ_API_KEY` — GitHub Actions secret required by the browser Spark SDK. The key is embedded in the downloaded client bundle by design; it is a client credential, not a custody secret or wallet key. Do not commit it to source or logs.
- `POSTILLA_TRANSLATION_API` — GitHub Actions variable containing the HTTPS URL of the Postilla DeepL proxy. Leave it unset until the proxy has been installed on Debian and exposed through the reverse proxy. With no URL, the translation UI explains that translation is not configured.

The proxy source is in `web-server/deepl-proxy/`. It listens on loopback, validates the allowed origin, applies a request rate limit and forwards requests to DeepL without persisting the API key. **The proxy is source code only until it is installed and configured on the Debian host.** Inline translation cannot be fully tested in this preview until that service and the repository variable are configured.

## Implemented in this staging line

- Nostr identity: NIP-07, NIP-46, local mnemonic/key and watch-only login, plus encrypted NIP-49 key vault.
- Relay preferences: NIP-65 kind 10002, NIP-17 inbox list kind 10050, Blossom server list kind 10063 and Search list kind 10007. The four lists are stored and broadcast separately.
- Private messages: NIP-17 Gift Wrap receive/send. Sending is blocked unless the recipient has published kind 10050; recipient wraps are sent only to that list and require at least one relay OK. The local self-wrap is sent only to the user's own DM relays.
- Lightning: NWC connection stays in memory unless the user explicitly saves an AES-GCM encrypted copy protected by a separate passphrase. The plaintext NWC URI is not persisted.
- Spark: encrypted NIP-78 seed backup and recovery over the user's Nostr relays, aligned with the Android backup format. The mnemonic is held in memory only by the UI flow.
- Feeds: For You, Trending, Postilla, Follows and Extended; Trending subfilters for posts, images, videos and articles.
- Search: configured Search + Read relays, hashtags, note/profile identifiers and naddr coordinate lookup.
- Marketplace: NIP-99 kind 30402 listings, NIP-51 Wishlist kind 30003, seller contact shortcut, unique-author interest count, sold status, seller-only NIP-09 withdrawal and image upload to configured Blossom servers (10 MB per file).
- Video: NIP-71 discovery and display; upload/publish for horizontal kind 34235 and vertical kind 34236, using configured Blossom servers (10 MB per file).
- Articles: NIP-23 kind 30023 discovery and Markdown publication, with latest revision grouped by author + d coordinate.
- Interface: persistent English/Italian language preference for core navigation and feed labels; existing responsive layout and theme selector remain available.

## Known limits before user acceptance

- The language selector currently localizes core navigation and feed labels, not every string in every screen.
- DeepL inline translation UI is present, but the separate proxy must be deployed and `POSTILLA_TRANSLATION_API` configured before a real translation can succeed.
- NIP-23 content is preserved as Markdown text; this preview does not yet provide a full rich Markdown renderer or article editing workflow.
- Video uploads are limited to 10 MB per file by the current Blossom upload helper.
- Marketplace comments, dedicated Marketplace notifications and a complete Android-parity audit are not included in this staging change.
- Relay discovery and reaction/interest counts depend on what the configured relays actually retain and serve; CI cannot establish real-world relay coverage.
- NIP-29 groups remain deliberately out of scope until the Android and Nostrfy group-server work is ready.
- Spark wallet recovery must be checked with the same Nostr identity and real relay set used by the Android client.

## Acceptance

A green Actions run verifies source type-checking, automated tests and static build/publication. It does not prove successful login with the user's signer, external relay availability, cross-platform Spark recovery, real NWC payment, Blossom upload, DM delivery or manual browser behavior. Those require the checklist in `POSTILLA-WEB-PREVIEW-CHECKLIST.md` and a real-device/browser test.
