/* Checks that the in-browser engine reproduces the Python models.
   Usage:  python Interface/export_static_models.py && node Interface/tests/test_parity.js */
const fs = require("fs");
const path = require("path");
const Engine = require("../static/js/engine.js");

const models = JSON.parse(fs.readFileSync(path.join(__dirname, "../static/data/models.json"), "utf8"));
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "parity_cases.json"), "utf8"));

const TOL = 1e-6;
let failures = 0, total = 0;

for (const [name, list] of Object.entries(cases)) {
  let worst = 0, nulls = 0;
  for (const c of list) {
    total++;
    const got = Engine.predictRaw(models[name], c.inputs);
    if (c.expected === null || got === null) {
      if (c.expected !== got) { failures++; console.error(`FAIL ${name}: expected ${c.expected}, got ${got}`, c.inputs); }
      else nulls++;
      continue;
    }
    const err = Math.abs(got - c.expected);
    worst = Math.max(worst, err);
    if (err > TOL) { failures++; console.error(`FAIL ${name}: expected ${c.expected}, got ${got}`, c.inputs); }
  }
  console.log(`${name.padEnd(20)} ${list.length} cases, max |err| = ${worst.toExponential(2)}, undetermined = ${nulls}`);
}

console.log(failures ? `\n${failures}/${total} FAILED` : `\nAll ${total} cases match Python (tol ${TOL}).`);
process.exit(failures ? 1 : 0);
