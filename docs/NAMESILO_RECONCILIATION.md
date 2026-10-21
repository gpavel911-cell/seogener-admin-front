# NameSilo reconciliation baseline

This branch is based on the current `develop` branch and contains only the
NameSilo-specific commits from `feat/namesilo-google`:

- `d0a408d` — NameSilo settings and registrar selection;
- `d3aa5df` — settings form layout;
- `90a96f8` — one refresh before saving credentials.

The active server frontend did not contain the NameSilo UI, so it is not a
source for this branch. The backend reconciliation branch supplies the matching
NameSilo settings and registrar API.
