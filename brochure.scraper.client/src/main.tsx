import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { OptimizationProvider } from './context/OptimizationContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <OptimizationProvider>
            <App />
        </OptimizationProvider>
    </StrictMode>
);