import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OptimizationProvider } from './context/OptimizationContext'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <OptimizationProvider>
            <App />
        </OptimizationProvider>
    </StrictMode>
)