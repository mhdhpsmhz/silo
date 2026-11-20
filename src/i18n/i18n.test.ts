import test from "node:test";
import assert from "node:assert/strict";
import en from "./resources/en";
import id from "./resources/id";

function flattenKeys(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") {
      out[path] = val;
    } else if (val && typeof val === "object") {
      Object.assign(out, flattenKeys(val as Record<string, unknown>, path));
    }
  }
  return out;
}

test("English and Indonesian translation resources have 100% key parity and non-empty values", () => {
  const enFlat = flattenKeys(en as unknown as Record<string, unknown>);
  const idFlat = flattenKeys(id as unknown as Record<string, unknown>);

  const enKeys = Object.keys(enFlat).sort();
  const idKeys = Object.keys(idFlat).sort();

  assert.deepEqual(idKeys, enKeys);

  for (const key of enKeys) {
    assert.ok(enFlat[key].trim().length > 0, `Empty EN translation for ${key}`);
    assert.ok(idFlat[key].trim().length > 0, `Empty ID translation for ${key}`);
  }
});
