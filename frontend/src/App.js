import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import UserRegistration from './components/UserRegistration';
import Auction from './components/Auction';

const App = () => {
  const [username, setUsername] = useState('');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserRegistration setUsername={setUsername} />} />
        <Route path="/auction" element={<Auction username={username} />} />
      </Routes>
    </Router>
  );
};

export default App;
