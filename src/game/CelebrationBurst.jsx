import { usePrefersReducedMotion } from '../theme/usePrefersReducedMotion'

// A fixed, hand-tuned burst pattern rather than Math.random(): keeps the
// piece layout pure/deterministic (computed once at module load, not
// during render) while still reading as a natural radial scatter.
const PIECE_ANGLES_DEG = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340]
const PIECE_DISTANCES  = [55, 75, 60, 85, 50, 70, 65, 90, 55, 80, 60, 75, 50, 85, 65, 70, 55, 80]
const PIECE_DELAYS_MS  = [0, 40, 20, 60, 10, 50, 30, 70, 0, 45, 15, 65, 25, 55, 5, 60, 35, 75]

const PIECES = PIECE_ANGLES_DEG.map((angleDeg, i) => {
    const angle = (angleDeg * Math.PI) / 180
    return {
        key: i,
        dx: Math.round(Math.cos(angle) * PIECE_DISTANCES[i]),
        dy: Math.round(Math.sin(angle) * PIECE_DISTANCES[i]),
        delay: PIECE_DELAYS_MS[i],
        colorIndex: (i % 4) + 1,
    }
})

function CelebrationBurst() {
    const prefersReducedMotion = usePrefersReducedMotion()

    if (prefersReducedMotion) {
        return (
            <span className="celebration-static" role="img" aria-hidden="true">
                ⭐
            </span>
        )
    }

    return (
        <div className="celebration-burst" aria-hidden="true">
            {PIECES.map((piece) => (
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
