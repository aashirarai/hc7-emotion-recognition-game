import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './theme-context'
import { DEFAULT_THEME_ID, THEMES, getTheme } from './themes'

function storageKey(scopeId) {
    return `theme:${scopeId ?? 'global'}`
}

function readStoredThemeId(scopeId) {
    try {
        return localStorage.getItem(storageKey(scopeId)) ?? DEFAULT_THEME_ID
    } catch {
        return DEFAULT_THEME_ID
    }
}

// Applies a theme's CSS custom properties to the document root. Themes.js
// stays the single source of truth for color values — nothing is
// duplicated into CSS, so a theme's palette can't drift out of sync.
function applyThemeVars(theme) {
    const root = document.documentElement
    root.setAttribute('data-theme', theme.id)
    Object.entries(theme.vars).forEach(([name, value]) => {
        root.style.setProperty(name, value)
    })
}

// scopeId scopes theme persistence to a participant (so one child's theme
// choice never leaks into a sibling's session on a shared device). Pass
// null/undefined pre-login to fall back to a shared "global" slot.
export function ThemeProvider({ scopeId, children }) {
    const [themeId, setThemeId] = useState(() => readStoredThemeId(scopeId))

    // Re-derive the active theme when the logged-in participant changes.
    // Adjusting state directly during render (React's documented pattern
    // for "state that depends on a prop change") rather than in an effect
    // means the new participant's theme is ready before the first paint —
    // no flash of the previous participant's palette.
    const [lastScopeId, setLastScopeId] = useState(scopeId)
    if (scopeId !== lastScopeId) {
        setLastScopeId(scopeId)
        setThemeId(readStoredThemeId(scopeId))
    }

    // Synchronizes the derived theme with the DOM/localStorage — a
    // legitimate effect, since it's talking to systems outside React.
    useEffect(() => {
        applyThemeVars(getTheme(themeId))
        try {
            localStorage.setItem(storageKey(scopeId), themeId)
        } catch {
            // localStorage unavailable (private browsing, etc.) — theme
            // still applies for this session, it just won't persist.
        }
    }, [themeId, scopeId])

    const value = useMemo(() => ({ themeId, setThemeId, themes: THEMES }), [themeId])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
