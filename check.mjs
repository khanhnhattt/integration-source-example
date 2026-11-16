// Local smoke and differential checks; not the authoritative FertigAI ingest validator.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import { createContext, runInContext, SourceTextModule, SyntheticModule } from "node:vm"

const read = (path) => readFile(new URL(path, import.meta.url), "utf8")
const manifest = JSON.parse(await read("integration-source.json"))
const preset = JSON.parse(await read("functions/others/set_my_string.json"))
const source = await read("functions/others/set_my_string.js")
const cases = JSON.parse(await read("tests/fixtures/cases.json"))
assert.equal(manifest.spec_version, 1)
assert.match(manifest.slug, /^[a-z][a-z0-9_]{0,15}$/)
assert.match(`${manifest.slug}_${preset.key}`, /^[a-z][a-z0-9_]{0,63}$/)
assert.equal(preset.version, 1)
assert.equal(preset.category, "others")
assert.equal(preset.icon, "standalone")
assert.equal(preset.style, "SCRIPT")
assert.equal(preset.requires_connection_slug, undefined)
assert.equal(preset.connections, undefined)
assert.deepEqual(preset.parameter_schema.parameters.map(({ key, type, required }) =>
  ({ key, type, required })), [
  { key: "json", type: "OBJECT", required: true },
  { key: "myString", type: "STRING", required: false },
])
assert.equal(preset.parameter_schema.parameters[1].ui.default_value, "")
assert.ok(Buffer.byteLength(source) <= 65_536)

const upstream = await read("tests/fixtures/upstream/Example.node.ts")
assert.equal(createHash("sha1").update(`blob ${Buffer.byteLength(upstream)}\0${upstream}`).digest("hex"),
  "fb5e019d02c9d152dca129924e796d3eac12ebca")
const normalize = (value) => JSON.parse(JSON.stringify(value))

async function native(params) {
  const context = createContext({}, { codeGeneration: { strings: false, wasm: false } })
  assert.equal(runInContext("[typeof process, typeof require, typeof fetch, typeof URL].join(',')", context),
    "undefined,undefined,undefined,undefined")
  const module = new SourceTextModule(source, { context })
  await module.link(() => { throw new Error("Runtime imports are unsupported") })
  await module.evaluate({ timeout: 1000 })
  assert.equal(Object.getPrototypeOf(module.namespace.run).constructor.name, "AsyncFunction")
  const ctx = JSON.parse(JSON.stringify({ params }))
  const result = await module.namespace.run(ctx)
  assert.equal(result.status, 200)
  assert.deepEqual(Object.keys(result).sort(), ["data", "status"])
  assert.equal(result.data, ctx.params.json, "Preserve upstream in-place JSON mutation")
  return normalize(result)
}

// Only the two imported n8n symbols are stubbed. Execute the pinned upstream body unchanged after type stripping.
const upstreamContext = createContext({})
const upstreamModule = new SourceTextModule(stripTypeScriptTypes(upstream), { context: upstreamContext })
const workflow = new SyntheticModule(["NodeConnectionTypes", "NodeOperationError"], function () {
  this.setExport("NodeConnectionTypes", { Main: "main" })
  this.setExport("NodeOperationError", class extends Error {})
}, { context: upstreamContext })
await upstreamModule.link((name) => {
  assert.equal(name, "n8n-workflow")
  return workflow
})
await upstreamModule.evaluate({ timeout: 1000 })
const node = new upstreamModule.namespace.Example()
assert.equal(node.description.version, 1)
assert.equal(node.description.properties[0].default, "")

async function original(inputs) {
  const items = inputs.map(({ json }) => ({ json: structuredClone(json) }))
  const result = await node.execute.call({
    getInputData: () => items,
    getNodeParameter: (key, index, fallback) => {
      assert.equal(key, "myString")
      return inputs[index].myString === undefined ? fallback : inputs[index].myString
    },
    continueOnFail: () => false,
  })
  assert.equal(result[0], items)
  return normalize(result[0].map(({ json }) => json))
}

for (const fixture of cases) {
  const expected = { status: 200, data: fixture.expected }
  assert.deepEqual(await native(fixture.params), expected, fixture.name)
  assert.deepEqual(await original([fixture.params]), [fixture.expected], fixture.name)
}

// Distinct resolved values in a multi-item upstream run equal separate native invocations, in caller order.
const ordered = [
  { json: { id: 1 }, myString: "first" },
  { json: { id: 2 }, myString: "second" },
]
const results = []
for (const params of ordered) results.push((await native(params)).data)
assert.deepEqual(results, await original(ordered))
assert.deepEqual(await original([]), [])

for (const json of [undefined, null, [], "text", 0, false]) {
  await assert.rejects(native({ json }), { message: "json must be a JSON object" })
}
for (const myString of [null, false, 0, {}, []]) {
  await assert.rejects(native({ json: {}, myString }), { message: "myString must be a string" })
}
console.log("Local source smoke checks passed; 6 differential fixtures, ordered per-item calls, and 11 invalid-input cases passed")
