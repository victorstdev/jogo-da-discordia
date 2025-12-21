const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true
});

const salas = {};
const timers = {};

io.on('connection', (socket) => {
    console.log('Conexão estabelecida:', socket.id);

    socket.onAny((eventName, ...args) => {
        console.log(`EVENTO RECEBIDO: ${eventName}`, args);
    });

    // ROOM MANAGEMENT
    socket.on('join_room', (dados) => {
        const { nome, salaId } = dados;
        const sala = salaId.trim().toUpperCase();
        socket.join(sala);

        if (!salas[sala]) {
            salas[sala] = { jogadores: [], poteOriginal: [], poteAtual: [], status: 'LOBBY' };
        }
        salas[sala].jogadores.push({ id: socket.id, nome });

        io.to(sala).emit('update_players', salas[sala].jogadores);
        io.to(sala).emit('pote_atualizado', salas[sala].poteOriginal.length);
    });

    // WORD MANAGEMENT
    socket.on('enviar_palavras', (dados) => {
        const { salaId, palavras } = dados;
        const sala = salaId.trim().toUpperCase();

        if (salas[sala]) {
            salas[sala].poteOriginal.push(...palavras);
            console.log(`Sucesso: Sala ${sala} agora tem ${salas[sala].poteOriginal.length} palavras.`);
            io.to(sala).emit('pote_atualizado', salas[sala].poteOriginal.length);
        }
    });

    socket.on('proxima_palavra', (salaId) => {
        const sala = salaId.trim().toUpperCase();
        if (salas[sala] && salas[sala].poteAtual.length > 0) {
            const palavra = salas[sala].poteAtual.shift();
            socket.emit('receber_palavra', palavra);
            io.to(sala).emit('pote_atualizado', salas[sala].poteAtual.length);
        } else if (salas[sala]) {
            io.to(sala).emit('fase_concluida');
        }
    });

    // GAME CONTROL
    socket.on('iniciar_jogo', (salaId) => {
        const sala = salaId.trim().toUpperCase();
        console.log(`Recebido iniciar_jogo para a sala: ${sala}`);

        if (salas[sala]) {
            const totalPalavras = salas[sala].poteOriginal.length;
            if (totalPalavras > 0) {
                salas[sala].status = 'PLAYING';
                salas[sala].poteAtual = [...salas[sala].poteOriginal].sort(() => Math.random() - 0.5);
                console.log(`Iniciando jogo na sala ${sala} com ${totalPalavras} palavras.`);
                io.to(sala).emit('jogo_iniciado', { total: totalPalavras });
            } else {
                console.log(`Erro: Tentativa de iniciar sala ${sala} com pote vazio.`);
            }
        } else {
            console.log(`Erro: Sala ${sala} não existe no servidor.`);
        }
    });

    // TIMER MANAGEMENT
    socket.on('iniciar_rodada', (salaId) => {
        const sala = salaId.trim().toUpperCase();
        if (!salas[sala]) return;

        clearInterval(timers[sala]);
        let tempoRestante = 60;
        console.log(`Cronómetro iniciado na sala ${sala}`);

        io.to(sala).emit('timer_update', tempoRestante);

        timers[sala] = setInterval(() => {
            tempoRestante--;

            if (tempoRestante <= 0) {
                clearInterval(timers[sala]);
                io.to(sala).emit('timer_acabou');
                console.log(`Tempo esgotado na sala ${sala}`);
            } else {
                io.to(sala).emit('timer_update', tempoRestante);
            }
        }, 1000);
    });

    socket.on('parar_timer', (salaId) => {
        clearInterval(timers[salaId.toUpperCase()]);
    });

    // DISCONNECT
    socket.on('disconnect', () => {
        console.log('Jogador desconectou');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
