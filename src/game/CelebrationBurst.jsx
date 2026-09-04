import { useState } from 'react'
import { usePrefersReducedMotion } from '../theme/usePrefersReducedMotion'

const PIECE_COUNT = 18

function CelebrationBurst() {
    const prefersReducedMotion = usePrefersReducedMotion()

    // Lazy initializer: computed once on mount, same as the old empty-deps
    // useMemo — but useState's lazy init is the sanctioned place for a
    // one-time impure (Math.random) computation.
    const [pieces] = useState(() =>
        Array.from({ length: PIECE_COUNT }, (_, i) => {
            const angle = Math.random() * Math.PI * 2
            const dist = 40 + Math.random() * 60
            return {
                key: i,
                dx: Math.round(Math.cos(angle) * dist),
                dy: Math.round(Math.sin(angle) * dist),
                delay: Math.round(Math.random() * 120),
                colorIndex: (i % 4) + 1,
            }
        })
    )

    if (prefersReducedMotion) {
        return (
            <span className="celebration-static" role="img" aria-hidden="true">
                ⭐
            </span>
        )
    }

    return (
        <div className="celebration-burst" aria-hidden="true">
            {pieces.map((piece) => (
                <span
                    key={piece.key}
                    className={`confetti-piece confetti-color-${piece.colorIndex}`}
                    style={{
                        '--dx': `${piece.dx}px`,
                        '--dy': `${piece.dy}px`,
                        '--delay': `${piece.delay}ms`,
                    }}
                />
            ))}
        </div>
    )
}

export default CelebrationBurst
