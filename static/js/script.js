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
        const parcelasSelect = document.getElementById('parcelasSelect');
        const opcaoParcelamento = document.getElementById('opcaoParcelamento');
        const parcelas = parcelasSelect.value;
        
        if (parcelas === '1') {
            // Mostrar opção de crédito à vista
            opcaoParcelamento.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Crédito à Vista</h5>
                    </div>
                    <div class="card-body">
                        <p>Valor Total: ${formatarMoeda(data.preco_credito)}</p>
                        <p>Taxa (4.20%): ${formatarMoeda(data.preco_credito * 0.042)}</p>
                        <p>Você recebe: ${formatarMoeda(data.preco_credito * 0.958)}</p>
                        <p class="text-${data.lucro_credito >= 0 ? 'success' : 'danger'}">
                            ${data.lucro_credito >= 0 ? 'Lucro' : 'Prejuízo'}: ${formatarMoeda(Math.abs(data.lucro_credito))}
                        </p>
                    </div>
                </div>
            `;
        } else {
            // Mostrar opção de parcelamento
            const parcelamentoData = data[`parcelas_${parcelas}`];
            if (parcelamentoData) {
                let html = `
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Parcelamento em ${parcelas}x</h5>
                        </div>
                        <div class="card-body">
                            <p>Valor da Parcela: ${formatarMoeda(parcelamentoData.valor_parcela)}</p>
                            <p>Valor Total: ${formatarMoeda(parcelamentoData.valor_total)}</p>
                            <p>Taxa (${formatarPorcentagem(parcelamentoData.taxa)}): ${formatarMoeda(parcelamentoData.valor_total * (parcelamentoData.taxa/100))}</p>`;
                
                if (parseInt(parcelas) <= 3) {
                    html += `
                        <p>Você recebe: ${formatarMoeda(parcelamentoData.valor_recebido)}</p>
                        <p>Custo do Parcelamento: ${formatarMoeda(parcelamentoData.custo_parcelamento)}</p>`;
                } else {
                    html += `
                        <p>Cliente paga: ${formatarMoeda(parcelamentoData.valor_total)}</p>
                        <p>Você recebe: ${formatarMoeda(parcelamentoData.valor_recebido)}</p>`;
                }
                
                html += `
                    <p class="text-${parcelamentoData.lucro >= 0 ? 'success' : 'danger'}">
                        ${parcelamentoData.lucro >= 0 ? 'Lucro' : 'Prejuízo'}: ${formatarMoeda(Math.abs(parcelamentoData.lucro))}
                    </p>
                </div>
            </div>`;
                
                opcaoParcelamento.innerHTML = html;
            }
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
            document.getElementById('precoBoleto').textContent = formatarMoeda(data.preco_boleto);

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
                    <h6>Análise PIX e Boleto:</h6>
                    <p>Taxa PIX: GRÁTIS</p>
                    <p>Taxa Boleto: GRÁTIS</p>
                    <p>Você recebe: ${formatarMoeda(data.preco_pix)}</p>
                    <p class="text-${data.lucro_pix >= 0 ? 'success' : 'danger'}">
                        ${data.lucro_pix >= 0 ? 'Lucro' : 'Prejuízo'} no PIX/Boleto: ${formatarMoeda(Math.abs(data.lucro_pix))}
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