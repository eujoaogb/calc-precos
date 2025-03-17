document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('calculadoraForm');
    const resultados = document.getElementById('resultados');
    const detalhesCalculo = document.getElementById('detalhes-calculo');
    const toggleDetalhes = document.getElementById('toggleDetalhes');
    const historico = document.getElementById('historico-calculos');
    const toggleTheme = document.getElementById('toggleTheme');
    const parcelasSelect = document.getElementById('parcelasSelect');
    let dadosCalculo = null; // Para armazenar os dados do último cálculo

    // Inicializa o tema
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', theme);
    atualizarBotaoTema(theme);

    // Toggle do tema
    toggleTheme.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        atualizarBotaoTema(newTheme);
    });

    function atualizarBotaoTema(theme) {
        const icon = toggleTheme.querySelector('i');
        if (theme === 'dark') {
            icon.classList.remove('bi-moon-fill');
            icon.classList.add('bi-sun-fill');
            toggleTheme.title = 'Mudar para modo claro';
        } else {
            icon.classList.remove('bi-sun-fill');
            icon.classList.add('bi-moon-fill');
            toggleTheme.title = 'Mudar para modo escuro';
        }
    }

    // Inicializa o histórico
    let historicoCalculos = JSON.parse(localStorage.getItem('historicoCalculos')) || [];

    // Formatação de moeda para os campos de entrada
    const precoCustoInput = document.getElementById('precoCusto');
    const custoAdicionalInput = document.getElementById('custoAdicional');
    
    // Aplicar máscara de moeda
    const aplicarMascaraMoeda = (elemento) => {
        elemento.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            valor = (parseFloat(valor) / 100).toFixed(2);
            e.target.value = formatarMoeda(valor);
        });
    };

    aplicarMascaraMoeda(precoCustoInput);
    aplicarMascaraMoeda(custoAdicionalInput);

    // Toggle para os detalhes do cálculo
    toggleDetalhes.addEventListener('click', function() {
        const detalhesDiv = document.getElementById('detalhes-calculo');
        const icon = this.querySelector('i');
        
        if (detalhesDiv.classList.contains('show')) {
            detalhesDiv.classList.remove('show');
            icon.classList.remove('bi-chevron-up');
            icon.classList.add('bi-chevron-down');
        } else {
            detalhesDiv.classList.add('show');
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-up');
        }
    });

    // Atualizar opção de parcelamento selecionada
    parcelasSelect.addEventListener('change', function() {
        if (dadosCalculo) {
            atualizarOpcaoParcelamento(dadosCalculo);
        }
    });

    function atualizarOpcaoParcelamento(data) {
        const opcoesParcelamento = document.getElementById('opcoesParcelamento');
        const parcelas = parseInt(parcelasSelect.value);
        
        if (parcelas === 1) {
            // Mostrar opção à vista no crédito
            opcoesParcelamento.innerHTML = `
                <div class="mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span>À vista no crédito</span>
                        <span>${formatarMoeda(data.preco_credito)}</span>
                    </div>
                    <small class="text-muted">Taxa: ${data.taxa_credito}% - Você recebe: ${formatarMoeda(data.preco_credito * (1 - data.taxa_credito/100))}</small>
                    <small class="text-${data.lucro_credito >= 0 ? 'success' : 'danger'} d-block">
                        ${data.lucro_credito >= 0 ? 'Lucro' : 'Prejuízo'}: ${formatarMoeda(Math.abs(data.lucro_credito))}
                    </small>
                </div>
            `;
        } else {
            // Mostrar opção de parcelamento selecionada
            const info = data.opcoes_parcelamento[parcelas];
            opcoesParcelamento.innerHTML = `
                <div class="mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span>${parcelas}x de ${formatarMoeda(info.valor_parcela)}</span>
                        <span>${formatarMoeda(info.valor_total)}</span>
                    </div>
                    <small class="text-muted">
                        ${parcelas <= 3 ? 
                            `Você recebe: ${formatarMoeda(info.valor_recebido)} - Custo do parcelamento: ${formatarMoeda(info.custo_parcelamento)}` :
                            `Taxa: ${info.taxa}% - Você recebe: ${formatarMoeda(info.valor_recebido)}`
                        }
                    </small>
                    <small class="text-${info.lucro >= 0 ? 'success' : 'danger'} d-block">
                        ${info.lucro >= 0 ? 'Lucro' : 'Prejuízo'}: ${formatarMoeda(Math.abs(info.lucro))}
                    </small>
                </div>
            `;
        }
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Obter valores dos campos
        const precoCusto = parseFloat(precoCustoInput.value.replace('R$', '').replace('.', '').replace(',', '.'));
        const custoAdicional = parseFloat(custoAdicionalInput.value.replace('R$', '').replace('.', '').replace(',', '.')) || 0;
        const porcentagemLucro = parseFloat(document.getElementById('porcentagemLucro').value);

        try {
            const response = await fetch('/calcular', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    preco_custo: precoCusto,
                    custo_adicional: custoAdicional,
                    porcentagem_lucro: porcentagemLucro
                })
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            // Armazenar dados do cálculo
            dadosCalculo = data;

            // Mostrar a seção de resultados
            resultados.classList.remove('d-none');

            // Atualizar os resultados básicos
            document.getElementById('precoFinal').textContent = formatarMoeda(data.preco_final);
            document.getElementById('precoPix').textContent = formatarMoeda(data.preco_pix);

            // Atualizar opção de parcelamento selecionada
            atualizarOpcaoParcelamento(data);

            // Atualizar detalhes do cálculo
            atualizarDetalhesCalculo(data);

            // Adicionar ao histórico
            adicionarAoHistorico(data);

            // Scroll suave até os resultados
            setTimeout(() => {
                resultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message || 'Erro ao calcular os preços. Por favor, tente novamente.');
        }
    });

    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    function formatarPorcentagem(valor) {
        return `${valor.toFixed(1)}%`;
    }

    function atualizarDetalhesCalculo(data) {
        const detalhesHtml = `
            <div class="card-body">
                <div class="calculation-step">
                    <h6>Composição do Preço:</h6>
                    <p>Custo Base: ${formatarMoeda(data.preco_custo)}</p>
                    <p>Custo Adicional: ${formatarMoeda(data.custo_adicional)}</p>
                    <p>Custo Total: ${formatarMoeda(data.preco_custo + data.custo_adicional)}</p>
                    <p>Margem de Lucro (${formatarPorcentagem(data.porcentagem_lucro)}): 
                       ${formatarMoeda(data.lucro_vista)}</p>
                    <p class="fw-bold">Preço Final: ${formatarMoeda(data.preco_final)}</p>
                </div>
                
                <div class="calculation-step mt-3">
                    <h6>Análise PIX:</h6>
                    <p>Taxa PIX: GRÁTIS</p>
                    <p>Você recebe: ${formatarMoeda(data.preco_pix)}</p>
                    <p class="text-${data.lucro_pix >= 0 ? 'success' : 'danger'}">
                        ${data.lucro_pix >= 0 ? 'Lucro' : 'Prejuízo'} no PIX: ${formatarMoeda(Math.abs(data.lucro_pix))}
                    </p>
                </div>

                <div class="calculation-step mt-3">
                    <h6>Análise Cartão de Crédito:</h6>
                    <p>Taxa Crédito à Vista: ${formatarPorcentagem(data.taxa_credito)}</p>
                    <p>Você recebe: ${formatarMoeda(data.preco_credito * (1 - data.taxa_credito/100))}</p>
                    <p class="text-${data.lucro_credito >= 0 ? 'success' : 'danger'}">
                        ${data.lucro_credito >= 0 ? 'Lucro' : 'Prejuízo'} no Crédito: ${formatarMoeda(Math.abs(data.lucro_credito))}
                    </p>
                </div>
            </div>
        `;
        
        detalhesCalculo.innerHTML = detalhesHtml;
    }

    function adicionarAoHistorico(data) {
        const agora = new Date();
        const registro = {
            data: agora.toLocaleString(),
            valores: data
        };
        
        historicoCalculos.unshift(registro);
        if (historicoCalculos.length > 5) {
            historicoCalculos.pop();
        }
        
        localStorage.setItem('historicoCalculos', JSON.stringify(historicoCalculos));
        atualizarHistorico();
    }

    function atualizarHistorico() {
        historico.innerHTML = '';
        
        if (historicoCalculos.length === 0) {
            historico.innerHTML = '<p class="text-muted">Nenhum cálculo realizado ainda.</p>';
            return;
        }

        historicoCalculos.forEach((registro, index) => {
            const div = document.createElement('div');
            div.className = 'calculation-step';
            div.innerHTML = `
                <small class="text-muted">${registro.data}</small>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div>
                        <p class="mb-1">Custo: ${formatarMoeda(registro.valores.preco_custo)}</p>
                        <p class="mb-1">À Vista: ${formatarMoeda(registro.valores.preco_final)}</p>
                        <p class="mb-1">PIX: ${formatarMoeda(registro.valores.preco_pix)}</p>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="recarregarCalculo(${index})">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                </div>
            `;
            historico.appendChild(div);
        });
    }

    // Recarregar cálculo do histórico
    window.recarregarCalculo = function(index) {
        const registro = historicoCalculos[index];
        if (registro) {
            precoCustoInput.value = formatarMoeda(registro.valores.preco_custo);
            custoAdicionalInput.value = formatarMoeda(registro.valores.custo_adicional);
            document.getElementById('porcentagemLucro').value = registro.valores.porcentagem_lucro;
            form.dispatchEvent(new Event('submit'));
        }
    };

    // Inicializar histórico
    atualizarHistorico();
}); 