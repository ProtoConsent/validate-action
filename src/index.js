// ProtoConsent validate-action
// GitHub Action entry point
//
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: MIT

"use strict";

const fs = require("fs");
const path = require("path");
const core = require("@actions/core");
const { validate } = require("./validate-core");

const MAX_FILE_SIZE = 50 * 1024; // 50 KB

async function run() {
  try {
    const filePath = core.getInput("file") || ".well-known/protoconsent.json";
    const resolved = path.resolve(filePath);

    // Check file exists
    if (!fs.existsSync(resolved)) {
      core.setFailed("File not found: " + filePath);
      return;
    }

    // Check file size
    const stat = fs.statSync(resolved);
    if (stat.size > MAX_FILE_SIZE) {
      core.setFailed("File exceeds 50 KB limit (" + stat.size + " bytes).");
      return;
    }

    // Read and parse
    const raw = fs.readFileSync(resolved, "utf8");
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      core.setFailed("Invalid JSON: " + e.message);
      return;
    }

    // Validate
    const checks = validate(json);

    // Count results
    let errors = 0;
    let warnings = 0;

    // Build summary table
    const rows = [];
    for (let i = 0; i < checks.length; i++) {
      const c = checks[i];
      const icon = c.level === "error" ? ":x:" :
                   c.level === "warn" ? ":warning:" :
                   c.level === "pass" ? ":white_check_mark:" :
                   ":information_source:";
      rows.push("| " + icon + " | " + c.level.toUpperCase() + " | " + c.msg + " |");

      // Map to annotations
      if (c.level === "error") {
        errors++;
        core.error(c.msg, { file: filePath });
      } else if (c.level === "warn") {
        warnings++;
        core.warning(c.msg, { file: filePath });
      } else if (c.level === "info") {
        core.info(c.msg);
      }
    }

    // Job summary
    const result = errors > 0 ? "fail" : "pass";
    const summaryHeader = result === "pass"
      ? ":white_check_mark: **ProtoConsent validation passed**"
      : ":x: **ProtoConsent validation failed**";

    await core.summary
      .addRaw(summaryHeader + "\n\n")
      .addRaw("**File:** `" + filePath + "`\n\n")
      .addRaw("| | Level | Check |\n|---|---|---|\n")
      .addRaw(rows.join("\n") + "\n")
      .write();

    // Set outputs
    core.setOutput("result", result);
    core.setOutput("errors", String(errors));
    core.setOutput("warnings", String(warnings));

    // Fail if errors
    if (errors > 0) {
      core.setFailed(errors + " error(s) found in " + filePath);
    } else if (warnings > 0) {
      core.info("Validation passed with " + warnings + " warning(s).");
    } else {
      core.info("Validation passed. All checks green.");
    }
  } catch (err) {
    core.setFailed("Unexpected error: " + err.message);
  }
}

run();
