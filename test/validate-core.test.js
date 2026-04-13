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
  it("passes minimal v0.2 declaration", function () {
    const checks = validate(loadFixture("valid-minimal.json"));
    assert.ok(!hasLevel(checks, "error"), "should have no errors");
    assert.ok(hasLevel(checks, "pass"), "should have passes");
  });

  it("passes full v0.2 declaration", function () {
    const checks = validate(loadFixture("valid-full.json"));
    assert.ok(!hasLevel(checks, "error"), "should have no errors");
    assert.ok(!hasLevel(checks, "warn"), "should have no warnings");
  });

  it("still accepts v0.1 declarations", function () {
    const checks = validate({
      protoconsent: "0.1",
      purposes: { functional: { used: true } },
    });
    assert.ok(!hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("0.1"); }));
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

  it("passes v0.2", function () {
    const checks = validate({ protoconsent: "0.2", purposes: { functional: { used: true } } });
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("0.2"); }));
  });
});

// --- purposes object ---

describe("purposes object", function () {
  it("errors on missing purposes", function () {
    const checks = validate({ protoconsent: "0.2" });
    assert.ok(hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.msg.includes("purposes"); }));
  });

  it("errors on purposes as array", function () {
    const checks = validate({ protoconsent: "0.2", purposes: [] });
    assert.ok(hasLevel(checks, "error"));
  });

  it("errors on no recognised purposes", function () {
    const checks = validate({ protoconsent: "0.2", purposes: { custom: { used: true } } });
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
      protoconsent: "0.2",
      purposes: { functional: { used: "yes" } },
    });
    assert.ok(hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.msg.includes("boolean"); }));
  });

  it("warns on unknown legal_basis", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, legal_basis: "custom_basis" } },
    });
    assert.ok(hasLevel(checks, "warn"));
    assert.ok(checks.some(function (c) { return c.msg.includes("custom_basis"); }));
  });

  it("warns on non-string legal_basis", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, legal_basis: 123 } },
    });
    assert.ok(hasLevel(checks, "warn"));
  });

  it("warns on unknown sharing value", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, sharing: "everyone" } },
    });
    assert.ok(hasLevel(checks, "warn"));
    assert.ok(checks.some(function (c) { return c.msg.includes("everyone"); }));
  });

  it("reports extra purpose fields as info", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, custom_field: "x" } },
    });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("custom_field"); }));
  });
});

// --- providers ---

describe("providers", function () {
  it("accepts valid providers array", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: true, providers: ["Plausible", "Matomo"] } },
    });
    assert.ok(!hasLevel(checks, "warn"));
    assert.ok(!hasLevel(checks, "error"));
  });

  it("warns on non-array providers", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: true, providers: "Plausible" } },
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("providers"); }));
  });

  it("warns on empty providers array", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: true, providers: [] } },
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("empty"); }));
  });

  it("warns on non-string entries in providers", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: true, providers: ["Plausible", 42] } },
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("strings"); }));
  });

  it("shows deprecation info for provider string", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, provider: "Self-hosted" } },
    });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("deprecated"); }));
  });

  it("warns on non-string provider", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, provider: 42 } },
    });
    assert.ok(hasLevel(checks, "warn"));
  });
});

// --- retention ---

describe("retention", function () {
  it("accepts session retention", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, retention: { type: "session" } } },
    });
    assert.ok(!hasLevel(checks, "error"));
  });

  it("accepts fixed retention with value and unit", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: true, retention: { type: "fixed", value: 30, unit: "days" } } },
    });
    assert.ok(!hasLevel(checks, "error"));
  });

  it("accepts until_withdrawal retention", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, retention: { type: "until_withdrawal" } } },
    });
    assert.ok(!hasLevel(checks, "error"));
  });

  it("errors on missing retention.type", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, retention: { value: 30, unit: "days" } } },
    });
    assert.ok(checks.some(function (c) { return c.level === "error" && c.msg.includes("retention.type"); }));
  });

  it("warns on unknown retention type", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, retention: { type: "forever" } } },
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("forever"); }));
  });

  it("errors on non-integer retention.value", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: true, retention: { type: "fixed", value: 2.5, unit: "days" } } },
    });
    assert.ok(checks.some(function (c) { return c.level === "error" && c.msg.includes("integer"); }));
  });

  it("errors on zero retention.value", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: true, retention: { type: "fixed", value: 0, unit: "days" } } },
    });
    assert.ok(checks.some(function (c) { return c.level === "error" && c.msg.includes("> 0"); }));
  });

  it("errors on invalid retention.unit", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: true, retention: { type: "fixed", value: 6, unit: "weeks" } } },
    });
    assert.ok(checks.some(function (c) { return c.level === "error" && c.msg.includes("unit"); }));
  });

  it("warns on non-object retention", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true, retention: "session" } },
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("retention"); }));
  });
});

// --- used:false with detail fields ---

describe("used:false detail fields", function () {
  it("warns when detail fields present on used:false", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: false, providers: ["x"], retention: { type: "session" } } },
    });
    assert.ok(checks.some(function (c) {
      return c.level === "warn" && c.msg.includes("false") && c.msg.includes("providers");
    }));
  });

  it("no warning on clean used:false", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { analytics: { used: false } },
    });
    assert.ok(!checks.some(function (c) {
      return c.level === "warn" && c.msg.includes("false");
    }));
  });
});

// --- Undeclared purposes ---

describe("undeclared purposes", function () {
  it("reports not-declared purposes as info", function () {
    const checks = validate({ protoconsent: "0.2", purposes: { functional: { used: true } } });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("Not declared"); }));
  });
});

// --- data_handling ---

describe("data_handling", function () {
  it("warns on non-object data_handling", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      data_handling: "not an object",
    });
    assert.ok(hasLevel(checks, "warn"));
  });

  it("passes valid storage_region", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      data_handling: { storage_region: "eu" },
    });
    assert.ok(!hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("eu"); }));
  });

  it("warns on non-string storage_region", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      data_handling: { storage_region: 123 },
    });
    assert.ok(hasLevel(checks, "warn"));
  });

  it("passes valid international_transfers", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      data_handling: { international_transfers: true },
    });
    assert.ok(!hasLevel(checks, "error"));
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("International transfers"); }));
  });

  it("warns on non-boolean international_transfers", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      data_handling: { international_transfers: "yes" },
    });
    assert.ok(hasLevel(checks, "warn"));
  });
});

// --- links ---

describe("links", function () {
  it("passes valid HTTPS links", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      links: { policy: "https://example.com/privacy", rights: "https://example.com/rights" },
    });
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("policy"); }));
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("rights"); }));
  });

  it("warns on HTTP link", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      links: { policy: "http://example.com/privacy" },
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("HTTPS"); }));
  });

  it("warns on non-URL link value", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      links: { policy: "not a url" },
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("links.policy"); }));
  });

  it("warns on non-string link value", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      links: { rights: 123 },
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("links.rights"); }));
  });

  it("warns on non-object links", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      links: "https://example.com",
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("links"); }));
  });

  it("reports extra link fields as info", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      links: { policy: "https://example.com/p", contact: "https://example.com/c" },
    });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("contact"); }));
  });
});

// --- last_updated ---

describe("last_updated", function () {
  it("passes valid date", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      last_updated: "2026-04-13",
    });
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("2026-04-13"); }));
  });

  it("warns on datetime instead of date", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      last_updated: "2026-04-13T12:00:00Z",
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("date only"); }));
  });

  it("warns on bad format", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      last_updated: "13/04/2026",
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("ISO 8601"); }));
  });

  it("warns on future date", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      last_updated: "2099-01-01",
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("future"); }));
  });

  it("info on date older than 12 months", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      last_updated: "2020-01-01",
    });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("outdated"); }));
  });

  it("warns on non-string last_updated", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      last_updated: 20260413,
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("last_updated"); }));
  });
});

// --- rights_url (deprecated) ---

describe("rights_url (deprecated)", function () {
  it("shows deprecation info", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      rights_url: "https://example.com/privacy",
    });
    assert.ok(checks.some(function (c) { return c.level === "info" && c.msg.includes("deprecated"); }));
  });

  it("still validates HTTPS URL", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      rights_url: "https://example.com/privacy",
    });
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("Rights URL"); }));
  });

  it("warns on HTTP URL", function () {
    const checks = validate({
      protoconsent: "0.2",
      purposes: { functional: { used: true } },
      rights_url: "http://example.com/privacy",
    });
    assert.ok(checks.some(function (c) { return c.level === "warn" && c.msg.includes("HTTPS"); }));
  });

  it("warns on non-string rights_url", function () {
    const checks = validate({
      protoconsent: "0.2",
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
      protoconsent: "0.2",
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
      { protoconsent: "0.2", purposes: { functional: { used: true } } },
      { contentType: "application/json" },
    );
    assert.ok(checks.some(function (c) { return c.level === "pass" && c.msg.includes("Content-Type"); }));
  });

  it("warns on wrong content-type", function () {
    const checks = validate(
      { protoconsent: "0.2", purposes: { functional: { used: true } } },
      { contentType: "text/html" },
    );
    assert.ok(hasLevel(checks, "warn"));
    assert.ok(checks.some(function (c) { return c.msg.includes("text/html"); }));
  });
});
