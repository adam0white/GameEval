import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CardGalleryView from './views/CardGalleryView';
import AgentFocusView from './views/AgentFocusView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CardGalleryView />} />
        <Route path="/test/:id" element={<AgentFocusView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

