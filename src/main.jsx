import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// No StrictMode: it double-runs effects, which would open the camera / mic twice.
createRoot(document.getElementById('root')).render(<App />);
