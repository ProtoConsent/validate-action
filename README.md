# ProtoConsent Validate Action

<p align="center">
  <img src="https://github.com/ProtoConsent/ProtoConsent/blob/main/design/assets/logo/protoconsent_logo.png" alt="ProtoConsent logo" width="160">
</p>

<p align="center"><strong>Consent you can express, enforce and observe</strong></p>

<p align="center"><em>User-side, purpose-based consent for the web</em></p>

A GitHub Action that validates `.well-known/protoconsent.json` declaration files against the [ProtoConsent specification v0.2](https://github.com/ProtoConsent/ProtoConsent/blob/main/design/spec/protoconsent-well-known.md). See the main repo for full documentation.

## Usage

```yaml
# .github/workflows/validate-protoconsent.yml
name: Validate ProtoConsent declaration
on:
  push:
    paths: [".well-known/protoconsent.json"]
  pull_request:
    paths: [".well-known/protoconsent.json"]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ProtoConsent/validate-action@main
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `file` | `.well-known/protoconsent.json` | Path to the file to validate |

## Outputs

| Output | Description |
|---|---|
| `result` | `pass` or `fail` |
| `errors` | Number of errors found |
| `warnings` | Number of warnings found |

## What it checks

1. `protoconsent` version field (`"0.2"`)
2. `purposes` object with at least one known purpose
3. Per-purpose: `used` (boolean), optional `legal_basis`, `sharing`, `providers` (array), `retention` (object)
4. `retention` discriminated union: `session`, `fixed` (with `value`/`unit`), or `until_withdrawal`
5. Optional `links`: `policy`, `rights` (HTTPS recommended)
6. Optional `last_updated` (ISO 8601 date, YYYY-MM-DD)
7. Optional `data_handling`: `storage_region` (string), `international_transfers` (boolean)
8. Unknown fields flagged as info
9. File size limit (50 KB)

Errors fail the workflow. Warnings appear as annotations but don't fail.

## Custom file path

```yaml
- uses: ProtoConsent/validate-action@main
  with:
    file: "public/.well-known/protoconsent.json"
```

## Job summary

The action writes a check results table to the GitHub Actions job summary, visible in the workflow run UI.

## CLI

You can also validate files from the command line without GitHub Actions:

```bash
npx protoconsent-validate .well-known/protoconsent.json
```

Or run directly from the repository:

```bash
npx github:ProtoConsent/validate-action .well-known/protoconsent.json
```

If no file is specified, it defaults to `.well-known/protoconsent.json`.

Output example:

```
  ✓ Version: "0.2"
  ✓ 6 purpose(s) declared: functional, analytics, ads, personalization, third_parties, advanced_tracking.
  ✓ Functional: used = true
  ✓ Analytics: used = false
  ✓ Storage region: eu
  ✓ Last updated: 2026-04-13

6 pass, 0 warn, 0 error
```

Exit code is 0 if no errors, 1 if any errors are found.

## License

MIT
