# SMBWeb2 Project Notes

This project is the public/client-facing SarapMagBike website.

## Phase Plan

- Phase 1 is the current static marketing website deployed for `sarapmagbike.com`.
- Phase 2 will connect this website to the existing SMBSystem backoffice web application.

## Integration Rule

SMBWeb2 must not grow its own separate business database or duplicate backoffice business logic. When dynamic features are added, they should integrate through SMBSystem's API and use SMBSystem's existing database as the source of truth.

Use this separation:

- `sarapmagbike.com`: public/client-facing website.
- SMBSystem: backoffice POS/inventory web application, API, and database.
- Future dynamic public-site features: call SMBSystem API endpoints, with appropriate security and approval rules.

Do not expose the SMBSystem database directly to the public website. All access must go through the API.
