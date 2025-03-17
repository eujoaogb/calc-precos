document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('calculadora-form');
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
    
    // Formata um número para moeda brasileira
    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
    
    // Atualiza os detalhes do cálculo
    function atualizarDetalhesCalculo(data) {
        // Cálculo do Preço Final
        document.getElementById('calculo-preco-final').innerHTML = `
            <div class="calculation-step">
                <p>1. Preço de Custo: ${formatarMoeda(data.preco_custo)}</p>
                <p>2. Acréscimo Fixo: + R$ 30,00</p>
                <p>3. Subtotal: ${formatarMoeda(data.preco_custo + 30)}</p>
                <p>4. Margem de Lucro (30%): + ${formatarMoeda((data.preco_custo + 30) * 0.30)}</p>
                <p class="fw-bold">Preço Final: ${formatarMoeda(data.preco_final)}</p>
            </div>
        `;

        // Cálculo do PIX
        document.getElementById('calculo-pix').innerHTML = `
            <div class="calculation-step">
                <p>1. Preço Final: ${formatarMoeda(data.preco_final)}</p>
                <p>2. Desconto PIX (5%): - ${formatarMoeda(data.desconto_pix)}</p>
                <p class="fw-bold">Preço no PIX: ${formatarMoeda(data.preco_pix)}</p>
                <p>Lucro no PIX: ${formatarMoeda(data.lucro_pix)}</p>
            </div>
        `;

        // Cálculo do Parcelamento
        document.getElementById('calculo-parcelamento').innerHTML = `
            <div class="calculation-step">
                <p>1. Preço Final: ${formatarMoeda(data.preco_final)}</p>
                <p>2. Taxa de Parcelamento (7,01%): - ${formatarMoeda(data.custo_parcelamento)}</p>
                <p>3. Valor da Parcela (3x): ${formatarMoeda(data.valor_parcela)}</p>
                <p class="fw-bold">Lucro no Parcelamento: ${formatarMoeda(data.lucro_parcelado)}</p>
            </div>
        `;
    }
    
    // Atualiza os valores na interface
    function atualizarResultados(data) {
        if (data.erro) {
            alert(data.erro);
            return;
        }
        
        // Atualiza os preços
        document.getElementById('preco_final').textContent = formatarMoeda(data.preco_final);
        document.getElementById('preco_pix').textContent = formatarMoeda(data.preco_pix);
        document.getElementById('valor_parcela').textContent = formatarMoeda(data.valor_parcela);
        
        // Atualiza os lucros
        document.getElementById('lucro_vista').textContent = formatarMoeda(data.lucro_vista);
        document.getElementById('lucro_pix').textContent = formatarMoeda(data.lucro_pix);
        document.getElementById('lucro_parcelado').textContent = formatarMoeda(data.lucro_parcelado);
        
        // Atualiza os custos
        document.getElementById('desconto_pix').textContent = formatarMoeda(data.desconto_pix);
        document.getElementById('custo_parcelamento').textContent = formatarMoeda(data.custo_parcelamento);
        
        // Atualiza os detalhes do cálculo
        atualizarDetalhesCalculo(data);
        
        // Mostra os resultados com animação
        resultados.classList.remove('d-none');
    }
    
    // Manipula o envio do formulário
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const precoCusto = parseFloat(document.getElementById('preco_custo').value);
        
        fetch('/calcular', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                preco_custo: precoCusto
            })
        })
        .then(response => response.json())
        .then(data => atualizarResultados(data))
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao calcular os preços. Por favor, tente novamente.');
        });
    });
    
    // Adiciona máscara de moeda ao input
    const precoCustoInput = document.getElementById('preco_custo');
    precoCustoInput.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Remove tudo que não é número
        value = value.replace(/[^\d]/g, '');
        
        // Converte para número com 2 casas decimais
        value = (parseFloat(value) / 100).toFixed(2);
        
        // Atualiza o valor apenas se for um número válido
        if (!isNaN(value)) {
            e.target.value = value;
        }
    });
}); 