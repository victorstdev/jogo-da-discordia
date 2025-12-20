const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const salas = {};

io.on('connection', (socket) => {
    console.log('Jogador conectado:', socket.id);

    socket.on('join_room', (dados) => {
        const { nome, salaId } = dados;
        const salaFormatada = salaId.trim().toUpperCase();

        socket.join(salaFormatada);
        console.log(`Jogador ${nome} entrou na sala ${salaFormatada}`);

        if (!salas[salaFormatada]) {
            salas[salaFormatada] = {
                jogadores: [],
                poteOriginal: [],
                poteAtual: [],
                status: 'LOBBY'
            };
        }

        // Evita adicionar o mesmo jogador duas vezes no array se ele atualizar a página
        const jaExiste = salas[salaFormatada].jogadores.find(j => j.id === socket.id);
        if (!jaExiste) {
            salas[salaFormatada].jogadores.push({ id: socket.id, nome });
        }

        // Avisa TODO MUNDO da sala (incluindo quem acabou de entrar)
        io.to(salaFormatada).emit('update_players', salas[salaFormatada].jogadores);

        // Se já existirem palavras no pote de uma tentativa anterior, avisa o novo jogador
        socket.emit('pote_atualizado', salas[salaFormatada].poteOriginal.length);
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

        console.log(`Solicitação de início para sala: ${salaId}`);

        if (!sala) {
            console.log("Erro: Sala não encontrada no servidor.");
            return;
        }

        if (sala.poteOriginal.length === 0) {
            console.log("Erro: O pote está vazio. Adicione palavras primeiro.");
            // Opcional: avisar o jogador que o pote está vazio
            socket.emit('erro_jogo', "O pote está vazio! Todos enviaram as palavras?");
            return;
        }

        // Se chegou aqui, está tudo certo!
        sala.status = 'PLAYING';
        sala.poteAtual = [...sala.poteOriginal].sort(() => Math.random() - 0.5);

        console.log(`Jogo iniciado na sala ${salaId} com ${sala.poteAtual.length} palavras.`);

        // Envia para TODOS na sala
        io.to(salaId).emit('jogo_iniciado', { total: sala.poteAtual.length });
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