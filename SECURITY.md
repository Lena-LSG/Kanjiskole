# Security

## Reporting

Please report vulnerabilities privately through GitHub's **Report a vulnerability** (Security → Advisories) on
this repository, not in a public issue. Expect an answer within a week.

## Scope and model

Kanjiskole stores study progress on the device (SQLite on Android, IndexedDB on the web). It has no accounts, no
server of its own, no analytics and no AI calls. Its only network traffic is the pronunciation recordings from
`media.kanjialive.com` (HTTPS, checked to be Ogg audio before they are played or cached) and, on the web, Google
Fonts. On Android it asks for no permission that needs consent.

The full review, the findings and their status, and the threat model that sync (M3) has to meet are in
[`docs/SECURITY-REVIEW.md`](docs/SECURITY-REVIEW.md).

## Supply chain

- Dependencies pinned to exact versions, at least two weeks old, installed with lifecycle scripts disabled.
- `npm run audit` fails on any advisory without an explicit, expiring exception.
- Data sources pinned by SHA-256 or SRI; parsed, never executed.
- CI actions pinned to commit SHAs; the workflow token is read-only except where a release needs to write.
