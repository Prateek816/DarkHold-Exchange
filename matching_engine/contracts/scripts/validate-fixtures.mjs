// Validates every schema, error-code table and fixture in contracts/. Exits non-zero on any failure.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fail = (msg) => failures.push(msg);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const listJson = (dir) => readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true });
addFormats(ajv);

// 1. every schema loads and compiles
const schemaDir = join(root, "schemas");
const validators = {};
const schemas = {};
for (const f of listJson(schemaDir)) {
  const s = readJson(join(schemaDir, f));
  schemas[f] = s;
  try {
    ajv.addSchema(s, f);
  } catch (e) {
    fail(`schema ${f}: ${e.message}`);
  }
}
for (const f of Object.keys(schemas)) {
  try {
    validators[f] = ajv.getSchema(f);
    if (!validators[f]) fail(`schema ${f}: not compiled`);
  } catch (e) {
    fail(`schema ${f}: ${e.message}`);
  }
}
const check = (schemaFile, data, label) => {
  const v = validators[schemaFile];
  if (!v) return;
  if (!v(data)) fail(`${label} violates ${schemaFile}: ${ajv.errorsText(v.errors, { dataVar: "$" })}`);
};
console.log(`schemas: ${Object.keys(schemas).length} compiled`);

// 2. error-codes.json
const codes = readJson(join(root, "error-codes.json"));
const seen = new Set();
for (const c of codes) {
  if (!c.code || typeof c.http !== "number" || !c.message) fail(`error-codes: bad entry ${JSON.stringify(c)}`);
  if (!["engine-reject", "engine-transport", "api"].includes(c.layer)) fail(`error-codes: bad layer for ${c.code}`);
  if (seen.has(c.code)) fail(`error-codes: duplicate code ${c.code}`);
  seen.add(c.code);
}
const byLayer = (l) => codes.filter((c) => c.layer === l).map((c) => c.code).sort();
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const rejectEnum = schemas["reply.command.schema.json"].properties.code.enum;
if (!sameSet(byLayer("engine-reject"), rejectEnum)) fail("error-codes engine-reject != reply.command code enum");
const transportEnum = schemas["error.envelope.schema.json"].properties.error.properties.code.enum;
if (!sameSet(byLayer("engine-transport"), transportEnum)) fail("error-codes engine-transport != error envelope code enum");
console.log(`error-codes: ${codes.length} entries`);

// 3. ids.json
const ids = readJson(join(root, "fixtures/engine/ids.json"));
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
if (new Set(Object.values(ids)).size !== Object.keys(ids).length) fail("ids.json: duplicate uuid");
for (const [k, v] of Object.entries(ids)) if (!uuidRe.test(v)) fail(`ids.json: ${k} is not a canonical lowercase uuid`);

// 4. golden scenarios
const cmdSchema = {
  SubmitOrder: "command.submit-order.schema.json",
  CancelOrder: "command.cancel-order.schema.json",
  ConfigureAsset: "command.configure-asset.schema.json",
  HaltAsset: "command.asset-status.schema.json",
  ResumeAsset: "command.asset-status.schema.json",
};
const scDir = join(root, "fixtures/engine/scenarios");
const scFiles = listJson(scDir);
if (scFiles.length !== 24) fail(`scenarios: expected 24 files, found ${scFiles.length}`);
scFiles.forEach((f, i) => {
  const want = `S${String(i + 1).padStart(2, "0")}-`;
  if (!f.startsWith(want)) fail(`scenarios: file ${f} out of sequence, expected prefix ${want}`);
});
let skeletonSteps = 0;
for (const f of scFiles) {
  const sc = readJson(join(scDir, f));
  const L = `scenario ${f}`;
  for (const k of ["name", "description", "engine_epoch", "steps"]) if (!(k in sc)) fail(`${L}: missing ${k}`);
  if (sc.engine_epoch !== "e-test0001") fail(`${L}: engine_epoch must be e-test0001`);
  if (sc.name !== f.replace(/\.json$/, "")) fail(`${L}: name must equal file name`);
  if (!Array.isArray(sc.steps) || sc.steps.length === 0) { fail(`${L}: steps must be non-empty`); continue; }
  let prevTs = 0;
  sc.steps.forEach((st, n) => {
    const SL = `${L} step ${n + 1}`;
    if (!Number.isInteger(st.ts) || st.ts < prevTs) fail(`${SL}: ts must be an integer, nondecreasing`);
    prevTs = st.ts;
    const sf = cmdSchema[st.command?.type];
    if (!sf) fail(`${SL}: unknown command type`);
    else check(sf, st.command, `${SL} command`);
    if ("expect_reply" in st) check("reply.command.schema.json", st.expect_reply, `${SL} expect_reply`);
    else skeletonSteps++;
    for (const [j, e] of (st.expect_events ?? []).entries()) check("event.envelope.schema.json", e, `${SL} event ${j + 1}`);
  });
  const first = sc.steps[0];
  const setup = { type: "ConfigureAsset", asset: "TEST-A", tick_size: 1, min_qty: 1, max_qty: 1000, collar_max_price: null, status: "ACTIVE" };
  if (first.ts !== 1000 || JSON.stringify(first.command) !== JSON.stringify(setup)) fail(`${L}: step 1 must be the standard TEST-A configure at ts 1000`);
}
console.log(`scenarios: ${scFiles.length} files, ${skeletonSteps} steps still without expectations (filled at Step 5)`);

// 5. transport error fixtures
const errDir = join(root, "fixtures/engine/errors");
const errSeen = new Set();
for (const f of listJson(errDir)) {
  const e = readJson(join(errDir, f));
  check("error.envelope.schema.json", e, `error fixture ${f}`);
  errSeen.add(e.error?.code);
}
for (const c of transportEnum) if (!errSeen.has(c)) fail(`error fixtures: missing example for ${c}`);

// 6. seeded candles (created at Step 11)
const seeded = join(root, "fixtures/market/candles.seeded.json");
if (existsSync(seeded)) check("seeded-candles.schema.json", readJson(seeded), "candles.seeded.json");
else console.log("seeded candles: not present yet (Step 11), skipped");

if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  for (const m of failures) console.error(" - " + m);
  process.exit(1);
}
console.log("\ncontracts: all checks passed");
