# Firebase Android clients (local only)

Variant-isolated `google-services.json` files. **Do not commit** real files (gitignored).

| Variant | Package | File |
|---------|---------|------|
| development | `com.jjoin.app.dev` | `google-services.development.json` |
| production | `com.jjoin.app` | `google-services.production.json` |

`app.config.ts` wires only the file for the active `APP_VARIANT`. Cross-fallback is forbidden.

After placing files, rebuild the **Development** Dev Client (`eas build --profile development`).
