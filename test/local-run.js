#!/usr/bin/env node
// Local test runner - simulates what the action does without @actions/core
// Usage: node test/local-run.js [path-to-json]

"use strict";

const fs = require("fs");
const path = require("path");
const { validate } = require("../src/validate-core");

const filePath = process.argv[2] || ".well-known/protoconsent.json";
const resolved = path.resolve(filePath);

if (!fs.existsSync(resolved)) {
  console.error("File not found: " + resolved);
  process.exit(1);
}

const raw = fs.readFileSync(resolved, "utf8");
let json;
try {
  json = JSON.parse(raw);
} catch (e) {
  console.error("Invalid JSON: " + e.message);
  process.exit(1);
}

const checks = validate(json);
const icons = { error: "X", warn: "!", pass: "V", info: "i" };
let errors = 0;
let warnings = 0;

for (const c of checks) {
  if (c.level === "error") errors++;
  if (c.level === "warn") warnings++;
  console.log("[" + icons[c.level] + "] " + c.level.toUpperCase().padEnd(5) + " " + c.msg);
}

console.log("\nResult: " + (errors > 0 ? "FAIL" : "PASS") + " (" + errors + " errors, " + warnings + " warnings)");
process.exit(errors > 0 ? 1 : 0);
