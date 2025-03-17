document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('calculadoraForm');
    const resultados = document.getElementById('resultados');
    const detalhesCalculo = document.getElementById('detalhes-calculo');
    const toggleDetalhes = document.getElementById('toggleDetalhes');
    const historico = document.getElementById('historico-calculos');

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
        
        // Obter valores dos campos
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
                    porcentagem_lucro: porcentagemLucro,
                    porcentagem_pix: porcentagemPix,
                    custo_adicional: custoAdicional,
                    max_parcelas: maxParcelas,
                    taxa_parcelamento: taxaParcelamento
                })
            });

            const data = await response.json();
            atualizarResultados(data);
            adicionarAoHistorico(data);
            resultados.classList.remove('d-none');
            resultados.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao calcular os preços. Por favor, tente novamente.');
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
                <p>Desconto PIX (${formatarPorcentagem(data.porcentagem_pix)}): ${formatarMoeda(descontoPix)}</p>
                <p>Preço Final PIX: ${formatarMoeda(data.preco_pix)}</p>
                <p>Lucro no PIX: ${formatarMoeda(data.lucro_pix)}</p>
            </div>
            
            <div class="calculation-step">
                <h6>Análise Parcelamento:</h6>
                <p>Taxa de Parcelamento (${formatarPorcentagem(data.taxa_parcelamento)}): ${formatarMoeda(data.preco_parcelado - data.preco_final)}</p>
                <p>Preço Final Parcelado: ${formatarMoeda(data.preco_parcelado)}</p>
                <p>Parcelas disponíveis: até ${data.max_parcelas}x de ${formatarMoeda(data.preco_parcelado / data.max_parcelas)}</p>
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
});

// Função global para recarregar cálculo do histórico
function recarregarCalculo(index) {
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
} 