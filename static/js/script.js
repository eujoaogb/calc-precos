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
        
        // Obter valores dos campos
        const precoCusto = parseFloat(precoCustoInput.value.replace('R$', '').replace('.', '').replace(',', '.'));
        const margemLucro = parseFloat(document.getElementById('margemLucro').value);
        const descontoPix = parseFloat(document.getElementById('descontoPix').value);
        const custoAdicional = parseFloat(custoAdicionalInput.value.replace('R$', '').replace('.', '').replace(',', '.')) || 0;
        const numParcelas = parseInt(document.getElementById('numParcelas').value);
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
                    margem_lucro: margemLucro,
                    desconto_pix: descontoPix,
                    taxa_parcelamento: taxaParcelamento,
                    num_parcelas: numParcelas
                })
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            atualizarResultados(data);
            adicionarAoHistorico(data);
            resultados.classList.remove('d-none');
            resultados.scrollIntoView({ behavior: 'smooth' });
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
        
        // Atualizar os detalhes do cálculo
        const custoTotal = data.preco_custo + data.custo_adicional;
        const lucro = data.preco_final - custoTotal;
        const descontoPix = data.preco_final - data.preco_pix;
        
        // Atualizar a seção de detalhes
        document.getElementById('detalhesPrecoFinal').innerHTML = `
            <strong>Exemplo do cálculo:</strong><br>
            Custo do Produto: ${formatarMoeda(data.preco_custo)}<br>
            Custos Adicionais: ${formatarMoeda(data.custo_adicional)}<br>
            Custo Total: ${formatarMoeda(custoTotal)}<br>
            Margem de Lucro (${data.margem_lucro}%): ${formatarMoeda(lucro)}<br>
            <strong>Preço Final: ${formatarMoeda(data.preco_final)}</strong>
        `;

        document.getElementById('detalhesPix').innerHTML = `
            <strong>Exemplo do desconto:</strong><br>
            Preço à Vista: ${formatarMoeda(data.preco_final)}<br>
            Desconto PIX: ${data.desconto_pix}%<br>
            Economia para o cliente: ${formatarMoeda(descontoPix)}<br>
            <strong>Preço no PIX: ${formatarMoeda(data.preco_pix)}</strong>
        `;

        document.getElementById('detalhesParcelamento').innerHTML = `
            <strong>Exemplo do parcelamento:</strong><br>
            Preço à Vista: ${formatarMoeda(data.preco_final)}<br>
            Taxa de Parcelamento: ${data.taxa_parcelamento}%<br>
            Acréscimo: ${formatarMoeda(data.preco_parcelado - data.preco_final)}<br>
            <strong>Preço Parcelado: ${formatarMoeda(data.preco_parcelado)}</strong><br>
            ${data.num_parcelas}x de ${formatarMoeda(data.preco_parcelado / data.num_parcelas)}
        `;

        // Mostrar a seção de resultados e detalhes
        document.getElementById('resultados').classList.remove('d-none');
        document.getElementById('detalhes-calculo').style.display = 'block';
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
        document.getElementById('margemLucro').value = registro.valores.margem_lucro;
        document.getElementById('descontoPix').value = registro.valores.desconto_pix;
        document.getElementById('numParcelas').value = registro.valores.num_parcelas;
        document.getElementById('taxaParcelamento').value = registro.valores.taxa_parcelamento;
        
        document.getElementById('calculadoraForm').dispatchEvent(new Event('submit'));
    }
}

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
    const margemLucro = parseFloat(document.getElementById('margemLucro').value) || 0;
    const descontoPix = parseFloat(document.getElementById('descontoPix').value) || 0;
    const taxaParcelamento = parseFloat(document.getElementById('taxaParcelamento').value) || 0;
    const numParcelas = parseInt(document.getElementById('numParcelas').value) || 1;

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
            margem_lucro: margemLucro,
            desconto_pix: descontoPix,
            taxa_parcelamento: taxaParcelamento,
            num_parcelas: numParcelas
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