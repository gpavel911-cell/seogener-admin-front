# Google / RU source baseline, 2026-10-12

This branch preserves the deployed source changes before NameSilo development. Runtime environment files, Compose overrides, credentials and nested checkouts are excluded. The live checkout, containers and provider settings are unchanged. Existing Google and RU safeguards remain scoped to their current workflows.

Validation: source copied with exact SHA-256 checks; only src/ and backend pom.xml included. Earlier isolated build and mock-test evidence is recorded in the hotel pipeline handoff; this snapshot alone is not a new deployment or a fresh test result.

Next: review this baseline, then implement NameSilo in a separate feature branch. Use Pull Requests for code discussion and test evidence; record exact commits and release tags for deployment and rollback. Never commit API keys or environment files.
