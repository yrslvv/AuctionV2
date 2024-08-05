import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserRegistration.css';

const UserRegistration = ({ setUsername }) => {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(2); // Default duration to 2 minutes
  const [picture, setPicture] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setUsername(name);

    const formData = new FormData();
    formData.append('duration', duration);
    formData.append('picture', picture);

    try {
      const response = await axios.post('http://localhost:5000/api/auction', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data) {
        navigate('/auction');
      }
    } catch (error) {
      console.error('Error creating auction:', error);
      // If auction already exists, join it
      if (error.response && error.response.status === 400) {
        navigate('/auction');
      }
    }
  };

  const handleDeleteAuction = async () => {
    try {
      await axios.delete('http://localhost:5000/api/auction');
      alert('Current auction deleted');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="registration-container">
      <h1>Enter the Auction</h1>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your username"
          required
        />
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Duration (minutes)"
          required
        />
        <input
          type="file"
          onChange={(e) => setPicture(e.target.files[0])}
          accept="image/*"
        />
        <button type="submit">Join Auction</button>
      </form>
      <button onClick={handleDeleteAuction} className="delete-button">Delete Current Auction</button>
    </div>
  );
};

export default UserRegistration;
