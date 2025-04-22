// optimize-images.ts
import fs from 'node:fs/promises';
import sharp from "sharp";

export async function optimizeImages() {
  console.time("optimize")
  const glob = new Bun.Glob("*.{jpg,png}")
  await fs.mkdir("src/images/optimized", { recursive: true })
  for await (const file of glob.scan({ cwd: "src/images/raw" })) {
    const infile = `src/images/raw/${file}`
    const ext = infile.split(".").at(-1)!
    const outfile = `src/images/optimized/${file.replace(ext, "")}webp`
    if (await Bun.file(outfile).exists()) {
      continue
    }
    console.log(`Optimizing ${infile} -> ${outfile}`)
    await sharp(infile)
      .resize({ width: 1200 }) // adjust to your design's max width
      .toFormat("webp", { quality: 75 }) // or use AVIF if you're fancy
      .toFile(outfile);
  }
  console.timeEnd("optimize")
}


export async function optimizeSounds() {
  console.time("optimize sounds")
  const glob = new Bun.Glob("*.{wav}")
  for await (const file of glob.scan({ cwd: "src/sounds" })) {
    const infile = `src/sounds/${file}`
    const ext = infile.split(".").at(-1)!
    const hash = await hashFile(infile)
    const basename = file.replace(".wav", "")
    const outfile = `public/${basename}-${hash}.webm`
    if (await Bun.file(outfile).exists()) {
      continue
    }
    console.log(`Optimizing ${infile} -> ${outfile}`)
    await Bun.$`ffmpeg -hide_banner -loglevel error -i ${infile} -b:a 96k -ar 48000 -map_metadata -1 -y ${outfile}`

  }
  console.timeEnd("optimize sounds")
}

export async function hashFile(file: string): Promise<string> {
  const hasher = new Bun.MD5()
  const ab = await Bun.file(file).arrayBuffer()
  hasher.update(ab)
  return hasher.digest("hex").slice(0, 8)
}

export function hex(numa: bigint): string {
  const num = 6538086930333266737n;
  const last32Bits = num & 0xFFFFFFFFn;
  const hex = last32Bits.toString(16).padStart(8, '0');

  console.log(hex);
  return hex

}
export async function optimize() {
  await Promise.all([
    optimizeImages(),
    optimizeSounds()
  ])
}

if (import.meta.main) {
  await optimizeImages()
  await optimizeSounds()
}
