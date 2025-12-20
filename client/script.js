// CONFIGURAÇÃO INICIAL - SUBSTITUA PELO SEU LINK DO RENDER
const URL_SERVIDOR = 'https://jogo-da-discordia.onrender.com';
const socket = io(URL_SERVIDOR);

let salaAtual = "";
let minhasPalavras = [];

// LOG DE CONEXÃO
socket.on('connect', () => {
    console.log("✅ CONECTADO AO SERVIDOR:", URL_SERVIDOR);
});

// --- FUNÇÕES DE INTERAÇÃO ---

function entrarNaSala() {
    const nomeInput = document.getElementById('nome').value.trim();
    const salaInput = document.getElementById('sala').value.trim().toUpperCase();

    if (nomeInput && salaInput) {
        salaAtual = salaInput;
        console.log("🚀 Enviando join_room:", { nomeInput, salaAtual });
        
        socket.emit('join_room', { nome: nomeInput, salaId: salaAtual });

        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-espera').classList.remove('hidden');
        document.getElementById('display-sala').innerText = salaAtual;
    } else {
        alert("Preencha seu nome e o código da sala!");
    }
}

function adicionarPalavra() {
    const input = document.getElementById('input-palavra');
    const palavra = input.value.trim();

    if (palavra && minhasPalavras.length < 10) {
        minhasPalavras.push(palavra);
        input.value = '';
        
        // Atualiza UI local
        const lista = document.getElementById('lista-palavras-local');
        const contador = document.getElementById('contador-palavras');
        contador.innerText = 10 - minhasPalavras.length;
        lista.innerHTML += `<span class="bg-slate-700 p-2 rounded border border-slate-600 text-slate-300">✓ ${palavra}</span>`;

        // Se chegar em 10, envia e troca de área
        if (minhasPalavras.length === 10) {
            console.log("📦 10 palavras completas! Enviando ao pote...");
            socket.emit('enviar_palavras', { salaId: salaAtual, palavras: minhasPalavras });
            
            document.getElementById('area-input').classList.add('hidden');
            document.getElementById('area-controles').classList.remove('hidden');
        }
    }
}

function começarPartida() {
    console.log("🎯 Botão 'Começar' clicado. Sala:", salaAtual);
    socket.emit('iniciar_jogo', salaAtual);
}

function acertouPalavra() {
    console.log("✅ Acerto registrado!");
    socket.emit('marcar_ponto', { salaId: salaAtual });
    socket.emit('proxima_palavra', salaAtual);
}

// --- OUVINTES DO SERVIDOR (SOCKET.ON) ---

socket.on('update_players', (jogadores) => {
    console.log("👥 Jogadores na sala:", jogadores);
    const lista = document.getElementById('lista-jogadores');
    if (lista) {
        lista.innerHTML = `<p class="text-[10px] uppercase text-slate-500 mb-2">Conectados:</p>` + 
            jogadores.map(j => `<div class="flex items-center gap-2"><div class="w-2 h-2 bg-green-500 rounded-full"></div><span class="text-sm font-medium">${j.nome}</span></div>`).join('');
    }
});

socket.on('pote_atualizado', (qtd) => {
    console.log("📥 Pote atualizado:", qtd);
    const statusPote = document.getElementById('status-pote');
    const poteJogo = document.getElementById('pote-count-jogo');
    
    if (statusPote) statusPote.innerText = `O pote tem ${qtd} papéis! Pronto?`;
    if (poteJogo) poteJogo.innerText = `Palavras restantes: ${qtd}`;
});

socket.on('jogo_iniciado', (dados) => {
    console.log("🎮 Jogo Iniciado!", dados);
    document.getElementById('tela-espera').classList.add('hidden');
    document.getElementById('tela-rodada').classList.remove('hidden');
    
    // Pede a primeira palavra
    socket.emit('proxima_palavra', salaAtual);
});

socket.on('receber_palavra', (palavra) => {
    console.log("📝 Nova palavra recebida:", palavra);
    document.getElementById('palavra-exibida').innerText = palavra;
});

socket.on('fase_concluida', () => {
    console.log("🏁 Fase concluída!");
    document.getElementById('palavra-exibida').innerText = "FIM DA FASE!";
    alert("O pote esvaziou! Preparem-se para a próxima fase.");
});

socket.on('connect_error', (err) => {
    console.error("❌ Erro de conexão:", err.message);
});