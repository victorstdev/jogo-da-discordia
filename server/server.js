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
    // Dentro do io.on('connection', (socket) => { ... })

    socket.on('enviar_palavras', (dados) => {
        const { salaId, palavras } = dados;

        if (salas[salaId]) {
            // Adiciona as palavras do jogador ao pote da sala
            salas[salaId].pote.push(...palavras);

            console.log(`Sala ${salaId} agora tem ${salas[salaId].pote.length} palavras.`);

            // Opcional: Avisar a todos quantos papéis já estão no pote
            io.to(salaId).emit('pote_atualizado', salas[salaId].pote.length);
        }
    });

    socket.on('iniciar_jogo', (salaId) => {
        if (salas[salaId] && salas[salaId].pote.length > 0) {
            salas[salaId].status = 'PLAYING';
            salas[salaId].fase = 1;

            // Embaralha o pote (Shuffle)
            salas[salaId].pote.sort(() => Math.random() - 0.5);

            io.to(salaId).emit('jogo_iniciado', {
                fase: 1,
                totalPalavras: salas[salaId].pote.length
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});