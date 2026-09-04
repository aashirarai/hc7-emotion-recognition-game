import { useTheme } from './useTheme'

function ThemePicker() {
    const { themeId, setThemeId, themes } = useTheme()

    return (
        <div className="theme-picker">
            <p className="theme-picker-label">Pick your world!</p>
            <div className="theme-picker-grid">
                {themes.map((theme) => (
                    <button
                        key={theme.id}
                        type="button"
                        className={`theme-swatch${theme.id === themeId ? ' theme-swatch-active' : ''}`}
                        style={{
                            background: theme.vars['--bg'],
                            borderColor: theme.vars['--primary'],
                        }}
                        onClick={() => setThemeId(theme.id)}
                        aria-pressed={theme.id === themeId}
                    >
                        <span className="theme-swatch-icon" role="img" aria-hidden="true">
                            {theme.icon}
                        </span>
                        <span className="theme-swatch-name">{theme.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default ThemePicker
