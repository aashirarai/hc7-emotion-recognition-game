function RoleSelectScreen({ onSelectRole }) {
    return (
        <div className="card">
            <div>
                <h1>Welcome</h1>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    Are you playing the game, or checking a child's progress?
                </p>
            </div>

            <div className="role-picker">
                <button className="btn-primary" onClick={() => onSelectRole('student')}>
                    I'm a student
                </button>
                <button className="btn-primary" onClick={() => onSelectRole('guardian')}>
                    I'm a guardian / parent
                </button>
            </div>
        </div>
    )
}

export default RoleSelectScreen
