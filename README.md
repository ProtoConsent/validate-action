# ProtoConsent Validate Action

<p align="center">
  <img src="https://github.com/ProtoConsent/ProtoConsent/blob/main/design/assets/logo/protoconsent_logo.png" alt="ProtoConsent logo" width="160">
</p>

<p align="center"><strong>Consent you can express, enforce and observe</strong></p>

<p align="center"><em>User-side, purpose-based consent for the web</em></p>

A GitHub Action that validates `.well-known/protoconsent.json` declaration files against the [ProtoConsent specification](https://github.com/ProtoConsent/ProtoConsent/blob/main/design/spec/protoconsent-well-known.md). See the main repo for full documentation.

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
      - uses: ProtoConsent/validate-action@v1
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

1. `protoconsent` version field (must be `"0.1"`)
2. `purposes` object with at least one known purpose
3. Per-purpose: `used` (boolean), optional `legal_basis`, `sharing`, `provider`
4. Optional `data_handling`: `storage_region` (string), `international_transfers` (boolean)
5. Optional `rights_url` (HTTPS recommended)
6. Unknown fields flagged as info
7. File size limit (50 KB)

Errors fail the workflow. Warnings appear as annotations but don't fail.

## Custom file path

```yaml
- uses: ProtoConsent/validate-action@v1
  with:
    file: "public/.well-known/protoconsent.json"
```

## Job summary

The action writes a check results table to the GitHub Actions job summary, visible in the workflow run UI.

## License

MIT
