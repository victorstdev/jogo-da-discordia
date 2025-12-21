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
    // Esse log você já vê no Render
    console.log('Conexão estabelecida:', socket.id);

    // EVENTO 1: ENTRAR NA SALA
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

    // EVENTO 2: RECEBER PALAVRAS
    socket.on('enviar_palavras', (dados) => {
        const { salaId, palavras } = dados;
        const sala = salaId.trim().toUpperCase();
        
        if (salas[sala]) {
            salas[sala].poteOriginal.push(...palavras);
            console.log(`Sucesso: Sala ${sala} agora tem ${salas[sala].poteOriginal.length} palavras.`);
            
            // Avisa a todos que o pote atualizou
            io.to(sala).emit('pote_atualizado', salas[sala].poteOriginal.length);
        }
    });

    // EVENTO 3: INICIAR O JOGO
    socket.on('iniciar_jogo', (salaId) => {
        const sala = salaId.trim().toUpperCase();
        console.log(`Recebido iniciar_jogo para a sala: ${sala}`);

        if (salas[sala]) {
            const totalPalavras = salas[sala].poteOriginal.length;
            
            if (totalPalavras > 0) {
                salas[sala].status = 'PLAYING';
                // Copia e embaralha
                salas[sala].poteAtual = [...salas[sala].poteOriginal].sort(() => Math.random() - 0.5);
                
                console.log(`Iniciando jogo na sala ${sala} com ${totalPalavras} palavras.`);
                
                // MANDA O SINAL DE VOLTA PARA O CLIENTE
                io.to(sala).emit('jogo_iniciado', { total: totalPalavras });
            } else {
                console.log(`Erro: Tentativa de iniciar sala ${sala} com pote vazio.`);
            }
        } else {
            console.log(`Erro: Sala ${sala} não existe no servidor.`);
        }
    });

    // EVENTO 4: PRÓXIMA PALAVRA
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

    socket.on('disconnect', () => {
        console.log('Jogador desconectou');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));