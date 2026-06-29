// Each stimulus has an imagePath (loaded from public/stimuli/) and an emoji fallback.
// Drop image files into public/stimuli/{emotion}/ using the naming convention
// {emotion}_{n}.jpg (e.g. public/stimuli/happy/happy_1.jpg).
// The app shows the image when the file exists, or the emoji if the image fails to load.
export const stimuli = [
    {
        stimulusId: 'happy_1',
        emotion: 'happy',
        imagePath: '/stimuli/happy/happy_1.jpg',
        emoji: '😊',
    },
    {
        stimulusId: 'sad_1',
        emotion: 'sad',
        imagePath: '/stimuli/sad/sad_1.jpg',
        emoji: '😢',
    },
    {
        stimulusId: 'angry_1',
        emotion: 'angry',
        imagePath: '/stimuli/angry/angry_1.jpg',
        emoji: '😠',
    },
    {
        stimulusId: 'fear_1',
        emotion: 'fear',
        imagePath: '/stimuli/fear/fear_1.jpg',
        emoji: '😨',
    },
    {
        stimulusId: 'surprise_1',
        emotion: 'surprise',
        imagePath: '/stimuli/surprise/surprise_1.jpg',
        emoji: '😲',
    },
    {
        stimulusId: 'disgust_1',
        emotion: 'disgust',
        imagePath: '/stimuli/disgust/disgust_1.jpg',
        emoji: '🤢',
    },
]

// The six answer options shown to the user on every trial
export const emotionOptions = [
    'happy',
    'sad',
    'angry',
    'fear',
    'surprise',
    'disgust'
]
