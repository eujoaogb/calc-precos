document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('calculadoraForm');
    const resultados = document.getElementById('resultados');
    const toggleDetailsBtn = document.getElementById('toggle-details');
    const detalhesCalculo = document.getElementById('detalhes-calculo');
    
    // Toggle detalhes do cálculo
    toggleDetailsBtn.addEventListener('click', function() {
        if (detalhesCalculo.style.display === 'none') {
            detalhesCalculo.style.display = 'block';
            detalhesCalculo.style.opacity = '0';
            setTimeout(() => {
                detalhesCalculo.style.opacity = '1';
            }, 10);
        } else {
            detalhesCalculo.style.opacity = '0';
            setTimeout(() => {
                detalhesCalculo.style.display = 'none';
            }, 200);
        }
    });
    
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

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Obter valores dos campos
        const precoCusto = parseFloat(precoCustoInput.value.replace('R$', '').replace('.', '').replace(',', '.'));
        const porcentagemLucro = parseFloat(document.getElementById('porcentagemLucro').value);
        const porcentagemPix = parseFloat(document.getElementById('porcentagemPix').value);
        const custoAdicional = parseFloat(custoAdicionalInput.value.replace('R$', '').replace('.', '').replace(',', '.')) || 0;

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
                    custo_adicional: custoAdicional
                })
            });

            const data = await response.json();
            atualizarResultados(data);
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

    function atualizarResultados(data) {
        document.getElementById('precoFinal').textContent = formatarMoeda(data.preco_final);
        document.getElementById('precoPix').textContent = formatarMoeda(data.preco_pix);
        document.getElementById('precoParcelado').textContent = formatarMoeda(data.preco_parcelado);
        
        atualizarDetalhesCalculo(data);
    }

    function atualizarDetalhesCalculo(data) {
        const custoTotal = data.preco_custo + data.custo_adicional;
        const lucro = data.preco_final - custoTotal;
        const descontoPix = data.preco_final - data.preco_pix;
        
        const detalhesHtml = `
            <h6>Composição do Preço:</h6>
            <p>Custo Base: ${formatarMoeda(data.preco_custo)}</p>
            <p>Custo Adicional: ${formatarMoeda(data.custo_adicional)}</p>
            <p>Custo Total: ${formatarMoeda(custoTotal)}</p>
            <p>Margem de Lucro (${data.porcentagem_lucro}%): ${formatarMoeda(lucro)}</p>
            <p>Preço Final: ${formatarMoeda(data.preco_final)}</p>
            
            <h6>Desconto PIX (${data.porcentagem_pix}%):</h6>
            <p>Valor do Desconto: ${formatarMoeda(descontoPix)}</p>
            <p>Preço Final PIX: ${formatarMoeda(data.preco_pix)}</p>
            
            <h6>Parcelamento:</h6>
            <p>Preço em até 12x: ${formatarMoeda(data.preco_parcelado)}</p>
            <p>Valor da Parcela: ${formatarMoeda(data.preco_parcelado / 12)}</p>
        `;
        
        detalhesCalculo.innerHTML = detalhesHtml;
    }
}); 