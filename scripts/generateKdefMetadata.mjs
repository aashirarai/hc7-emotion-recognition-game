/**
 * One-time KDEF ingestion script.
 *
 * Usage:
 *   node scripts/generateKdefMetadata.mjs <path-to-kdef-root-folder>
 *
 * What it does:
 *   1. Walks every identity subfolder inside the KDEF root (e.g. AF01/, BM22/).
 *   2. Parses each filename using the standard KDEF naming convention.
 *   3. Copies matched images into src/stimuli/images/{emotion}/ (keeps original filename, uppercased).
 *   4. Writes src/stimuli/kdefMetadata.json keyed by filename stem.
 *   5. Prints a coverage table so you can spot gaps before committing.
 *
 * The existing placeholder images in src/stimuli/images/ are NOT deleted.
 * Once you have verified the KDEF images are in place, delete the old
 * placeholder files (angry_1.jpg etc.) manually.
 *
 * KDEF filename convention: {session}{gender}{identity}{expression}{angle}.JPG
 *   Session:    A (series one)  | B (series two)
 *   Gender:     F (female)      | M (male)
 *   Identity:   01–35
 *   Expression: AF AN DI HA NE SA SU
 *   Angle:      FL HL S HR FR
 * Example: AF01ANFL.JPG → session A, female, identity 01, angry, full-left profile
 */

import { readdir, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── Paths ───────────────────────────────────────────────────────────────────

const SCRIPT_DIR  = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..')
const IMAGES_DIR   = join(PROJECT_ROOT, 'src', 'stimuli', 'images')
const METADATA_OUT = join(PROJECT_ROOT, 'src', 'stimuli', 'kdefMetadata.json')

// ─── Difficulty tiers (Wang et al. 2024 + standard literature placement) ─────
//
//  Tier 1 – Easiest  : happy, neutral   (near-ceiling in child recognition studies)
//  Tier 2 – Easy     : surprise         (distinctive wide-eyes/open-mouth cues)
//  Tier 3 – Moderate : disgust, sad     (both frequently confused with each other
//                                        and with neutral in child samples)
//  Tier 4 – Hard     : fear             (confused with surprise)
//  Tier 5 – Hardest  : angry            (lowest child recognition accuracy in literature)

const EMOTION_META = {
    HA: { emotion: 'happy',    difficultyTier: 1 },
    NE: { emotion: 'neutral',  difficultyTier: 1 },
    SU: { emotion: 'surprise', difficultyTier: 2 },
    DI: { emotion: 'disgust',  difficultyTier: 3 },
    SA: { emotion: 'sad',      difficultyTier: 3 },
    AF: { emotion: 'fear',     difficultyTier: 4 },
    AN: { emotion: 'angry',    difficultyTier: 5 },
}

const VALID_ANGLES = ['FL', 'HL', 'S', 'HR', 'FR']

// Matches the full 7-char (straight) or 8-char (all other angles) KDEF stem.
// Groups: (session)(gender)(identity)(expressionCode)(angleCode)
const FILENAME_REGEX = /^([AB])([FM])(\d{2})(AF|AN|DI|HA|NE|SA|SU)(FL|HL|HR|FR|S)$/i

// ─── Entry point ─────────────────────────────────────────────────────────────

const kdefSource = process.argv[2]

if (!kdefSource) {
    console.error('Error: no source path provided.')
    console.error('Usage: node scripts/generateKdefMetadata.mjs <path-to-kdef-folder>')
    process.exit(1)
}

const resolvedSource = resolve(kdefSource)

if (!existsSync(resolvedSource)) {
    console.error(`Error: source folder not found:\n  ${resolvedSource}`)
    process.exit(1)
}

async function main() {
    const metadata = {}
    const skipped  = []

    // Coverage: expressionCode → angleCode → count
    const coverage = Object.fromEntries(
        Object.keys(EMOTION_META).map(code => [code, Object.fromEntries(VALID_ANGLES.map(a => [a, 0]))])
    )

    let processed = 0
    let overwritten = 0

    // Walk one level of subfolders (AF01/, BM22/, etc.)
    const entries = await readdir(resolvedSource, { withFileTypes: true })
    const subfolders = entries.filter(e => e.isDirectory())

    if (subfolders.length === 0) {
        console.warn('Warning: no subfolders found inside the KDEF root. Check your path.')
        console.warn(`  Path used: ${resolvedSource}`)
    }

    for (const folder of subfolders) {
        const folderPath = join(resolvedSource, folder.name)
        const files = await readdir(folderPath)

        for (const file of files) {
            const ext = extname(file).toLowerCase()
            if (ext !== '.jpg' && ext !== '.jpeg') continue

            const stem = basename(file, extname(file)).toUpperCase()
            const match = FILENAME_REGEX.exec(stem)

            if (!match) {
                skipped.push(`${folder.name}/${file}`)
                continue
            }

            const [, session, gender, identity, expressionCode, angleCode] = match
            const { emotion, difficultyTier } = EMOTION_META[expressionCode.toUpperCase()]

            // Create destination directory if needed
            const destDir = join(IMAGES_DIR, emotion)
            await mkdir(destDir, { recursive: true })

            // Copy (not move) to preserve the original KDEF folder intact
            const destFilename = `${stem}.JPG`
            const destPath = join(destDir, destFilename)
            const alreadyExists = existsSync(destPath)
            await copyFile(join(folderPath, file), destPath)
            if (alreadyExists) overwritten++

            // Record metadata entry keyed by uppercase stem
            metadata[stem] = {
                emotion,
                kdefCode: expressionCode.toUpperCase(),
                session,
                gender,
                identity: `${session}${gender}${identity}`,
                angle: angleCode.toUpperCase(),
                difficultyTier,
            }

            // Update coverage table
            coverage[expressionCode.toUpperCase()][angleCode.toUpperCase()]++
            processed++
        }
    }

    // Write metadata JSON
    await writeFile(METADATA_OUT, JSON.stringify(metadata, null, 2), 'utf-8')

    // ─── Summary output ───────────────────────────────────────────────────────

    console.log('')
    console.log(`✓  Processed : ${processed} images`)
    console.log(`✓  Metadata  : src/stimuli/kdefMetadata.json`)
    if (overwritten > 0) {
        console.log(`⚠  Overwritten ${overwritten} existing files (re-run is safe)`)
    }
    console.log('')

    if (skipped.length > 0) {
        console.log(`⚠  Skipped ${skipped.length} unrecognised file(s):`)
        skipped.slice(0, 15).forEach(f => console.log(`     ${f}`))
        if (skipped.length > 15) console.log(`     …and ${skipped.length - 15} more`)
        console.log('')
    }

    // Coverage table
    const COL = 6  // width per angle column
    const pad  = (s, n) => String(s).padStart(n)
    const padL = (s, n) => String(s).padEnd(n)

    const divider = '─'.repeat(62)
    console.log('Coverage (images per expression × angle):')
    console.log(divider)
    console.log(`  Code  Emotion       Tier   ${VALID_ANGLES.map(a => pad(a, COL)).join('')}   Total`)
    console.log(divider)

    const tierTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    for (const [code, { emotion, difficultyTier }] of Object.entries(EMOTION_META)) {
        const angleCounts = VALID_ANGLES.map(a => coverage[code][a])
        const total = angleCounts.reduce((s, n) => s + n, 0)
        tierTotals[difficultyTier] += total
        const zeroFlag = total === 0 ? ' ← ⚠ NO IMAGES' : ''
        console.log(
            `  ${padL(code, 4)}  ${padL(emotion, 12)}  T${difficultyTier}   ` +
            `${angleCounts.map(n => pad(n, COL)).join('')}   ${pad(total, 5)}${zeroFlag}`
        )
    }

    console.log(divider)
    console.log('')
    console.log('Tier totals (images available for adaptive sampling):')

    const TIER_LABELS = {
        1: 'Easiest  (happy, neutral)',
        2: 'Easy     (surprise)',
        3: 'Moderate (disgust, sad)',
        4: 'Hard     (fear)',
        5: 'Hardest  (angry)',
    }

    for (const tier of [1, 2, 3, 4, 5]) {
        const n    = tierTotals[tier]
        const warn = n === 0 ? '  ← ⚠ EMPTY — adaptive sampling will widen to adjacent tier' : ''
        console.log(`  Tier ${tier}  ${padL(TIER_LABELS[tier], 30)}  ${pad(n, 6)} images${warn}`)
    }

    console.log('')
    console.log('Next steps:')
    console.log('  1. Check the table above — every tier should have > 0 images.')
    console.log('  2. Commit src/stimuli/kdefMetadata.json and the new image files.')
    console.log('  3. Optionally delete the old placeholder images (angry_1.jpg etc.).')
    console.log('     The game remains playable with them present (they get difficulty: null')
    console.log('     and fall through to random sampling, bypassing tier selection).')
    console.log('')
}

main().catch(err => {
    console.error('Fatal error:', err.message)
    process.exit(1)
})
