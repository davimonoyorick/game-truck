document.addEventListener('DOMContentLoaded', function() {

    // --- SELEÇÃO DOS ELEMENTOS ---
    const caminhao = document.getElementById('caminhao');
    const mapaSVG = document.querySelector('#game-container svg');
    const todosOsCaminhosDeCidade = document.querySelectorAll('.cidade-path');

    // Elementos do Modal de Quiz
    const quizOverlay = document.getElementById('quiz-modal-overlay');
    const quizCityName = document.getElementById('quiz-city-name');
    const quizPergunta = document.getElementById('quiz-pergunta');
    const quizOpcoes = document.getElementById('quiz-opcoes');
    const quizFeedback = document.getElementById('quiz-feedback');
    const quizImagem = document.getElementById('quiz-imagem');
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

            // --- RESET MODAL ---
            quizOverlay.style.display = 'flex';
            quizPergunta.style.display = 'block';
            quizOpcoes.style.display = 'block';
            quizFeedback.style.display = 'block';
            quizFeedback.textContent = '';
            quizOpcoes.classList.remove('respondido');
            quizImagem.style.display = 'none';

            // --- CONFIGURAÇÃO DO QUIZ ---
            quizCityName.textContent = `Quiz: ${dadosCidade.nome}`;
            const perguntas = dadosCidade.perguntas;
            perguntaAtual = perguntas[Math.floor(Math.random() * perguntas.length)];

            exibirPergunta();
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
        quizFeedback.textContent = '';
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

        if (opcaoEscolhidaTexto === perguntaAtual.respostaCorreta) {
            quizFeedback.textContent = "✅ Resposta Correta!";
            quizFeedback.className = "feedback-correto";
        } else {
            quizFeedback.textContent = `❌ Incorreto! A resposta certa é: ${perguntaAtual.respostaCorreta}`;
            quizFeedback.className = "feedback-incorreto";
        }

        // Marcação visual
        quizOpcoes.querySelectorAll('li').forEach(li => {
            if (li.textContent === perguntaAtual.respostaCorreta) {
                li.classList.add('correta');
            } else if (li === opcaoEscolhidaElemento) {
                li.classList.add('incorreta-escolhida');
            }
        });

        // --- Depois de 5s, mostra imagem no modal ---
        setTimeout(() => {
            quizPergunta.style.display = "none";
            quizOpcoes.style.display = "none";
            quizFeedback.style.display = "none";
            quizImagem.style.display = "block";
        }, 5000);
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
            if (percent > 50) cor = '#28a745';
            else if (percent > 20) cor = '#ffc107';
            else cor = '#dc3545';
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

                // Destaca a resposta correta
                quizOpcoes.querySelectorAll('li').forEach(li => {
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
