document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('calculadoraForm');
    const resultados = document.getElementById('resultados');
    const detalhesCalculo = document.getElementById('detalhes-calculo');
    const toggleDetalhes = document.getElementById('toggleDetalhes');
    const historico = document.getElementById('historico-calculos');
    const toggleTheme = document.getElementById('toggleTheme');

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

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Obter valores dos campos com os IDs corretos
        const precoCusto = parseFloat(precoCustoInput.value.replace('R$', '').replace('.', '').replace(',', '.'));
        const porcentagemLucro = parseFloat(document.getElementById('porcentagemLucro').value);
        const porcentagemPix = parseFloat(document.getElementById('porcentagemPix').value);
        const custoAdicional = parseFloat(custoAdicionalInput.value.replace('R$', '').replace('.', '').replace(',', '.')) || 0;
        const maxParcelas = parseInt(document.getElementById('maxParcelas').value);
        const taxaParcelamento = parseFloat(document.getElementById('taxaParcelamento').value);

        try {
            const response = await fetch('/calcular', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    preco_custo: precoCusto,
                    custo_adicional: custoAdicional,
                    porcentagem_lucro: porcentagemLucro,
                    porcentagem_pix: porcentagemPix,
                    taxa_parcelamento: taxaParcelamento,
                    max_parcelas: maxParcelas
                })
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            atualizarResultados(data);
            adicionarAoHistorico(data);
            
            // Corrigir o scroll para os resultados
            setTimeout(() => {
                const resultadosElement = document.getElementById('resultados');
                if (resultadosElement) {
                    const offset = resultadosElement.offsetTop - 20; // 20px de margem
                    window.scrollTo({
                        top: offset,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message || 'Erro ao calcular os preços. Por favor, tente novamente.');
        }
    });

    function formatarMoeda(valor) {
        return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
    }

    function formatarPorcentagem(valor) {
        return `${valor.toFixed(1)}%`;
    }

    function atualizarResultados(data) {
        document.getElementById('precoFinal').textContent = formatarMoeda(data.preco_final);
        document.getElementById('precoPix').textContent = formatarMoeda(data.preco_pix);
        document.getElementById('precoParcelado').textContent = formatarMoeda(data.preco_parcelado);
        document.getElementById('lucroVista').textContent = formatarMoeda(data.lucro_vista);
        document.getElementById('lucroPix').textContent = formatarMoeda(data.lucro_pix);
        
        // Atualiza as opções de parcelamento
        const opcoesParcelamento = document.getElementById('opcoesParcelamento');
        opcoesParcelamento.innerHTML = '';
        
        for (let i = 1; i <= data.max_parcelas; i++) {
            const valorParcela = data.preco_parcelado / i;
            const div = document.createElement('div');
            div.className = 'mb-2';
            div.innerHTML = `
                <small class="text-muted">
                    ${i}x de ${formatarMoeda(valorParcela)}
                    ${i === 1 ? ' (à vista)' : ' sem juros'}
                </small>
            `;
            opcoesParcelamento.appendChild(div);
        }
        
        atualizarDetalhesCalculo(data);
    }

    function atualizarDetalhesCalculo(data) {
        const custoTotal = data.preco_custo + data.custo_adicional;
        const lucro = data.preco_final - custoTotal;
        const descontoPix = data.preco_final - data.preco_pix;
        const lucroPix = data.preco_pix - custoTotal;
        const lucroParcelado = data.preco_parcelado - custoTotal;
        const taxaParceladoValor = data.preco_parcelado - data.preco_final;
        
        const detalhesHtml = `
            <div class="calculation-step">
                <h6>Composição do Preço:</h6>
                <p>Custo Base: ${formatarMoeda(data.preco_custo)}</p>
                <p>Custo Adicional: ${formatarMoeda(data.custo_adicional)}</p>
                <p>Custo Total: ${formatarMoeda(custoTotal)}</p>
                <p>Margem de Lucro (${formatarPorcentagem(data.porcentagem_lucro)}): ${formatarMoeda(lucro)}</p>
                <p class="fw-bold">Preço Final: ${formatarMoeda(data.preco_final)}</p>
            </div>
            
            <div class="calculation-step">
                <h6>Análise PIX:</h6>
                <p>Preço à Vista: ${formatarMoeda(data.preco_final)}</p>
                <p>Desconto PIX (${formatarPorcentagem(data.porcentagem_pix)}): -${formatarMoeda(descontoPix)}</p>
                <p class="fw-bold">Preço Final PIX: ${formatarMoeda(data.preco_pix)}</p>
                <p class="text-${lucroPix >= 0 ? 'success' : 'danger'}">
                    ${lucroPix >= 0 ? 'Lucro' : 'Prejuízo'} no PIX: ${formatarMoeda(Math.abs(lucroPix))}
                    <small class="text-muted">(${formatarPorcentagem((lucroPix/custoTotal) * 100)} sobre o custo)</small>
                </p>
            </div>
            
            <div class="calculation-step">
                <h6>Análise Parcelamento:</h6>
                <p>Preço à Vista: ${formatarMoeda(data.preco_final)}</p>
                <p>Taxa de Parcelamento (${formatarPorcentagem(data.taxa_parcelamento)}): +${formatarMoeda(taxaParceladoValor)}</p>
                <p class="fw-bold">Preço Final Parcelado: ${formatarMoeda(data.preco_parcelado)}</p>
                <p class="text-${lucroParcelado >= 0 ? 'success' : 'danger'}">
                    ${lucroParcelado >= 0 ? 'Lucro' : 'Prejuízo'} no Parcelado: ${formatarMoeda(Math.abs(lucroParcelado))}
                    <small class="text-muted">(${formatarPorcentagem((lucroParcelado/custoTotal) * 100)} sobre o custo)</small>
                </p>
                
                <div class="alert alert-info mt-3">
                    <h6 class="mb-2"><i class="bi bi-info-circle"></i> Informações sobre o Parcelamento:</h6>
                    <p class="mb-2">
                        <strong>Taxa da Maquininha:</strong> ${formatarPorcentagem(data.taxa_parcelamento)}
                        <br>
                        <small class="text-muted">Esta é a taxa que a maquininha/operadora cobra por venda parcelada</small>
                    </p>
                    <p class="mb-2">
                        <strong>Custo da Taxa:</strong> ${formatarMoeda(taxaParceladoValor)}
                        <br>
                        <small class="text-muted">Este é o valor que você paga para a operadora do cartão</small>
                    </p>
                    <p class="mb-0">
                        <strong>Lucro Real por Parcela:</strong>
                        <br>
                        <small class="text-muted">Seu lucro real considerando a taxa do parcelamento:</small>
                    </p>
                </div>

                <div class="mt-3">
                    <h6>Opções de Parcelamento:</h6>
                    <div class="row">
                        ${Array.from({length: data.max_parcelas}, (_, i) => i + 1).map(parcela => {
                            const valorParcela = data.preco_parcelado / parcela;
                            const lucroRealPorParcela = (data.preco_parcelado - taxaParceladoValor - custoTotal) / parcela;
                            return `
                                <div class="col-md-4 mb-2">
                                    <div class="card">
                                        <div class="card-body p-2">
                                            <h6 class="mb-1">${parcela}x de ${formatarMoeda(valorParcela)}</h6>
                                            <small class="text-muted d-block">Total: ${formatarMoeda(data.preco_parcelado)}</small>
                                            <small class="text-${lucroRealPorParcela >= 0 ? 'success' : 'danger'}">
                                                Lucro por parcela: ${formatarMoeda(lucroRealPorParcela)}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
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

    // Carrega o histórico ao iniciar
    atualizarHistorico();

    // Calculadora de Descontos
    const calculadoraDescontoForm = document.getElementById('calculadoraDescontoForm');
    const resultadosDesconto = document.getElementById('resultadosDesconto');
    const precoOriginalInput = document.getElementById('precoOriginal');
    const tipoDescontoSelect = document.getElementById('tipoDesconto');
    const valorDescontoInput = document.getElementById('valorDesconto');

    // Aplicar máscara de moeda ao preço original
    aplicarMascaraMoeda(precoOriginalInput);

    // Atualizar placeholder do valor do desconto baseado no tipo selecionado
    tipoDescontoSelect.addEventListener('change', function() {
        const tipo = this.value;
        valorDescontoInput.placeholder = tipo === 'porcentagem' ? 'Digite a porcentagem' : 'Digite o valor em R$';
        valorDescontoInput.value = '';
    });

    calculadoraDescontoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const precoOriginal = parseFloat(precoOriginalInput.value.replace('R$', '').replace('.', '').replace(',', '.'));
        const tipoDesconto = tipoDescontoSelect.value;
        const valorDesconto = parseFloat(valorDescontoInput.value);

        if (isNaN(precoOriginal) || isNaN(valorDesconto)) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        let valorDescontoReais;
        let porcentagemDesconto;

        if (tipoDesconto === 'porcentagem') {
            if (valorDesconto < 0 || valorDesconto > 100) {
                alert('A porcentagem de desconto deve estar entre 0 e 100.');
                return;
            }
            valorDescontoReais = (precoOriginal * valorDesconto) / 100;
            porcentagemDesconto = valorDesconto;
        } else {
            if (valorDesconto > precoOriginal) {
                alert('O valor do desconto não pode ser maior que o preço original.');
                return;
            }
            valorDescontoReais = valorDesconto;
            porcentagemDesconto = (valorDesconto / precoOriginal) * 100;
        }

        const precoFinal = precoOriginal - valorDescontoReais;

        // Atualizar resultados
        document.getElementById('precoOriginalResultado').textContent = formatarMoeda(precoOriginal);
        document.getElementById('valorDescontoResultado').textContent = formatarMoeda(valorDescontoReais);
        document.getElementById('porcentagemDescontoResultado').textContent = `${porcentagemDesconto.toFixed(1)}%`;
        document.getElementById('precoFinalDesconto').textContent = formatarMoeda(precoFinal);
        document.getElementById('economiaTotal').textContent = formatarMoeda(valorDescontoReais);

        // Mostrar resultados e corrigir scroll
        resultadosDesconto.classList.remove('d-none');
        setTimeout(() => {
            const offset = resultadosDesconto.offsetTop - 20; // 20px de margem
            window.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        }, 100);
    });

    // Atualizar a função recarregarCalculo para usar os IDs corretos
    window.recarregarCalculo = function(index) {
        const historicoCalculos = JSON.parse(localStorage.getItem('historicoCalculos')) || [];
        const registro = historicoCalculos[index];
        
        if (registro) {
            document.getElementById('precoCusto').value = formatarMoeda(registro.valores.preco_custo);
            document.getElementById('custoAdicional').value = formatarMoeda(registro.valores.custo_adicional);
            document.getElementById('porcentagemLucro').value = registro.valores.porcentagem_lucro;
            document.getElementById('porcentagemPix').value = registro.valores.porcentagem_pix;
            document.getElementById('maxParcelas').value = registro.valores.max_parcelas;
            document.getElementById('taxaParcelamento').value = registro.valores.taxa_parcelamento;
            
            document.getElementById('calculadoraForm').dispatchEvent(new Event('submit'));
        }
    };
});

function atualizarDetalhesCalculo(precoCusto, custoAdicional, margemLucro, descontoPix, taxaParcelamento, numParcelas) {
    const custoTotal = precoCusto + custoAdicional;
    const margemValor = custoTotal * (margemLucro / 100);
    const precoFinal = custoTotal + margemValor;
    const precoPix = precoFinal * (1 - descontoPix / 100);
    const precoParcelado = precoFinal * (1 + taxaParcelamento / 100);

    // Detalhes do Preço Final
    document.getElementById('detalhesPrecoFinal').innerHTML = `
        <strong>Exemplo do cálculo:</strong><br>
        Custo do Produto: ${formatarMoeda(precoCusto)}<br>
        Custos Adicionais: ${formatarMoeda(custoAdicional)}<br>
        Custo Total: ${formatarMoeda(custoTotal)}<br>
        Margem de Lucro (${margemLucro}%): ${formatarMoeda(margemValor)}<br>
        <strong>Preço Final: ${formatarMoeda(precoFinal)}</strong>
    `;

    // Detalhes do PIX
    const economiaPixReais = precoFinal - precoPix;
    document.getElementById('detalhesPix').innerHTML = `
        <strong>Exemplo do desconto:</strong><br>
        Preço à Vista: ${formatarMoeda(precoFinal)}<br>
        Desconto PIX: ${descontoPix}%<br>
        Economia para o cliente: ${formatarMoeda(economiaPixReais)}<br>
        <strong>Preço no PIX: ${formatarMoeda(precoPix)}</strong>
    `;

    // Detalhes do Parcelamento
    const valorParcela = precoParcelado / numParcelas;
    const acrescimoReais = precoParcelado - precoFinal;
    document.getElementById('detalhesParcelamento').innerHTML = `
        <strong>Exemplo do parcelamento:</strong><br>
        Preço à Vista: ${formatarMoeda(precoFinal)}<br>
        Taxa de Parcelamento: ${taxaParcelamento}%<br>
        Acréscimo: ${formatarMoeda(acrescimoReais)}<br>
        <strong>Preço Parcelado: ${formatarMoeda(precoParcelado)}</strong><br>
        ${numParcelas}x de ${formatarMoeda(valorParcela)}
    `;

    // Mostrar a seção de detalhes
    document.getElementById('detalhes-calculo').style.display = 'block';
}

function atualizarResultados(event) {
    event.preventDefault();

    // Obter valores do formulário e converter para números
    const precoCusto = parseFloat(document.getElementById('precoCusto').value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const custoAdicional = parseFloat(document.getElementById('custoAdicional').value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const margemLucro = parseFloat(document.getElementById('porcentagemLucro').value) || 0;
    const descontoPix = parseFloat(document.getElementById('porcentagemPix').value) || 0;
    const taxaParcelamento = parseFloat(document.getElementById('taxaParcelamento').value) || 0;
    const numParcelas = parseInt(document.getElementById('maxParcelas').value) || 1;

    // Validar valores
    if (precoCusto < 0 || margemLucro < 0 || descontoPix < 0 || taxaParcelamento < 0) {
        alert('Os valores não podem ser negativos');
        return;
    }

    // Fazer a requisição para calcular os preços
    fetch('/calcular', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            preco_custo: precoCusto,
            custo_adicional: custoAdicional,
            porcentagem_lucro: margemLucro,
            porcentagem_pix: descontoPix,
            taxa_parcelamento: taxaParcelamento,
            max_parcelas: numParcelas
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }

        // Atualizar os resultados
        document.getElementById('precoFinal').textContent = formatarMoeda(data.preco_final);
        document.getElementById('precoPix').textContent = formatarMoeda(data.preco_pix);
        document.getElementById('precoParcelado').textContent = formatarMoeda(data.preco_parcelado);

        // Mostrar a seção de resultados
        document.getElementById('resultados').classList.remove('d-none');

        // Atualizar os detalhes do cálculo
        atualizarDetalhesCalculo(precoCusto, custoAdicional, margemLucro, descontoPix, taxaParcelamento, numParcelas);

        // Salvar no histórico
        salvarCalculo({
            precoCusto,
            custoAdicional,
            margemLucro,
            descontoPix,
            taxaParcelamento,
            numParcelas,
            resultados: data
        });
    })
    .catch(error => {
        console.error('Erro:', error);
        alert(error.message || 'Erro ao calcular os preços. Por favor, tente novamente.');
    });
}

// Função para formatar valores em moeda brasileira
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
} 