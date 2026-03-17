import { Shield } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="app-footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <Shield size={20} />
                    <span>ClimAlert</span>
                </div>
                <p className="footer-copy">
                    © {new Date().getFullYear()} ClimAlert — Todos los derechos reservados.
                </p>
                <p className="footer-sub">
                    Universidad Politécnica de Madrid · Hackathon UPM 2026
                </p>
            </div>
        </footer>
    )
}
