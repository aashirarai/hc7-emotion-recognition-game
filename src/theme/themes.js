// Preset visual themes for the student pipeline. Each theme only reskins
// decorative tokens (background/surface/accent/confetti colors) — the
// correct/incorrect signal colors and text colors stay fixed across all
// themes so the meaning of feedback never depends on which theme is active.
export const THEMES = [
    {
        id: 'ocean',
        name: 'Ocean',
        icon: '🌊',
        vars: {
            '--bg': '#e0f2fe',
            '--surface': '#ffffff',
            '--primary': '#0284c7',
            '--primary-hover': '#0369a1',
            '--border': '#bae6fd',
            '--confetti-1': '#0284c7',
            '--confetti-2': '#38bdf8',
            '--confetti-3': '#facc15',
            '--confetti-4': '#f8fafc',
        },
    },
    {
        id: 'jungle',
        name: 'Jungle',
        icon: '🌴',
        vars: {
            '--bg': '#ecfccb',
            '--surface': '#ffffff',
            '--primary': '#16a34a',
            '--primary-hover': '#15803d',
            '--border': '#bbf7d0',
            '--confetti-1': '#16a34a',
            '--confetti-2': '#facc15',
            '--confetti-3': '#f97316',
            '--confetti-4': '#84cc16',
        },
    },
    {
        id: 'space',
        name: 'Space',
        icon: '🚀',
        vars: {
            '--bg': '#ede9fe',
            '--surface': '#ffffff',
            '--primary': '#7c3aed',
            '--primary-hover': '#6d28d9',
            '--border': '#ddd6fe',
            '--confetti-1': '#7c3aed',
            '--confetti-2': '#facc15',
            '--confetti-3': '#38bdf8',
            '--confetti-4': '#f472b6',
        },
    },
    {
        id: 'candy',
        name: 'Candy',
        icon: '🍭',
        vars: {
            '--bg': '#fce7f3',
            '--surface': '#ffffff',
            '--primary': '#db2777',
            '--primary-hover': '#be185d',
            '--border': '#fbcfe8',
            '--confetti-1': '#db2777',
            '--confetti-2': '#f472b6',
            '--confetti-3': '#facc15',
            '--confetti-4': '#a855f7',
        },
    },
]

export const DEFAULT_THEME_ID = THEMES[0].id

export function getTheme(id) {
    return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}
