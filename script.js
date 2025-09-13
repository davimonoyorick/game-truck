document.addEventListener('DOMContentLoaded', function() {

    // --- SELEÇÃO DOS ELEMENTOS ---
    const caminhao = document.getElementById('caminhao');
    const mapaSVG = document.querySelector('#game-container svg');
    const todosOsCaminhosDeCidade = document.querySelectorAll('.cidade-path');

    // Elementos do Modal de Quiz
    const quizOverlay = document.getElementById('quiz-modal-overlay');
    const quizCityName = document.getElementById('quiz-city-name');
    const quizSVGPreview = document.getElementById('quiz-svg-preview');
    const quizSVGPathDisplay = document.getElementById('quiz-svg-path');
    const quizPergunta = document.getElementById('quiz-pergunta');
    const quizOpcoes = document.getElementById('quiz-opcoes');
    const quizFeedback = document.getElementById('quiz-feedback');
    const quizCloseBtn = document.getElementById('quiz-close-btn');

    // Elementos da barra
    const travelBarContainer = document.getElementById("travel-bar-container");
    const travelBarProgress = document.getElementById("travel-bar-progress");
    const travelBarTruck = document.getElementById("travel-bar-truck");

    // --- VARIÁVEIS DE CONTROLE ---
    const quizDuration = 10; // segundos
    let cidadeDeDestino = null;
    let perguntaAtual = null;
    let quizAtivo = false;

    // --- FUNÇÕES DO JOGO ---

    async function iniciarQuiz(caminhoDoSVG) {
        const cidadeId = caminhoDoSVG.id;
        const filePath = `quiz/${cidadeId}.json`;

        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Arquivo não encontrado: ${filePath}`);

            const dadosCidade = await response.json();

            quizCityName.textContent = `Quiz: ${dadosCidade.nome}`;

            if (quizSVGPathDisplay && quizSVGPreview) {
                quizSVGPathDisplay.setAttribute('d', caminhoDoSVG.getAttribute('d'));
                const bbox = caminhoDoSVG.getBBox();
                const padding = 5;
                quizSVGPreview.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding*2} ${bbox.height + padding*2}`);
            }

            const perguntas = dadosCidade.perguntas;
            perguntaAtual = perguntas[Math.floor(Math.random() * perguntas.length)];

            exibirPergunta();
            quizOverlay.style.display = 'flex';
            startQuizTimer();

        } catch (error) {
            console.error("Erro ao iniciar o quiz:", error);
            alert(`Não foi possível carregar o quiz para a cidade "${cidadeId}". Verifique o arquivo ${filePath}`);
            mapaSVG.style.pointerEvents = 'auto';
        }
    }

    function exibirPergunta() {
        quizPergunta.textContent = perguntaAtual.pergunta;
        quizOpcoes.innerHTML = '';
        quizFeedback.innerHTML = '';
        quizOpcoes.classList.remove('respondido');

        perguntaAtual.opcoes.forEach(opcao => {
            const li = document.createElement('li');
            li.textContent = opcao;
            li.addEventListener('click', verificarResposta);
            quizOpcoes.appendChild(li);
        });
    }

function verificarResposta(event) {
    if (quizOpcoes.classList.contains('respondido')) return;

    quizAtivo = false;
    quizOpcoes.classList.add('respondido');

    const opcaoEscolhidaElemento = event.target;
    const opcaoEscolhidaTexto = opcaoEscolhidaElemento.textContent;

    // Lógica de feedback de texto (sem mudanças)
    if (opcaoEscolhidaTexto === perguntaAtual.respostaCorreta) {
        quizFeedback.textContent = "✅ Resposta Correta!";
        quizFeedback.className = "feedback-correto";
    } else {
        quizFeedback.textContent = `❌ Incorreto! A resposta certa é: ${perguntaAtual.respostaCorreta}`;
        quizFeedback.className = "feedback-incorreto";
    }

    // --- NOVA LÓGICA DE FEEDBACK VISUAL ---
    // Itera sobre todos os 'li' (opções) para aplicar os estilos corretos
    quizOpcoes.querySelectorAll('li').forEach(li => {
        const opcaoAtualTexto = li.textContent;

        if (opcaoAtualTexto === perguntaAtual.respostaCorreta) {
            // Se esta é a resposta correta, aplica a classe 'correta'
            li.classList.add('correta');
        } else if (li === opcaoEscolhidaElemento) {
            // Se esta é a opção incorreta que o usuário CLICOU, aplica a classe 'incorreta-escolhida'
            li.classList.add('incorreta-escolhida');
        }
    });
}

    function fecharQuiz() {
        quizOverlay.style.display = 'none';
        quizAtivo = false;
        travelBarContainer.style.display = "none";
        mapaSVG.style.pointerEvents = 'auto';
    }

    quizCloseBtn.addEventListener('click', fecharQuiz);

    function startQuizTimer() {
        quizAtivo = true;
        travelBarContainer.style.display = "block";
        travelBarProgress.style.width = "100%";
        travelBarTruck.style.left = (travelBarContainer.offsetWidth - travelBarTruck.offsetWidth) + "px";
        const startTime = Date.now();

        function animate() {
            if (!quizAtivo) return;

            const elapsed = (Date.now() - startTime) / 1000;
            const remaining = Math.max(quizDuration - elapsed, 0);
            const percent = (remaining / quizDuration) * 100;

            // Barra de tempo com cor gradativa (verde -> amarelo -> vermelho)
            let cor;
            if (percent > 50) cor = '#28a745';       // verde
            else if (percent > 20) cor = '#ffc107';  // amarelo
            else cor = '#dc3545';                    // vermelho
            travelBarProgress.style.backgroundColor = cor;

            travelBarProgress.style.width = percent + "%";
            const maxWidth = travelBarContainer.offsetWidth - travelBarTruck.offsetWidth;
            travelBarTruck.style.left = (maxWidth * (remaining / quizDuration)) + "px";

            if (remaining > 0) {
                requestAnimationFrame(animate);
            } else {
                quizFeedback.textContent = "⏳ Tempo esgotado!";
                quizFeedback.className = "feedback-incorreto";
                quizOpcoes.classList.add("respondido");
                quizAtivo = false;

                // Destaca a resposta correta se nenhuma opção foi clicada
                const itens = quizOpcoes.querySelectorAll('li');
                itens.forEach(li => {
                    if (li.textContent === perguntaAtual.respostaCorreta) {
                        li.style.backgroundColor = '#28a745';
                        li.style.color = 'white';
                    } else {
                        li.style.opacity = '0.5';
                    }
                });
            }
        }
        requestAnimationFrame(animate);
    }

    // --- MOVIMENTO DO CAMINHÃO NO MAPA ---
    mapaSVG.addEventListener('click', function(event) {
        const pontoNoSVG = mapaSVG.createSVGPoint();
        pontoNoSVG.x = event.clientX;
        pontoNoSVG.y = event.clientY;
        const pontoTransformado = pontoNoSVG.matrixTransform(mapaSVG.getScreenCTM().inverse());

        let caminhoClicado = null;
        todosOsCaminhosDeCidade.forEach(caminho => {
            if (caminho.isPointInFill(pontoTransformado)) caminhoClicado = caminho;
        });

        // Caminhão sempre vai para o clique
        caminhao.style.left = event.clientX + 'px';
        caminhao.style.top = event.clientY + 'px';

        // Quiz só inicia se for path de cidade
        cidadeDeDestino = caminhoClicado || null;
    });

    caminhao.addEventListener('transitionend', function() {
        if (cidadeDeDestino) {
            iniciarQuiz(cidadeDeDestino);
            cidadeDeDestino = null;
        }
    });

});
