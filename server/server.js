const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Permite que qualquer dispositivo se conecte
});

// Banco de dados temporário (em memória)
const salas = {};

io.on('connection', (socket) => {
    console.log('Alguém conectou:', socket.id);

    // Lógica para criar/entrar em uma sala
    socket.on('join_room', (dados) => {
        const { nome, salaId } = dados;
        socket.join(salaId);

        if (!salas[salaId]) {
            salas[salaId] = { jogadores: [], pote: [], status: 'LOBBY' };
        }

        salas[salaId].jogadores.push({ id: socket.id, nome });
        
        // Avisa todo mundo na sala que alguém entrou
        io.to(salaId).emit('update_players', salas[salaId].jogadores);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});