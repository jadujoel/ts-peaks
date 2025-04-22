import { optimize } from "./optimize"

export async function build(): Promise<void> {
  await Bun.$`mkdir -p public`
  await optimize()
  await Bun.build({
    throw: true,
    entrypoints: [
      "src/index.html"
    ],
    minify: true,
    outdir: "public"
  })
}

if (import.meta.main) {
  await build()
}
