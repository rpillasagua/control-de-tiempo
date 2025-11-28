export default function OfflinePage() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                padding: '3rem',
                borderRadius: '20px',
                maxWidth: '500px'
            }}>
                <svg
                    width="120"
                    height="120"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginBottom: '2rem' }}
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>

                <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: '600' }}>
                    Sin Conexión
                </h1>

                <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem' }}>
                    No tienes conexión a internet en este momento.
                    Por favor, verifica tu conexión y vuelve a intentarlo.
                </p>

                <button
                    onClick={() => window.location.reload()}
                    style={{
                        background: 'white',
                        color: '#667eea',
                        border: 'none',
                        padding: '0.75rem 2rem',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    Reintentar
                </button>
            </div>
        </div>
    );
}
