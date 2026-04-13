// ProtoConsent validate-action tests
// Uses Node 20 built-in test runner (node --test)
//
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: MIT

"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { validate, KNOWN_PURPOSES, KNOWN_LEGAL_BASIS, KNOWN_SHARING } = require("../src/validate-core");

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
}

function hasLevel(checks, level) {
  return checks.some(function (c) { return c.level === level; });
}

function countLevel(checks, level) {
  return checks.filter(function (c) { return c.level === level; }).length;
}

// --- Constants ---

describe("constants", function () {
  it("exports 6 known purposes", function () {
    assert.equal(KNOWN_PURPOSES.length, 6);
    assert.ok(KNOWN_PURPOSES.includes("functional"));
    assert.ok(KNOWN_PURPOSES.includes("advanced_tracking"));
  });

  it("exports 6 legal basis values", function () {
    assert.equal(KNOWN_LEGAL_BASIS.length, 6);
    assert.ok(KNOWN_LEGAL_BASIS.includes("consent"));
    assert.ok(KNOWN_LEGAL_BASIS.includes("legitimate_interest"));
  });

  it("exports 3 sharing values", function () {
    assert.equal(KNOWN_SHARING.length, 3);
    assert.ok(KNOWN_SHARING.includes("none"));
    assert.ok(KNOWN_SHARING.includes("third_parties"));
  });
});

// --- Valid files ---

describe("valid declarations", function () {
  it("passes minimal declaration", function () {
    const checks = validate(loadFixture("valid-minimal.json"));
    assert.ok(!hasLevel(checks, "error"), "should have no errors");
    assert.ok(hasLevel(checks, "pass"), "should have passes");
  });

  it("passes full declaration", function () {
    const checks = validate(loadFixture("valid-full.json"));
    assert.ok(!hasLevel(checks, "error"), "should have no errors");
    assert.ok(!hasLevel(checks, "warn"), "should have no warnings");
  });
});

// --- protoconsent field ---

describe("protoconsent field", function () {
  it("errors on missing protoconsent field", function () {
    const checks = validate(loadFixture("invalid-missing-protoconsent.json"));
    assert.ok(hasLevel(checks, "error"));
    assert.ok(checks[0].msg.includes("protoconsent"));
  });

  it("warns on unknown version", function () {
    const checks = validate({ protoconsent: "9.9", purposes: { functional: { used: true } } });
    assert.ok(hasLevel(checks, "warn"));
    assert.ok(checks.some(function (c) { return c.msg.includes("9.9"); }));
  });
});

// --- purposes object ---

describe("purposes object", function () {
  it("errors on missing purposes", function () {
    const checks = validate({ protoconsent: "0.1" });
    assert.ok(hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.msg.includes("purposes"); }));
  });

  it("errors on purposes as array", function () {
    const checks = validate({ protoconsent: "0.1", purposes: [] });
    assert.ok(hasLevel(checks, "error"));
  });

  it("errors on no recognised purposes", function () {
    const checks = validate({ protoconsent: "0.1", purposes: { custom: { used: true } } });
    assert.ok(hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.msg.includes("recognised"); }));
  });

  it("reports unknown purpose keys as info", function () {
    const checks = validate(loadFixture("warn-unknown-purpose.json"));
    assert.ok(!hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("custom_purpose"); }));
  });
});

// --- Per-purpose validation ---

describe("purpose entry validation", function () {
  it("errors on non-object entry", function () {
    const checks = validate(loadFixture("invalid-bad-purpose.json"));
    assert.ok(hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.msg.includes("not an object"); }));
  });

  it("errors on non-boolean used", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: "yes" } },
    });
    assert.ok(hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.msg.includes("boolean"); }));
  });

  it("warns on unknown legal_basis", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true, legal_basis: "custom_basis" } },
    });
    assert.ok(hasLevel(checks, "warn"));
    assert.ok(checks.some(function (c) { return c.msg.includes("custom_basis"); }));
  });

  it("warns on non-string legal_basis", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true, legal_basis: 123 } },
    });
    assert.ok(hasLevel(checks, "warn"));
  });

  it("warns on unknown sharing value", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true, sharing: "everyone" } },
    });
    assert.ok(hasLevel(checks, "warn"));
    assert.ok(checks.some(function (c) { return c.msg.includes("everyone"); }));
  });

  it("warns on non-string provider", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true, provider: 42 } },
    });
    assert.ok(hasLevel(checks, "warn"));
  });

  it("reports extra purpose fields as info", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true, custom_field: "x" } },
    });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("custom_field"); }));
  });
});

// --- Undeclared purposes ---

describe("undeclared purposes", function () {
  it("reports not-declared purposes as info", function () {
    const checks = validate({ protoconsent: "0.1", purposes: { functional: { used: true } } });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("Not declared"); }));
  });
});

// --- data_handling ---

describe("data_handling", function () {
  it("warns on non-object data_handling", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      data_handling: "not an object",
    });
    assert.ok(hasLevel(checks, "warn"));
  });

  it("passes valid storage_region", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      data_handling: { storage_region: "eu" },
    });
    assert.ok(!hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("eu"); }));
  });

  it("warns on non-string storage_region", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      data_handling: { storage_region: 123 },
    });
    assert.ok(hasLevel(checks, "warn"));
  });

  it("passes valid international_transfers", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      data_handling: { international_transfers: true },
    });
    assert.ok(!hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("International transfers"); }));
  });

  it("warns on non-boolean international_transfers", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      data_handling: { international_transfers: "yes" },
    });
    assert.ok(hasLevel(checks, "warn"));
  });
});

// --- rights_url ---

describe("rights_url", function () {
  it("passes HTTPS URL", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      rights_url: "https://example.com/privacy",
    });
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("Rights URL"); }));
  });

  it("warns on HTTP URL", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      rights_url: "http://example.com/privacy",
    });
    assert.ok(hasLevel(checks, "warn"));
    assert.ok(checks.some(function (c) { return c.msg.includes("HTTPS"); }));
  });

  it("warns on non-URL string", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      rights_url: "not a url",
    });
    assert.ok(hasLevel(checks, "warn"));
  });

  it("warns on non-string rights_url", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      rights_url: 123,
    });
    assert.ok(hasLevel(checks, "warn"));
  });
});

// --- Extra top-level fields ---

describe("extra fields", function () {
  it("reports extra top-level fields as info", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
      custom_top: "value",
    });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("custom_top"); }));
  });
});

// --- Content-Type via extras ---

describe("content-type check", function () {
  it("passes correct content-type", function () {
    const checks = validate(
      { protoconsent: "0.1", purposes: { functional: { used: true } } },
      { contentType: "application/json" },
    );
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("Content-Type"); }));
  });

  it("warns on wrong content-type", function () {
    const checks = validate(
      { protoconsent: "0.1", purposes: { functional: { used: true } } },
      { contentType: "text/html" },
    );
    assert.ok(hasLevel(checks, "warn"));
    assert.ok(checks.some(function (c) { return c.msg.includes("text/html"); }));
  });
});
