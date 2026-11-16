# Example node conversion report

## Revisions and contracts

- Inspected on 2026-11-16; no publication or installation performed.
- Requested upstream: https://github.com/n8n-io/n8n-nodes-starter/tree/master/nodes/Example
- Upstream commit: `6240cb49c06c41b6bc0b2c4c6fc28924ad3a4fbd`, confirmed against GitHub `master` on the inspection date.
- Behavior version: `Example.description.version = 1`; node metadata reports `nodeVersion: "1.0"`.
- Implementation: `nodes/Example/Example.node.ts`, Git blob `fb5e019d02c9d152dca129924e796d3eac12ebca`. The fixture check verifies this blob hash.
- License: upstream's MIT-style license, copyright 2022 n8n; retained in `LICENSE.n8n.md`. No icons copied.
- Complete maintained example: https://github.com/fertigai/example-connection-source at `3b204562915405583680985dff3caf23986a0d32`. Local checkout `/Users/khanhhoang/workspace/etc/example-connection-source` matches current GitHub HEAD and has no local changes. Read its entire tracked tree: README, manifest, connection, icon, function, action, and smoke check. No package or build instructions beyond its dependency-free Node check are present.
- Native runtime: script-worker `7975851d578bbe82759667d1e40a97e8317bb5b7`, clean checkout at `/Users/khanhhoang/workspace/local_dev/workspace/script-worker`. `runner.rs::run_inner` evaluates an ES module and invokes async `run(ctx)`; `worker.rs::build_ctx_json` injects resolved `params`. Generated code uses ordinary ECMAScript only and makes no host calls.
- Native source/invocation contract: AMP `38b172c8012131fc8a794acf82e5d656bf249c7f`, clean checkout at `/Users/khanhhoang/workspace/local_dev/workspace/agent-management-platform`. The checkout advanced from `a46e76f9649533e7d813635c359a3ee6f97824c3` during inspection. A targeted diff found only HTTP JSON serialization changes in `handlers/invoke.rs`; the inspected source schema, parameter handling, and script return contract were unchanged.
- Contract evidence: AMP `integration_sources/{manifest,validate}.rs`, `integrations_function_catalogue.rs`, `parameters/{merge,validate}.rs`, `handlers/invoke.rs`, `services/script_validator.rs`, and the built-in `others/now_iso` preset. Connectionless SCRIPT presets are accepted, `others` and `standalone` are existing category/icon values, OBJECT values retain undeclared fields, absent optional LLM arguments remain omitted, and function results require `{status: integer 100..599, data: JSON}`.

The maintained example's browser-style fetch methods, raw provider returns, and OAuth restriction are not runtime authority. This operation needs neither HTTP nor authentication; it follows the inspected native return contract rather than those example script assumptions.

## Mapping and approved scope

The developer explicitly selected option 1: one JSON object per invocation, with an already resolved `myString` parameter. There are no excluded API operations or auth profiles: upstream performs only this local mutation and declares no credentials, inherited node behavior, provider helper, pagination, or transport.

| Upstream behavior | Native mapping |
| --- | --- |
| Read each input item's `json` | Required OBJECT parameter `json`; one object per call |
| `getNodeParameter('myString', itemIndex, '')` | Optional STRING parameter `myString`; caller resolves item-specific values; script defaults omitted values to `""` |
| `item.json.myString = myString` | Same in-place assignment; replaces existing values and preserves other fields |
| Return `[items]` through main output port | Return `{status: 200, data: json}`; no item/port wrapper |
| Multi-item ordering | Caller invokes separately in desired order; empty input requires zero invocations |
| n8n expression evaluation and `continueOnFail` | Caller-owned orchestration under the approved one-item contract |
| `NodeOperationError`, item index, paired items, binary metadata | Not native application output; native exceptions identify invalid invocation parameters |

Generated preset: `functions/others/set_my_string.{json,js}`, local key `set_my_string`, installed key `example_set_my_string`. It is a function, not a post-call action. No connection files, lookup presets, dependencies, imports, compiler, or runtime helper files are needed. Test-only TypeScript stripping does not participate in runtime execution.

At the native input boundary, missing/null/scalar/array `json` and non-string `myString` throw explicit `TypeError` messages before mutation. No coercion, trimming, expression evaluation, retries, logging, or network calls occur. These invalid input cases are native boundary checks, not claims of equivalent n8n validation failures. Valid strings, including empty text and expression-like text, remain unchanged.

## Verification evidence

| Check | Result |
| --- | --- |
| Unmodified maintained example: `node check.mjs` | Passed: `Example source check passed` |
| Generated source: `node --experimental-vm-modules check.mjs` | Passed: source smoke checks, six differential fixtures, ordered per-item calls, and 11 invalid-input cases |
| Format smoke checks | JSON parsing, source and composed key shape, preset version/category/icon/style, no connection requirement, parameter types/default, source size, async `run` export, and no runtime imports passed. These are local checks, not authoritative validation. |
| Differential fixtures | The pinned original execute body ran after Node's built-in type stripping. Only its two imported n8n symbols and input/parameter APIs were stubbed. Compared independent expected JSON, mutation, empty/default/overwrite behavior, nested values, literal Unicode/expression text, and distinct values in item order. |
| Isolation | Every generated invocation ran in a fresh Node VM with no `process`, `require`, `fetch`, or `URL`, and imports rejected. This checks host-API leakage; it does not prove QuickJS compatibility. |
| Authoritative source validator | Not run. Its implementation was inspected; no ready-to-run offline source-ingest CLI/harness was identified. |
| Actual native runtime / AMP invocation | Not run. Runtime implementation and context/return contracts were inspected; no generated-code runtime execution was performed. |
| Live provider test | Not applicable: operation has no provider. No live FertigAI tools were called. |

Node emits experimental warnings for VM modules and TypeScript stripping. The command exits successfully. Differential evidence covers the approved JSON transformation, not n8n's expression engine, error continuation, or installed package integration.

## Setup and exact owner checks before publication

1. No credentials or OAuth setup is required. Review source name, publisher, slug availability, and immutable release version before pushing.
2. Run the target deployment's authoritative ingest validator on this complete tree with source namespace `example`. Confirm namespaced key `example_set_my_string`, category `others`, built-in icon `standalone`, standalone schema, and script validation.
3. In a disposable native test attachment, bind `json` to a Static object and `myString` to a model-supplied value. Confirm the script result `{status: 200, data: ...}`; the HTTP invocation exposes status 200 and the updated object as its JSON body. Then omit `myString` and confirm `""`, and overwrite an existing `myString`.
4. Run the six fixtures and 11 invalid-input cases through the actual native runtime. Confirm unrelated nested fields survive and no input error produces a successful partial result.
5. Verify caller-controlled separate invocations preserve resolved text and item order. Decide caller error continuation where the surrounding workflow requires it.
6. Only after these checks, the developer pushes to GitHub and submits the pinned revision through the existing admin review/install path. This artifact is locally fixture-tested, not fully verified for publication.
