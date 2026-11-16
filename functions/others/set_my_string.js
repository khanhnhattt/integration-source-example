export async function run(ctx) {
  const { json, myString = "" } = ctx.params
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new TypeError("json must be a JSON object")
  }
  if (typeof myString !== "string") {
    throw new TypeError("myString must be a string")
  }
  json.myString = myString
  return { status: 200, data: json }
}
