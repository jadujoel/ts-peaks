import { hashFile } from './optimize'

// @ts-expect-error
export async function webm(src: string): string {
  console.time("optimize sounds")
  const infile = `src/sounds/${src}`
  const hash = await hashFile(infile)
  const basename = src.replace(".wav", "")
  const outname = `${basename}-${hash}.webm`
  const outfile = `public/${outname}`
  if (await Bun.file(outfile).exists()) {
    return outname
  }
  console.log(`Optimizing ${infile} -> ${outfile}`)
  await Bun.$`ffmpeg -hide_banner -loglevel error -i ${infile} -b:a 96k -ar 48000 -map_metadata -1 -y ${outfile}`
  return outname
}

// @ts-expect-error
export async function waveform(src: string): string {
  const infile = `src/sounds/${src}`
  const hash = await hashFile(infile)
  const basename = src.replace(".wav", "")
  const outname = `${basename}-${hash}.json`
  const outfile = `public/${outname}`
  if (await Bun.file(outfile).exists()) {
    return outname
  }
  console.log(`Creating Waveform ${infile} -> ${outfile}`)
  await Bun.$`audiowaveform -i ${infile} -o ${outfile} --pixels-per-second 50 --output-format json`
  return outname
}


// @ts-expect-error
export async function dat(src: string): string {
  const infile = `src/sounds/${src}`
  const hash = await hashFile(infile)
  const basename = src.replace(".wav", "")
  const outname = `${basename}-${hash}.dat`
  const outfile = `public/${outname}`
  if (await Bun.file(outfile).exists()) {
    return outname
  }
  console.log(`Creating Waveform ${infile} -> ${outfile}`)
  await Bun.$`audiowaveform --input-filename ${infile} --input-format wav --output-filename ${outfile} --output-format dat --bits 8`
  return outname
}
