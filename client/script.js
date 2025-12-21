const socket = io('https://jogo-da-discordia.onrender.com');

let salaAtual = "";
let minhasPalavras = [];

// LOG DE CONEXÃO INICIAL
socket.on('connect', () => {
    console.log("✅ CONECTADO AO SERVIDOR! ID:", socket.id);
});

function entrarNaSala() {
    const nome = document.getElementById('nome').value.trim();
    const sala = document.getElementById('sala').value.trim().toUpperCase();
    if (nome && sala) {
        salaAtual = sala;
        console.log(`🚀 Tentando entrar na sala: ${salaAtual} como: ${nome}`);
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
        console.log(`📝 Palavra adicionada localmente (${minhasPalavras.length}/10): ${palavra}`);
        input.value = '';
        document.getElementById('contador-palavras').innerText = 10 - minhasPalavras.length;
        
        if (minhasPalavras.length === 10) {
            console.log("📦 10 palavras atingidas! Enviando para o servidor...");
            socket.emit('enviar_palavras', { salaId: salaAtual, palavras: minhasPalavras });
            document.getElementById('area-input').classList.add('hidden');
            document.getElementById('area-controles').classList.remove('hidden');
        }
    }
}

function começarPartida() {
    const poteTexto = document.getElementById('pote-count-jogo')?.innerText || "0";
    console.log("🎯 Clique no botão Iniciar. Estado do pote:", poteTexto);

    if (poteTexto.includes(": 0")) {
        console.log("⚠️ Pote vazio ou fase encerrada. Solicitando nova fase ao servidor...");
        socket.emit('iniciar_jogo', salaAtual);
    }
    
    console.log("⏱️ Solicitando início de rodada (60s)...");
    socket.emit('iniciar_rodada', salaAtual);
}

function acertouPalavra() {
    console.log("✅ Ponto marcado!");
    socket.emit('marcar_ponto', { salaId: salaAtual });
    socket.emit('proxima_palavra', salaAtual);
}

// --- LOGS DE EVENTOS RECEBIDOS ---

socket.on('timer_update', (segundos) => {
    // Log removido para não poluir o console a cada segundo, 
    // mas o timer continuará atualizando na tela.
    const el = document.getElementById('timer');
    if (el) el.innerText = segundos + "s";
});

socket.on('timer_acabou', () => {
    console.log("⌛ TEMPO ESGOTADO!");
    alert("Tempo esgotado!");
    document.getElementById('tela-rodada').classList.add('hidden');
    document.getElementById('tela-espera').classList.remove('hidden');
    document.getElementById('btn-iniciar').innerText = "INICIAR MEU TURNO (60s)";
});

socket.on('rodada_comecou', () => {
    console.log("🎬 A rodada começou oficialmente para todos.");
    document.getElementById('tela-espera').classList.add('hidden');
    document.getElementById('tela-rodada').classList.remove('hidden');
});

socket.on('jogo_iniciado', (dados) => {
    console.log("🎮 NOVO JOGO/FASE INICIADA:", dados);
    const fases = { 1: "Fase 1: Dicas Livres", 2: "Fase 2: Uma Palavra", 3: "Fase 3: Mímica" };
    const elFase = document.getElementById('nome-fase');
    if (elFase) elFase.innerText = fases[dados.fase];
    socket.emit('proxima_palavra', salaAtual);
});

socket.on('receber_palavra', (p) => {
    console.log("💡 Próxima palavra do pote:", p);
    const el = document.getElementById('palavra-exibida');
    if (el) el.innerText = p;
});

socket.on('pote_atualizado', (qtd) => {
    console.log("📊 Atualização do Pote:", qtd, "palavras restantes.");
    const el1 = document.getElementById('status-pote');
    const el2 = document.getElementById('pote-count-jogo');
    if (el1) el1.innerText = `Pote: ${qtd} palavras`;
    if (el2) el2.innerText = `Palavras: ${qtd}`;
});

socket.on('update_players', (jogadores) => {
    console.log("👥 Lista de jogadores atualizada:", jogadores);
    const lista = document.getElementById('lista-jogadores');
    if (lista) {
        lista.innerHTML = jogadores.map(j => `<p class="text-sm">👤 ${j.nome}</p>`).join('');
    }
});

socket.on('connect_error', (error) => {
    console.error("❌ Erro de conexão com o servidor:", error);
});