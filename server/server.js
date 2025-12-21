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
    if (salas[sala] && salas[sala].poteOriginal.length > 0) {
        
        // Só avança a fase se o pote atual estiver vazio ou se o jogo ainda não começou
        if (!salas[sala].fase) {
            salas[sala].fase = 1;
            salas[sala].poteAtual = [...salas[sala].poteOriginal].sort(() => Math.random() - 0.5);
        } else if (salas[sala].poteAtual.length === 0 && salas[sala].fase < 3) {
            salas[sala].fase += 1;
            salas[sala].poteAtual = [...salas[sala].poteOriginal].sort(() => Math.random() - 0.5);
        }

        io.to(sala).emit('jogo_iniciado', { 
            fase: salas[sala].fase, 
            total: salas[sala].poteAtual.length,
            pontos: salas[sala].pontos || 0
        });
    }
});

    // TIMER MANAGEMENT
    socket.on('iniciar_rodada', (salaId) => {
    const sala = salaId.trim().toUpperCase();
    if (!salas[sala]) return;

    clearInterval(timers[sala]);
    let tempoRestante = 60;

    // Avisa a todos para trocarem para a tela de jogo, mas SEM mudar a fase
    io.to(sala).emit('rodada_comecou'); 

    timers[sala] = setInterval(() => {
        tempoRestante--;
        if (tempoRestante <= 0) {
            clearInterval(timers[sala]);
            io.to(sala).emit('timer_acabou');
        } else {
            io.to(sala).emit('timer_update', tempoRestante);
        }
    }, 1000);
});

    socket.on('marcar_ponto', (dados) => {
        const { salaId } = dados;
        const sala = salaId.trim().toUpperCase();

        if (salas[sala]) {
            // Se a sala ainda não tem pontuação, cria
            if (!salas[sala].pontos) salas[sala].pontos = 0;

            salas[sala].pontos += 1;

            console.log(`Ponto marcado na sala ${sala}. Total: ${salas[sala].pontos}`);

            // Avisa a todos o novo placar
            io.to(sala).emit('atualizar_placar', salas[sala].pontos);
        }
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
