import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import Simulation from './pages/Simulation';
import Admin from './pages/Admin';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<Dashboard />}>
            <Route path="/dashboard" element={<></>} />
            <Route path="/instructor" element={<InstructorDashboard />} />
            <Route path="/lms" element={<Navigate to="/" replace />} />
            <Route path="/lms/instructor" element={<Navigate to="/instructor" replace />} />
          </Route>
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;