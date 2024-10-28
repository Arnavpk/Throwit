const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Serve static files from the public folder

let connectedUsers = []; // To track connected users

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Add the connected user to the list
    connectedUsers.push(socket.id);
    
    // Emit the updated user list to all connected clients
    io.emit('update-user-list', connectedUsers);

    // Handle offer event
    socket.on('offer', (offer, to) => {
        socket.to(to).emit('offer', offer, socket.id);
    });

    // Handle answer event
    socket.on('answer', (answer, to) => {
        socket.to(to).emit('answer', answer, socket.id);
    });

    // Handle ICE candidate event
    socket.on('ice-candidate', (candidate, to) => {
        socket.to(to).emit('ice-candidate', candidate, socket.id);
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove the user from the list
        connectedUsers = connectedUsers.filter(id => id !== socket.id);
        
        // Emit the updated user list to all remaining clients
        io.emit('update-user-list', connectedUsers);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
