import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_THEME_ID, THEMES, getTheme } from './themes'
import { ThemeContext } from './themeContextObject'

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
//
// The caller must remount this provider on scopeId change (e.g. `key={scopeId}`)
// so the lazy useState initializer below re-reads the new scope's persisted
// theme — that's the sanctioned pattern for state that resets on identity
// change, rather than syncing it back with a second effect.
export function ThemeProvider({ scopeId, children }) {
    const [themeId, setThemeId] = useState(() => readStoredThemeId(scopeId))

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
