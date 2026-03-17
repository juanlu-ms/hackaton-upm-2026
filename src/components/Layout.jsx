import Header from './Header'
import Footer from './Footer'
import { Toaster } from 'react-hot-toast'

export default function Layout({ children }) {
    return (
        <div className="app-layout">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        borderRadius: '12px',
                        background: 'var(--surface)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                    },
                }}
            />
            <Header />
            <main className="app-main">
                {children}
            </main>
            <Footer />
        </div>
    )
}
