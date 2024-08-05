const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const mongoUri = 'mongodb+srv://yaroslav:12341234@yarocluster.bocq9hk.mongodb.net/';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve static files from the uploads directory

const auctionSchema = new mongoose.Schema({
  picture: String,
  bids: [{ username: String, amount: Number }],
  isActive: { type: Boolean, default: true },
  endTime: Date
});

const chatSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: Date
});

const Auction = mongoose.model('Auction', auctionSchema);
const Chat = mongoose.model('Chat', chatSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

let interval;

// Function to mark old auctions as inactive
const markOldAuctionsInactive = async () => {
  const activeAuctions = await Auction.find({ isActive: true });
  activeAuctions.forEach(async (auction) => {
    if (new Date(auction.endTime) <= new Date()) {
      auction.isActive = false;
      await auction.save();
    }
  });
};

// Run the function to mark old auctions inactive when the server starts
markOldAuctionsInactive();

// Check for existing auction
app.get('/api/auction', async (req, res) => {
  const auction = await Auction.findOne({ isActive: true }).sort({ _id: -1 }).limit(1);
  if (auction && new Date(auction.endTime) <= new Date()) {
    auction.isActive = false;
    await auction.save();
    res.json(null);
  } else {
    res.json(auction);
  }
});

// Create a new auction
app.post('/api/auction', upload.single('picture'), async (req, res) => {
  const existingAuction = await Auction.findOne({ isActive: true });
  if (existingAuction) {
    return res.status(400).json({ message: 'An auction is already active' });
  }

  const { duration } = req.body;
  if (!req.file || !duration) {
    return res.status(400).json({ message: 'Image and duration are required' });
  }

  const endTime = new Date(Date.now() + duration * 60 * 1000);

  const auction = new Auction({
    picture: `/uploads/${req.file.filename}`,
    bids: [],
    endTime
  });
  await auction.save();

  // Clear previous chat messages
  await Chat.deleteMany({});

  // Start the timer
  clearInterval(interval);
  interval = setInterval(async () => {
    const remainingTime = Math.max(0, new Date(auction.endTime) - new Date());
    io.emit('timerUpdate', remainingTime);

    if (remainingTime <= 0) {
      clearInterval(interval);
      auction.isActive = false;
      await auction.save();

      // Determine the winner
      const highestBid = auction.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max, { amount: 0 });
      io.emit('auctionEnd', highestBid);
    }
  }, 1000);

  res.json(auction);
});

// Add an endpoint to delete the current auction
app.delete('/api/auction', async (req, res) => {
  await Auction.deleteMany({ isActive: true });
  await Chat.deleteMany({});
  res.json({ message: 'Current auction and chat deleted' });
});

io.on('connection', (socket) => {
  socket.on('bid', async (data) => {
    const auction = await Auction.findById(data.auctionId);
    const existingBid = auction.bids.find(bid => bid.username === data.username);

    if (existingBid) {
      if (data.amount > existingBid.amount) {
        existingBid.amount = data.amount;
      } else {
        socket.emit('bidError', 'You cannot bid lower than your previous bid.');
        return;
      }
    } else {
      auction.bids.push({ username: data.username, amount: data.amount });
    }

    await auction.save();
    io.emit('newBid', auction);
  });

  socket.on('sendMessage', async (messageData) => {
    const chatMessage = new Chat({
      username: messageData.username,
      message: messageData.message,
      timestamp: new Date()
    });
    await chatMessage.save();
    io.emit('newMessage', chatMessage);
  });

  socket.on('getMessages', async () => {
    const messages = await Chat.find().sort({ timestamp: -1 }).limit(15);
    socket.emit('messages', messages.reverse());
  });
});

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
