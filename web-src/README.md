# Postilla Web staging

This preview is intentionally separate from the public landing page. The current landing buttons and homepage are not changed. The preview will be served under:

`https://postilla.isolabellart.it.com/web-preview/`

The repository branch builds this React/Vite client and updates only the `web-preview/` directory on `main`. It never replaces the root landing files.

## Required GitHub Actions configuration

- Add the existing Breez certificate/key as a repository Actions secret named `BREEZ_API_KEY` in **isolabellart/isolabellart.github.io**. GitHub secrets are repository-scoped; the secret in `postilla-android` is not automatically available to this repository. This workflow does not read, print or otherwise expose it in logs.
- Add a repository Actions variable named `POSTILLA_TRANSLATION_API` once the DeepL proxy has been installed on Debian and its HTTPS endpoint is known. Leave it empty for now; the translation UI will state that the service is not configured.
- The Breez key is compiled into the browser client as required by the browser SDK. It is a client credential visible to users inspecting the downloaded application bundle, not a server-side secret. The API key must never be committed to source files or printed in logs.

## Current staging limits

- NIP-29 groups are not exposed until Android group handling and the Nostrfy groups relay are completed.
- Marketplace page currently provides basic kind 30402 reading/publishing only. Android parity for interest counts, wishlist coordinate management, sold/withdrawn notices, alerts and Marketplace comments remains open.
- NIP-71 gallery currently reads direct HTTPS media for kinds 21, 22, 34235 and 34236. Full Blossom resolution, addressable revision handling and video publishing remain open.
- Spark wallet is implemented as a browser SDK flow; its mnemonic is held in memory only and is not automatically saved in browser storage. Breez SDK storage itself uses IndexedDB.
- DeepL requires the separate HTTPS proxy documented in `web-server/deepl-proxy`. The proxy source has not yet been installed on Debian.

A successful CI build does not replace manual testing on desktop and mobile browsers.
