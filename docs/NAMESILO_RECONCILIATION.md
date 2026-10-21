# NameSilo reconciliation baseline

This branch is based on the current `develop` branch and contains only the
NameSilo-specific commits from `feat/namesilo-google`:

- `d0a408d` — NameSilo settings and registrar selection;
- `d3aa5df` — settings form layout;
- `90a96f8` — one refresh before saving credentials.

The active server frontend did not contain the NameSilo UI, so it is not a
source for this branch. The backend reconciliation branch supplies the matching
NameSilo settings and registrar API.

## Registrar workflows

- The existing domain matrix upload, availability, generation, row purchase, and bulk
  purchase UI is available for both registrars. Imports and profile filtering use
  the selected registrar. Existing callers default to `REG_RU`.
- Matrix upload multipart fields: `file`, `profileId`, optional `name`, `registrar`,
  `zone` (NameSilo defaults to `com`), and optional positive `maxPrice`. NameSilo
  prices and limits display in USD. Import DTOs return `zone`, `maxPrice`, `currency`.
- A records accept the selected IPv4 and host for either registrar. NameSilo TXT
  remains restricted to root Google verification tokens.
- NS forms allow custom servers: Reg.ru requires two; NameSilo accepts 2–13 and
  defaults to ns1/ns2/ns3.dnsowl.com. Reg.ru retains ns1/ns2.reg.ru.
- Single NS and bulk JSON requests send `nameservers: string[]`; import multipart
  sends `nameservers` as a comma-separated string. DNS import DTOs return the
  persisted nameservers, used for table display and per-row retries.
- No deployment or external registrar operations are performed by these UI changes.
