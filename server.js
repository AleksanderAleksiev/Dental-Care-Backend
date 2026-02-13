import express from 'express';
import cors from 'cors';
import authRouter from './routes/authRoutes.js';
import appointmentRouter from './routes/appointmentRoutes.js';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import { formatMessage, exitRoom, getActiveUser, newUser, addMessageToHistory, getChatHistory } from './helperFunctions.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors(
    {
        origin: ['http://localhost:3000'],
        method: ['POST', 'GET', 'PUT', 'DELETE'],
        credentials: true,
    }
));

app.use('/auth', authRouter);
app.use('/api/appointments', appointmentRouter);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000'],
  }
});


// // this block will run when the client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    console.log('joined', username, room);
    const user = newUser(socket.id, username, room);

    socket.join(user.room);

    addMessageToHistory(room, formatMessage("DentalCare", 'Messages are limited to this room! '));
    addMessageToHistory(room, formatMessage("Dentalcare", `${user.username} has joined the room`));
    
    socket.emit('message', getChatHistory(room));
  });

  // Listen for client message
  socket.on('chatMessage', msg => {

    const user = getActiveUser(socket.id);

    addMessageToHistory(user.room, formatMessage(user.username, msg));

    io.to(user.room).emit('message', getChatHistory(user.room));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = exitRoom(socket.id);

    if (user) {
      addMessageToHistory(user.room, formatMessage("Dentalcare", `${user.username} has left the room`));
      
      io.to(user.room).emit(
        'message',
        getChatHistory(user.room)
      );
    }
  });
});

httpServer.listen(process.env.PORT, () => {
    console.log('Listening', process.env.PORT);
})