import kdefMetadata from './kdefMetadata.json'

// When true, only front-facing ("S" / straight) KDEF angles are included in
// the playable stimulus set. Off-angle images (FL, HL, HR, FR) stay in the
// repo and in kdefMetadata.json untouched — flip this back to false to bring
// them back into rotation later.
const FRONT_FACING_ONLY = true

// Emoji shown as fallback if an image file is missing or fails to load
const EMOTION_EMOJIS = {
    happy:   '😊',
    sad:     '😢',
    angry:   '😠',
    fear:    '😨',
    surprise:'😲',
    disgust: '🤢',
    neutral: '😐',
}

// Auto-discovers every image under src/stimuli/images/{emotion}/
// To add a new image: drop it into the matching emotion folder.
// The emotion label is derived from the folder name — no manifest editing needed.
const imageModules = import.meta.glob(
    './images/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
    { eager: true }
)

export const stimuli = Object.entries(imageModules).map(([path, module]) => {
    // path shape: './images/happy/AF01HAS.JPG'
    const segments = path.split('/')
    const emotion  = segments[2]                                              // folder name = label
    const filename = segments[segments.length - 1].replace(/\.[^.]+$/, '')   // strip extension

    // Look up KDEF metadata by uppercase stem.
    // Images without an entry (placeholder JPGs, manually added files) get
    // difficulty: null and are excluded from tier-based sampling but remain
    // fully playable via the random fallback path.
    const meta = kdefMetadata[filename.toUpperCase()] ?? null

    return {
        stimulusId: filename,
        emotion,
        imageSrc: module.default,                                             // resolved URL from Vite
        emoji: EMOTION_EMOJIS[emotion] ?? '🙂',
        difficulty: meta?.difficultyTier ?? null,
        angle:      meta?.angle ?? null,
    }
}).filter(({ angle }) => !FRONT_FACING_ONLY || angle === 'S' || angle === null)

// Answer options shown to the user on every trial.
// Includes neutral now that the KDEF dataset covers it (NE category).
// If KDEF has not been ingested yet, neutral will appear as an answer option
// but will never be the correct answer — harmless until ingestion is done.
export const emotionOptions = [
    'happy',
    'neutral',
    'surprise',
    'sad',
    'disgust',
    'fear',
    'angry',
]
