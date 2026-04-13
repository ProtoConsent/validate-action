#!/usr/bin/env node

// ProtoConsent CLI validator
// Validates .well-known/protoconsent.json files from the command line.
//
// Usage: protoconsent-validate [file]
//   file defaults to .well-known/protoconsent.json
//
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: MIT

"use strict";

const fs = require("fs");
const path = require("path");
const { validate } = require("./validate-core");

const MAX_FILE_SIZE = 50 * 1024; // 50 KB

const ICONS = { pass: "\x1b[32m\u2713\x1b[0m", error: "\x1b[31m\u2717\x1b[0m", warn: "\x1b[33m!\x1b[0m", info: "\x1b[36mi\x1b[0m" };

const filePath = process.argv[2] || ".well-known/protoconsent.json";
const resolved = path.resolve(filePath);

if (!fs.existsSync(resolved)) {
  console.error("File not found: " + filePath);
  process.exit(1);
}

const stat = fs.statSync(resolved);
if (stat.size > MAX_FILE_SIZE) {
  console.error("File exceeds 50 KB limit (" + stat.size + " bytes).");
  process.exit(1);
}

var json;
try {
  json = JSON.parse(fs.readFileSync(resolved, "utf8"));
} catch (e) {
  console.error("Invalid JSON: " + e.message);
  process.exit(1);
}

var checks = validate(json);

var counts = { pass: 0, warn: 0, error: 0, info: 0 };
for (var i = 0; i < checks.length; i++) {
  var c = checks[i];
  counts[c.level]++;
  console.log("  " + (ICONS[c.level] || " ") + " " + c.msg);
}

console.log("\n" + counts.pass + " pass, " + counts.warn + " warn, " + counts.error + " error" + (counts.info ? ", " + counts.info + " info" : ""));

process.exit(counts.error > 0 ? 1 : 0);
