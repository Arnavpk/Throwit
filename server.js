const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let clients = {}; // maps socket IDs to usernames
let userSockets = {}; // maps usernames to socket IDs

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);
    const io = new Server(httpServer);

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('new-user', (name) => {
            clients[socket.id] = name;
            userSockets[name] = socket.id; // Map username to socket ID
            io.emit('update-user-list', Object.values(clients));
            console.log(`${name} connected with ID: ${socket.id}`);
        });

        socket.on('test-message', (message, toUsername) => {
            const toSocketId = userSockets[toUsername]; // Look up socket ID by username
            if (toSocketId) {
                console.log(`Sending message: "${message}" to ${toUsername}`);
                // to() needs soc-id not username
                socket.to(toSocketId).emit('test-message', message, clients[socket.id]);
            } else {
                console.error(`User ${toUsername} not found`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`${clients[socket.id]} disconnected`);
            delete userSockets[clients[socket.id]]; // Remove the username from the mapping
            delete clients[socket.id];
            io.emit('update-user-list', Object.values(clients));
        });

        // Existing offer, answer, and ICE candidate handlers
        socket.on('offer', (offer, to) => {
            console.log(`Sending offer from ${clients[socket.id]} to ${to}`);
            socket.to(userSockets[to]).emit('offer', offer, socket.id);
        });

        socket.on('answer', (answer, to) => {
            console.log(`Sending answer from ${clients[socket.id]} to ${to}`);
            socket.to(userSockets[to]).emit('answer', answer, socket.id);
        });

        socket.on('ice-candidate', (candidate, to) => {
            socket.to(userSockets[to]).emit('ice-candidate', candidate, socket.id);
        });
    });

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${PORT}`);
    });
});
