# Contracts changelog

Bump rules: **patch** for docs and fixture fixes, **minor** for additive optional fields, **major** for breaking changes.
Change process: edit schema and fixtures, run `npm run validate` and `npm run generate`, bump `VERSION` and this file.
The consumer of the changed message must approve the pull request.

## 1.0.0
- Initial contracts: 14 schemas, `error-codes.json`, `fixtures/engine/ids.json`, 24 golden scenario skeletons (commands only), one fixture per transport error.
- Golden `expect_reply` / `expect_events` sections are filled in at build Step 5.
- `fixtures/market/candles.seeded.json` is added at build Step 11 (history seeder).
