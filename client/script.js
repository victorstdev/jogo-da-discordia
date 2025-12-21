const socket = io('https://jogo-da-discordia.onrender.com');

let salaAtual = "";
let minhasPalavras = [];

function entrarNaSala() {
    const nome = document.getElementById('nome').value.trim();
    const sala = document.getElementById('sala').value.trim().toUpperCase();
    if (nome && sala) {
        salaAtual = sala;
        document.getElementById('display-sala').innerText = sala;
        socket.emit('join_room', { nome, salaId: sala });
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-espera').classList.remove('hidden');
    }
}

function adicionarPalavra() {
    const input = document.getElementById('input-palavra');
    const palavra = input.value.trim();
    if (palavra && minhasPalavras.length < 10) {
        minhasPalavras.push(palavra);
        input.value = '';
        document.getElementById('contador-palavras').innerText = 10 - minhasPalavras.length;
        if (minhasPalavras.length === 10) {
            socket.emit('enviar_palavras', { salaId: salaAtual, palavras: minhasPalavras });
            document.getElementById('area-input').classList.add('hidden');
            document.getElementById('area-controles').classList.remove('hidden');
        }
    }
}

function começarPartida() {
    const poteTexto = document.getElementById('pote-count-jogo')?.innerText || "0";
    // Se o pote está zerado, avança a fase no servidor
    if (poteTexto.includes(": 0")) {
        socket.emit('iniciar_jogo', salaAtual);
    }
    // Independente disso, inicia o cronômetro de 60s
    socket.emit('iniciar_rodada', salaAtual);
}

function acertouPalavra() {
    socket.emit('marcar_ponto', { salaId: salaAtual });
    socket.emit('proxima_palavra', salaAtual);
}

// --- EVENTOS DO SERVIDOR ---

socket.on('timer_update', (segundos) => {
    const el = document.getElementById('timer');
    if (el) el.innerText = segundos + "s";
});

socket.on('timer_acabou', () => {
    alert("Tempo esgotado!");
    document.getElementById('tela-rodada').classList.add('hidden');
    document.getElementById('tela-espera').classList.remove('hidden');
    document.getElementById('btn-iniciar').innerText = "INICIAR MEU TURNO (60s)";
});

socket.on('rodada_comecou', () => {
    document.getElementById('tela-espera').classList.add('hidden');
    document.getElementById('tela-rodada').classList.remove('hidden');
});

socket.on('jogo_iniciado', (dados) => {
    const fases = { 1: "Fase 1: Dicas Livres", 2: "Fase 2: Uma Palavra", 3: "Fase 3: Mímica" };
    const elFase = document.getElementById('nome-fase');
    if (elFase) elFase.innerText = fases[dados.fase];
    socket.emit('proxima_palavra', salaAtual);
});

socket.on('receber_palavra', (p) => {
    const el = document.getElementById('palavra-exibida');
    if (el) el.innerText = p;
});

socket.on('pote_atualizado', (qtd) => {
    const el1 = document.getElementById('status-pote');
    const el2 = document.getElementById('pote-count-jogo');
    if (el1) el1.innerText = `Pote: ${qtd} palavras`;
    if (el2) el2.innerText = `Palavras: ${qtd}`;
});

socket.on('atualizar_placar', (pontos) => {
    const el = document.getElementById('placar-total');
    if (el) el.innerText = pontos;
});

socket.on('update_players', (jogadores) => {
    const lista = document.getElementById('lista-jogadores');
    if (lista) {
        lista.innerHTML = jogadores.map(j => `<p class="text-sm">👤 ${j.nome}</p>`).join('');
    }
});