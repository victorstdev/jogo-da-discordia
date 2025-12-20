const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const salas = {};

io.on('connection', (socket) => {
    console.log('Jogador conectado:', socket.id);

    socket.on('join_room', (dados) => {
        const { nome, salaId } = dados;
        socket.join(salaId);

        if (!salas[salaId]) {
            // Inicializa a estrutura da sala
            salas[salaId] = { 
                jogadores: [], 
                poteOriginal: [], // Guarda todas para as próximas fases
                poteAtual: [],    // Palavras que restam na fase ativa
                status: 'LOBBY' 
            };
        }

        salas[salaId].jogadores.push({ id: socket.id, nome });
        io.to(salaId).emit('update_players', salas[salaId].jogadores);
    });

    socket.on('enviar_palavras', (dados) => {
        const { salaId, palavras } = dados;
        if (salas[salaId]) {
            // Adiciona ao pote original
            salas[salaId].poteOriginal.push(...palavras);
            
            console.log(`Sala ${salaId} recebeu +10 palavras. Total: ${salas[salaId].poteOriginal.length}`);

            // avisar a sala, incluindo quem enviou
            io.to(salaId).emit('pote_atualizado', salas[salaId].poteOriginal.length);
        }
    });

    socket.on('iniciar_jogo', (salaId) => {
        const sala = salas[salaId];
        if (sala && sala.poteOriginal.length > 0) {
            sala.status = 'PLAYING';
            // Copia as palavras para o pote da rodada e embaralha
            sala.poteAtual = [...sala.poteOriginal].sort(() => Math.random() - 0.5);
            
            io.to(salaId).emit('jogo_iniciado', { total: sala.poteAtual.length });
        }
    });

    socket.on('proxima_palavra', (salaId) => {
        const sala = salas[salaId];
        if (sala && sala.poteAtual.length > 0) {
            const palavra = sala.poteAtual.shift(); // Tira a primeira palavra
            socket.emit('receber_palavra', palavra);
            io.to(salaId).emit('pote_atualizado', sala.poteAtual.length);
        } else if (sala) {
            io.to(salaId).emit('fase_concluida');
        }
    });

    socket.on('disconnect', () => {
        console.log('Jogador desconectou');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));