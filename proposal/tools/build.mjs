/**
 * Renders src/proposal.html to a print-ready PDF.
 *
 *   node tools/build.mjs            trim-size PDF (210 x 297 mm) + page previews
 *   node tools/build.mjs --bleed    adds the 3 mm bleed edition (216 x 303 mm)
 *   node tools/build.mjs --no-png   skips the PNG previews
 *
 * The page is served over http rather than opened from file:// so that the
 * bundled fonts, the SVG logo and the photography all load the same way a
 * browser would resolve them.
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const args = process.argv.slice(2)
const wantBleed = args.includes('--bleed')
const wantPng = !args.includes('--no-png')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
}

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0])
      const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''))
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end('not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
      fs.createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

fs.mkdirSync(DIST, { recursive: true })
const { server, port } = await serve()
const browser = await chromium.launch()

async function render({ file, bleed }) {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } })
  await page.goto(`http://127.0.0.1:${port}/src/proposal.html`, { waitUntil: 'networkidle' })

  if (bleed) {
    // Grow the artboard by 3 mm on every edge. Full-bleed images and the
    // bottom bands are anchored to the page box, so they extend into the bleed;
    // everything inside .safe stays pinned to the trim-safe area.
    await page.addStyleTag({
      content: ':root{--bleed:3mm;--pw:216mm;--ph:303mm}',
    })
  }
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)

  const out = path.join(DIST, file)
  await page.pdf({
    path: out,
    width: bleed ? '216mm' : '210mm',
    height: bleed ? '303mm' : '297mm',
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
  console.log(`  ${file.padEnd(46)} ${(fs.statSync(out).size / 1048576).toFixed(2)} MB`)
  await page.close()
  return out
}

console.log('Rendering:')
const trim = await render({
  file: 'GenerationSchoolsTaroko-FeederSchoolPartnership-PRINT-A4.pdf',
  bleed: false,
})
if (wantBleed) {
  await render({
    file: 'GenerationSchoolsTaroko-FeederSchoolPartnership-PRINT-A4-3mm-bleed.pdf',
    bleed: false === true ? false : true,
  })
}

if (wantPng) {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 2 })
  await page.goto(`http://127.0.0.1:${port}/src/proposal.html`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  for (const id of ['p1', 'p2', 'p3', 'p4']) {
    const out = path.join(DIST, `preview-${id}.png`)
    await page.locator(`#${id}`).screenshot({ path: out })
    console.log(`  preview-${id}.png`)
  }
  await page.close()
}

await browser.close()
server.close()
console.log('\nDone →', path.relative(process.cwd(), trim))
