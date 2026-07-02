# SMBWeb2 Project Notes

This project is the public/client-facing SarapMagBike website.

## Current Version

- SMBWeb2 should now be treated as one current public/client-facing website version: the API-connected version backed by SMBSystem.
- Do not default back to a separate Phase 1 static marketing site when planning, implementing, testing, or discussing SMBWeb2 work.
- Existing static files may be treated as legacy/current shell code only where useful for migration, but new behavior should assume SMBSystem API integration.

## Integration Rule

SMBWeb2 must not grow its own separate business database or duplicate backoffice business logic. When dynamic features are added, they should integrate through SMBSystem's API and use SMBSystem's existing database as the source of truth.

For every SMBWeb2 feature, first check whether the underlying SMBSystem API already supports the needed data, workflow, permission, and audit behavior. If API support does not exist, do not fake the business logic inside SMBWeb2 and do not add a separate SMBWeb2 database. Add or request the needed SMBSystem API capability instead, keeping the change additive, role-gated, audited where appropriate, and backward-compatible with the existing backoffice system.

Default branch context for SMBWeb2 is Quezon City unless the user explicitly says a different branch should be used. Public website data and SMBSystem API calls should use the Quezon City branch context by default.

## Branch Contact Details

Use these branch details consistently in SMBWeb2 copy, branch/location selectors, contact sections, and future SMBSystem-backed public data checks:

- Quezon City: 44 Mindanao Ave., Bgy. Tandang Sora, Quezon City; phone 0968.356.8251.
- Pampanga: Emcos the Strip, McArthur Hi-way, Sto. Tomas, Pampanga; phone 0939.933.3391.

Use this separation:

- `sarapmagbike.com`: public/client-facing website.
- `https://akoianhow.github.io/SMBWeb2-staging/`: SMBWeb2 staging URL. Always use this same URL when deploying or referencing SMBWeb2 staging.
- SMBSystem: backoffice POS/inventory web application, API, and database.
- Future dynamic public-site features: call SMBSystem API endpoints, with appropriate security and approval rules.

Do not expose the SMBSystem database directly to the public website. All access must go through the API.
