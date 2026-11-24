# Postilla Web — browser preview

Staging source for the Postilla browser client. Vite base path: `/web-preview/`.

The React/TypeScript base is adapted from Firewisp Web. Selected protocol and wallet references come from Wisp Web. Official Postilla vector mark and wordmark are converted from the drawable assets in the Android repository.

## Security
- Never commit API keys, wallet seed phrases, NWC URIs or private keys.
- Breez configuration will use the existing Actions secret `BREEZ_API_KEY`. Vite build-time values are embedded in the public browser bundle; this is a client-side credential and cannot be kept secret from browser users.
- Browser storage does not offer Android Keystore / EncryptedSharedPreferences protection.
- DeepL keys must be user-configured, session-scoped and excluded from source control.
- NIP-29 groups remain disabled until the Android implementation and Nostrfy groups relay are ready.

This preview is not a public release. Build success alone does not verify all Nostr integrations.
