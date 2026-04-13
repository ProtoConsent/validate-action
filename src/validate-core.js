// ProtoConsent validate-core
// Extracted from docs/assets/js/validate.js in ProtoConsent/ProtoConsent
// Keep in sync with the browser copy.
//
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: MIT

"use strict";

const KNOWN_PURPOSES = [
  "functional", "analytics", "ads",
  "personalization", "third_parties", "advanced_tracking",
];

const PURPOSE_LABELS = {
  functional: "Functional",
  analytics: "Analytics",
  ads: "Ads",
  personalization: "Personalization",
  third_parties: "Third parties",
  advanced_tracking: "Advanced tracking",
};

const KNOWN_LEGAL_BASIS = [
  "consent", "contractual", "legitimate_interest",
  "legal_obligation", "public_interest", "vital_interest",
];

const KNOWN_SHARING = ["none", "within_group", "third_parties"];

/**
 * Validate a parsed protoconsent.json object.
 * @param {object} json - The parsed JSON object.
 * @param {object} [extras] - Optional extras (e.g. { contentType: "application/json" }).
 * @returns {Array<{level: string, msg: string}>} Array of check results.
 *   level is one of: "error", "warn", "pass", "info".
 */
function validate(json, extras) {
  const checks = [];

  // 1. protoconsent field
  if (typeof json.protoconsent !== "string") {
    checks.push({ level: "error", msg: 'Missing "protoconsent" field (string required).' });
  } else if (json.protoconsent !== "0.1" && json.protoconsent !== "0.2") {
    checks.push({ level: "warn", msg: 'Version is "' + json.protoconsent + '", expected "0.1" or "0.2". Forward-compatible, but verify.' });
  } else {
    checks.push({ level: "pass", msg: 'Version: "' + json.protoconsent + '"' });
  }

  // 2. purposes object
  if (!json.purposes || typeof json.purposes !== "object" || Array.isArray(json.purposes)) {
    checks.push({ level: "error", msg: 'Missing or invalid "purposes" object.' });
    return checks;
  }

  // 3. At least one known purpose
  const declaredKeys = Object.keys(json.purposes);
  const knownKeys = declaredKeys.filter(function (k) { return KNOWN_PURPOSES.indexOf(k) !== -1; });
  const unknownKeys = declaredKeys.filter(function (k) { return KNOWN_PURPOSES.indexOf(k) === -1; });

  if (knownKeys.length === 0) {
    checks.push({ level: "error", msg: "No recognised purposes declared. Need at least one of: " + KNOWN_PURPOSES.join(", ") + "." });
    return checks;
  }
  checks.push({ level: "pass", msg: knownKeys.length + " purpose(s) declared: " + knownKeys.join(", ") + "." });

  if (unknownKeys.length > 0) {
    checks.push({ level: "info", msg: "Unknown purpose keys (ignored by extension): " + unknownKeys.join(", ") + "." });
  }

  // 4. Validate each purpose entry
  for (var i = 0; i < knownKeys.length; i++) {
    var key = knownKeys[i];
    var entry = json.purposes[key];

    if (!entry || typeof entry !== "object") {
      checks.push({ level: "error", msg: PURPOSE_LABELS[key] + ': entry is not an object.' });
      continue;
    }

    if (typeof entry.used !== "boolean") {
      checks.push({ level: "error", msg: PURPOSE_LABELS[key] + ': "used" must be a boolean.' });
      continue;
    }

    checks.push({ level: "pass", msg: PURPOSE_LABELS[key] + ": used = " + entry.used });

    if (entry.legal_basis !== undefined) {
      if (typeof entry.legal_basis !== "string") {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': "legal_basis" should be a string.' });
      } else if (KNOWN_LEGAL_BASIS.indexOf(entry.legal_basis) === -1) {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': unknown legal_basis "' + entry.legal_basis + '". Known values: ' + KNOWN_LEGAL_BASIS.join(", ") + "." });
      }
    }

    if (entry.sharing !== undefined) {
      if (typeof entry.sharing !== "string") {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': "sharing" should be a string.' });
      } else if (KNOWN_SHARING.indexOf(entry.sharing) === -1) {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': unknown sharing value "' + entry.sharing + '". Known values: ' + KNOWN_SHARING.join(", ") + "." });
      }
    }

    if (entry.provider !== undefined) {
      if (typeof entry.provider !== "string") {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': "provider" should be a string.' });
      } else {
        checks.push({ level: "info", msg: PURPOSE_LABELS[key] + ': "provider" is deprecated in v0.2. Use "providers" array instead.' });
      }
    }

    if (entry.providers !== undefined) {
      if (!Array.isArray(entry.providers)) {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': "providers" should be an array.' });
      } else if (entry.providers.length === 0) {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': "providers" is empty.' });
      } else if (!entry.providers.every(function (p) { return typeof p === "string"; })) {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': all entries in "providers" should be strings.' });
      }
    }

    if (entry.retention !== undefined) {
      if (typeof entry.retention !== "object" || Array.isArray(entry.retention)) {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': "retention" should be an object.' });
      } else {
        var rt = entry.retention;
        if (typeof rt.type !== "string") {
          checks.push({ level: "error", msg: PURPOSE_LABELS[key] + ': retention.type is required (string).' });
        } else if (["session", "fixed", "until_withdrawal"].indexOf(rt.type) === -1) {
          checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ': unknown retention type "' + rt.type + '".' });
        } else if (rt.type === "fixed") {
          if (typeof rt.value !== "number" || !Number.isInteger(rt.value)) {
            checks.push({ level: "error", msg: PURPOSE_LABELS[key] + ': retention.value must be an integer.' });
          } else if (rt.value <= 0) {
            checks.push({ level: "error", msg: PURPOSE_LABELS[key] + ': retention.value must be > 0. Use type "session" instead.' });
          }
          if (typeof rt.unit !== "string" || ["days", "months", "years"].indexOf(rt.unit) === -1) {
            checks.push({ level: "error", msg: PURPOSE_LABELS[key] + ': retention.unit must be "days", "months", or "years".' });
          }
        }
      }
    }

    if (entry.used === false) {
      var detailFields = ["legal_basis", "providers", "sharing", "retention"]
        .filter(function (f) { return entry[f] !== undefined; });
      if (detailFields.length > 0) {
        checks.push({ level: "warn", msg: PURPOSE_LABELS[key] + ": " + detailFields.join(", ") +
          ' present but "used" is false. These fields are only meaningful when used is true.' });
      }
    }

    // Extra fields in purpose entry
    var knownPurposeFields = ["used", "legal_basis", "sharing", "provider", "providers", "retention"];
    var extraPurposeFields = Object.keys(entry).filter(function (k) { return knownPurposeFields.indexOf(k) === -1; });
    if (extraPurposeFields.length > 0) {
      checks.push({ level: "info", msg: PURPOSE_LABELS[key] + ": extra fields (ignored by extension): " + extraPurposeFields.join(", ") + "." });
    }
  }

  // 5. Not declared purposes
  var notDeclared = KNOWN_PURPOSES.filter(function (k) { return knownKeys.indexOf(k) === -1; });
  if (notDeclared.length > 0) {
    checks.push({ level: "info", msg: "Not declared (no claim made): " + notDeclared.map(function (k) { return PURPOSE_LABELS[k]; }).join(", ") + "." });
  }

  // 6. data_handling
  if (json.data_handling !== undefined) {
    if (typeof json.data_handling !== "object" || Array.isArray(json.data_handling)) {
      checks.push({ level: "warn", msg: '"data_handling" should be an object.' });
    } else {
      var dh = json.data_handling;
      if (dh.storage_region !== undefined) {
        if (typeof dh.storage_region === "string") {
          checks.push({ level: "pass", msg: "Storage region: " + dh.storage_region });
        } else {
          checks.push({ level: "warn", msg: '"storage_region" should be a string.' });
        }
      }
      if (dh.international_transfers !== undefined) {
        if (typeof dh.international_transfers === "boolean") {
          checks.push({ level: "pass", msg: "International transfers: " + dh.international_transfers });
        } else {
          checks.push({ level: "warn", msg: '"international_transfers" should be a boolean.' });
        }
      }
    }
  }

  // 7. links
  if (json.links !== undefined) {
    if (typeof json.links !== "object" || Array.isArray(json.links)) {
      checks.push({ level: "warn", msg: '"links" should be an object.' });
    } else {
      var linkKeys = ["policy", "rights"];
      for (var li = 0; li < linkKeys.length; li++) {
        var lk = linkKeys[li];
        if (json.links[lk] !== undefined) {
          if (typeof json.links[lk] !== "string") {
            checks.push({ level: "warn", msg: '"links.' + lk + '" should be a string.' });
          } else if (/^https:\/\//.test(json.links[lk])) {
            checks.push({ level: "pass", msg: "Link (" + lk + "): " + json.links[lk] });
          } else if (/^http:\/\//.test(json.links[lk])) {
            checks.push({ level: "warn", msg: "Link (" + lk + ") uses http:// (HTTPS is recommended)." });
          } else {
            checks.push({ level: "warn", msg: '"links.' + lk + '" should start with https:// or http://.' });
          }
        }
      }
      var knownLinkFields = ["policy", "rights"];
      var extraLinkFields = Object.keys(json.links).filter(function (k) { return knownLinkFields.indexOf(k) === -1; });
      if (extraLinkFields.length > 0) {
        checks.push({ level: "info", msg: "Extra fields in links (ignored): " + extraLinkFields.join(", ") + "." });
      }
    }
  }

  // 8. last_updated
  if (json.last_updated !== undefined) {
    if (typeof json.last_updated !== "string") {
      checks.push({ level: "warn", msg: '"last_updated" should be a string.' });
    } else if (/T/.test(json.last_updated)) {
      checks.push({ level: "warn", msg: '"last_updated" should be date only (YYYY-MM-DD), not datetime.' });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(json.last_updated)) {
      checks.push({ level: "warn", msg: '"last_updated" should be ISO 8601 date (YYYY-MM-DD).' });
    } else {
      var updDate = new Date(json.last_updated + "T00:00:00Z");
      var now = new Date();
      if (updDate > now) {
        checks.push({ level: "warn", msg: '"last_updated" is in the future (' + json.last_updated + ').' });
      } else {
        checks.push({ level: "pass", msg: "Last updated: " + json.last_updated });
        var twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
        if (updDate < twelveMonthsAgo) {
          checks.push({ level: "info", msg: "Declaration is over 12 months old. It may be outdated." });
        }
      }
    }
  }

  // 9. rights_url (deprecated in v0.2)
  if (json.rights_url !== undefined) {
    checks.push({ level: "info", msg: '"rights_url" is deprecated in v0.2. Use "links.rights" instead.' });
    if (typeof json.rights_url !== "string") {
      checks.push({ level: "warn", msg: '"rights_url" should be a string.' });
    } else if (/^https:\/\//.test(json.rights_url)) {
      checks.push({ level: "pass", msg: "Rights URL: " + json.rights_url });
    } else if (/^http:\/\//.test(json.rights_url)) {
      checks.push({ level: "warn", msg: "Rights URL uses http:// (HTTPS is recommended)." });
    } else {
      checks.push({ level: "warn", msg: "Rights URL should start with https:// or http://." });
    }
  }

  // 10. Extra top-level fields
  var knownTopLevel = ["protoconsent", "purposes", "data_handling", "rights_url", "links", "last_updated"];
  var extraFields = Object.keys(json).filter(function (k) { return knownTopLevel.indexOf(k) === -1; });
  if (extraFields.length > 0) {
    checks.push({ level: "info", msg: "Extra top-level fields (ignored by extension): " + extraFields.join(", ") + "." });
  }

  // 11. Content-Type (only from fetch)
  if (extras && extras.contentType) {
    if (extras.contentType.indexOf("application/json") !== -1) {
      checks.push({ level: "pass", msg: "Content-Type: " + extras.contentType });
    } else {
      checks.push({ level: "warn", msg: "Content-Type is " + extras.contentType + " (should be application/json)." });
    }
  }

  return checks;
}

module.exports = {
  validate,
  KNOWN_PURPOSES,
  PURPOSE_LABELS,
  KNOWN_LEGAL_BASIS,
  KNOWN_SHARING,
};
