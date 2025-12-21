const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const salas = {};
const timers = {}; // Armazena os intervalos de tempo de cada sala

io.on('connection', (socket) => {
    console.log('Conectado:', socket.id);

    // --- ENTRAR NA SALA ---
    socket.on('join_room', (dados) => {
        const { nome, salaId } = dados;
        const sala = salaId.trim().toUpperCase();
        socket.join(sala);

        if (!salas[sala]) {
            salas[sala] = {
                jogadores: [],
                poteOriginal: [],
                poteAtual: [],
                fase: 0,
                pontos: 0
            };
        }
        salas[sala].jogadores.push({ id: socket.id, nome });

        io.to(sala).emit('update_players', salas[sala].jogadores);
        io.to(sala).emit('pote_atualizado', salas[sala].poteOriginal.length);
    });

    // --- RECEBER PALAVRAS ---
    socket.on('enviar_palavras', (dados) => {
        const { salaId, palavras } = dados;
        const sala = salaId.trim().toUpperCase();
        if (salas[sala]) {
            salas[sala].poteOriginal.push(...palavras);
            io.to(sala).emit('pote_atualizado', salas[sala].poteOriginal.length);
        }
    });

    // --- GERENCIAR FASES ---
    socket.on('iniciar_jogo', (salaId) => {
        const sala = salaId.trim().toUpperCase();
        const s = salas[sala];

        if (s && s.poteOriginal.length > 0) {
            // Se a fase acabou ou não começou, avança e reseta o pote
            if (s.poteAtual.length === 0) {
                s.fase += 1;
                s.poteAtual = [...s.poteOriginal].sort(() => Math.random() - 0.5);
            }

            io.to(sala).emit('jogo_iniciado', {
                fase: s.fase,
                total: s.poteAtual.length,
                pontos: s.pontos
            });
        }
    });

    // --- GERENCIAR CRONÔMETRO (TURNO) ---
    socket.on('iniciar_rodada', (salaId) => {
        const sala = salaId.trim().toUpperCase();
        if (!salas[sala]) return;

        clearInterval(timers[sala]);
        let tempo = 60;

        io.to(sala).emit('rodada_comecou');

        timers[sala] = setInterval(() => {
            tempo--;
            if (tempo <= 0) {
                clearInterval(timers[sala]);
                io.to(sala).emit('timer_acabou');
            } else {
                io.to(sala).emit('timer_update', tempo);
            }
        }, 1000);
    });

    // --- DINÂMICA DE PALAVRAS ---
    socket.on('proxima_palavra', (salaId) => {
        const sala = salaId.trim().toUpperCase();
        const s = salas[sala];
        console.log(`🔍 Pedido de palavra para a sala: ${sala}. Pote atual: ${s?.poteAtual?.length}`);

        if (s && s.poteAtual.length > 0) {
            const palavra = s.poteAtual.shift();
            socket.emit('receber_palavra', palavra); // Envia apenas para quem pediu
            io.to(sala).emit('pote_atualizado', s.poteAtual.length);
        } else {
            io.to(sala).emit('fase_concluida');
        }
    });

    socket.on('marcar_ponto', (dados) => {
        const sala = dados.salaId.toUpperCase();
        if (salas[sala]) {
            salas[sala].pontos++;
            io.to(sala).emit('atualizar_placar', salas[sala].pontos);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));