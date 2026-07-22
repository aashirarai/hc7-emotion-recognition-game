import metadata from './metadata.json'

// When true, only front-facing ("S" / straight) angles are included in the
// playable stimulus set. Off-angle KDEF images (FL, HL, HR, FR) stay in the
// repo and in metadata.json untouched — flip this back to false to bring
// them back into rotation later. Cartoon images are always angle S so they
// are unaffected by this flag.
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

// Auto-discovers every image under src/stimuli/images/ (KDEF photos)
// and src/stimuli/cartoons/ (cartoon stimuli).
// Drop a new image into the matching emotion subfolder and it is included
// automatically — no manifest editing needed.
// The emotion label is derived from the folder name (2nd path segment).
const imageModules = import.meta.glob(
    [
        './images/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
        './cartoons/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
    ],
    { eager: true }
)

export const stimuli = Object.entries(imageModules).map(([path, module]) => {
    // path shapes:
    //   './images/happy/AF01HAS.JPG'   → segments[1]='images',   segments[2]='happy'
    //   './cartoons/angry/CF02ANS.png' → segments[1]='cartoons', segments[2]='angry'
    const segments = path.split('/')
    const emotion  = segments[2]                                              // folder name = label
    const filename = segments[segments.length - 1].replace(/\.[^.]+$/, '')   // strip extension

    // Look up metadata by uppercase stem. Images without an entry get
    // difficulty: null and type: null — they remain fully playable via
    // the random fallback path.
    const meta = metadata[filename.toUpperCase()] ?? null

    return {
        stimulusId: filename,
        emotion,
        imageSrc:   module.default,                                           // resolved URL from Vite
        emoji:      EMOTION_EMOJIS[emotion] ?? '🙂',
        difficulty: meta?.difficultyScore ?? null,
        angle:      meta?.angle ?? null,
        type:       meta?.type ?? null,                                       // 'kdef' | 'cartoon' | null
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
