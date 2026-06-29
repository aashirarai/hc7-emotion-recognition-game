// Emoji shown as fallback if an image file is missing or fails to load
const EMOTION_EMOJIS = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fear: '😨',
    surprise: '😲',
    disgust: '🤢',
}

// Auto-discovers every image under src/stimuli/images/{emotion}/
// To add a new image: drop it into the matching emotion folder.
// The emotion label is derived from the folder name — no manifest editing needed.
const imageModules = import.meta.glob(
    './images/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
    { eager: true }
)

export const stimuli = Object.entries(imageModules).map(([path, module]) => {
    // path shape: './images/happy/happy_1.jpg'
    const segments = path.split('/')
    const emotion = segments[2]                                    // folder name = label
    const filename = segments[segments.length - 1].replace(/\.[^.]+$/, '') // strip extension
    return {
        stimulusId: filename,
        emotion,
        imageSrc: module.default,                                  // resolved URL from Vite
        emoji: EMOTION_EMOJIS[emotion] ?? '🙂',
    }
})

// The six answer options shown to the user on every trial
export const emotionOptions = [
    'happy',
    'sad',
    'angry',
    'fear',
    'surprise',
    'disgust'
]
