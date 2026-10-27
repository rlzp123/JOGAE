import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './catalog.css';
import './auth.css';

ReactDOM.createRoot(document.getElementById('auth-root')).render(<React.StrictMode><AuthProvider><App /></AuthProvider></React.StrictMode>);
