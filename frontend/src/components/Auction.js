import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import GifSearch from './GifSearch';
import './Auction.css';

const socket = io('http://localhost:5000');

const Auction = ({ username }) => {
  const [auction, setAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [winner, setWinner] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0); // in milliseconds
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [bidError, setBidError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get('http://localhost:5000/api/auction');
      if (response.data) {
        setAuction(response.data);
        if (response.data.endTime) {
          setTimeLeft(new Date(response.data.endTime) - new Date());
        }
      } else {
        setAuction(null);
      }
    };

    fetchData();

    socket.on('newBid', (auction) => {
      setAuction(auction);
    });

    socket.on('timerUpdate', (remainingTime) => {
      setTimeLeft(remainingTime);
    });

    socket.on('auctionEnd', (highestBid) => {
      setWinner(highestBid);
    });

    socket.on('newMessage', (message) => {
      setChatMessages((prevMessages) => [...prevMessages, message].slice(-15));
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    socket.on('messages', (messages) => {
      setChatMessages(messages);
    });

    socket.on('bidError', (error) => {
      setBidError(error);
    });

    socket.emit('getMessages');

    return () => {
      socket.off('newBid');
      socket.off('timerUpdate');
      socket.off('auctionEnd');
      socket.off('newMessage');
      socket.off('messages');
      socket.off('bidError');
    };
  }, []);

  const handleBid = () => {
    setBidError('');
    socket.emit('bid', { auctionId: auction._id, username, amount: bidAmount });
  };

  const handleSendMessage = () => {
    if (newMessage.trim() !== '') {
      socket.emit('sendMessage', { username, message: newMessage });
      setNewMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleGifSelect = (gifUrl) => {
    socket.emit('sendMessage', { username, message: gifUrl });
  };

  if (!auction) {
    return <p>No active auction. Please create a new auction.</p>;
  }

  if (winner) {
    return (
      <div className="auction-container">
        <h1>Auction Ended</h1>
        <p>Winner: {winner.username || "No bids"} with ${winner.amount || 0}</p>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const sortedBids = [...auction.bids].sort((a, b) => b.amount - a.amount);

  return (
    <div className="auction-container">
      <div className="timer">{minutes}:{('0' + seconds).slice(-2)}</div>
      <div className="auction-content">
        <img src={`http://localhost:5000${auction.picture}`} alt="Auction Item" className="auction-image" />
        <div className="bidding-section">
          <div className="current-bids">
            <h3>Current Bids</h3>
            <ul>
              {sortedBids.map((bid, index) => (
                <li key={index}>{bid.username}: ${bid.amount}</li>
              ))}
            </ul>
            {bidError && <p className="bid-error">{bidError}</p>}
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter your bid"
              className="bid-input"
            />
            <button onClick={handleBid} className="bid-button">Place Bid</button>
          </div>
          <div className="chat-container">
            <h3>Chat</h3>
            <div className="chat-messages">
              {chatMessages.map((msg, index) => (
                <div key={index}>
                  {msg.message.startsWith('http') ? (
                    <img src={msg.message} alt="GIF" className="chat-gif" />
                  ) : (
                    <div>
                      <strong>{msg.username}: </strong><span>{msg.message}</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              className="chat-input"
            />
            <small className="enter-to-send">Press Enter to send message</small>
            <GifSearch onGifSelect={handleGifSelect} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auction;
