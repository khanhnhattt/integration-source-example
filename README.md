# Example Node integration source

One standalone function converts the n8n starter Example node's JSON mutation into a native invocation. No account, connection, OAuth, network request, package installation, or build step is needed.

- Source: `example`, version `1.0.0`, spec version `1`.
- Local preset: `set_my_string`, version `1`.
- Namespaced preset after ingest: `example_set_my_string`.
- Category: `others`; built-in icon: `standalone`.

Attach the preset with `json` bound to an input object and `myString` bound to Static text, model-supplied text, or a supported resolved variable. Omit `myString` to use `""`. The script supplies this default even when the UI default was not applied.

Example resolved invocation context:

```json
{ "params": { "json": { "id": 7, "myString": "old" }, "myString": "new" } }
```

Result:

```json
{ "status": 200, "data": { "id": 7, "myString": "new" } }
```

The function mutates the invocation's JSON object in place, replacing `myString` and preserving other fields. It rejects a missing, null, array, or scalar `json`, and rejects non-string `myString` values. Strings remain literal, including expression-like text.

The developer selected one JSON object per call. For multiple items, resolve text separately and invoke once per item in the desired order. An empty upstream item list requires zero invocations. The caller owns expression evaluation and multi-item error continuation. n8n ports, item wrappers, binary metadata, pairing, and `NodeOperationError` context are not returned.

## Local checks

Use Node.js 22.13 or newer:

```sh
cd /Users/khanhhoang/workspace/etc/integration-sources/example
node --experimental-vm-modules check.mjs
```

The check uses isolated VM contexts, independent expected fixtures, and the pinned original node with only imported n8n symbols and input/parameter access stubbed. No n8n installation or provider calls occur. These checks do not prove native runtime execution or authoritative source ingestion.

See [CONVERSION_REPORT.md](CONVERSION_REPORT.md) for revisions, evidence, and remaining owner checks. Review publisher metadata before release. The developer must push the source to GitHub and use the existing admin review/install path; this conversion does not publish or install it.
