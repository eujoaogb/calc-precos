from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Taxas da InfinitePay
TAXAS_INFINITE = {
    'pix': 0,  # Grátis
    'boleto': 0,  # Grátis
    'credito_vista': 4.20,
    'parcelado': {
        2: 6.09,
        3: 7.01,
        4: 7.91,
        5: 8.80,
        6: 9.67,
        7: 12.59,
        8: 13.42,
        9: 14.25,
        10: 15.06,
        11: 15.87,
        12: 16.66
    }
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calcular', methods=['POST'])
def calcular():
    try:
        dados = request.get_json()
        
        # Extrair dados com valores padrão
        preco_custo = float(dados.get('preco_custo', 0))
        custo_adicional = float(dados.get('custo_adicional', 0))
        porcentagem_lucro = float(dados.get('porcentagem_lucro', 0))

        # Log dos dados recebidos
        logger.info(f"Dados recebidos: {dados}")

        # Validar dados
        if preco_custo < 0 or porcentagem_lucro < 0:
            raise ValueError("Os valores não podem ser negativos")

        # Cálculos básicos
        custo_total = preco_custo + custo_adicional
        margem_lucro = custo_total * (porcentagem_lucro / 100)
        preco_final = custo_total + margem_lucro
        lucro_vista = preco_final - custo_total

        # Cálculo do preço no PIX (sem taxa)
        preco_pix = preco_final
        lucro_pix = preco_pix - custo_total

        # Cálculo do preço no Boleto (sem taxa)
        preco_boleto = preco_final
        lucro_boleto = preco_boleto - custo_total

        # Cálculo do preço no crédito à vista
        taxa_credito = TAXAS_INFINITE['credito_vista']
        preco_credito = preco_final
        valor_recebido_credito = preco_credito * (1 - taxa_credito/100)
        lucro_credito = valor_recebido_credito - custo_total

        # Cálculos para cada opção de parcelamento
        opcoes_parcelamento = {}
        for parcelas, taxa in TAXAS_INFINITE['parcelado'].items():
            valor_total = preco_final
            valor_parcela = valor_total / parcelas
            
            # Se for até 3x, você recebe o valor total e paga a taxa
            if parcelas <= 3:
                valor_recebido = valor_total
                custo_parcelamento = valor_total * (taxa/100)
                lucro = valor_recebido - custo_total - custo_parcelamento
            else:
                # Para mais de 3x, o cliente paga a taxa
                valor_recebido = valor_total * (1 - taxa/100)
                lucro = valor_recebido - custo_total
            
            opcoes_parcelamento[parcelas] = {
                'valor_parcela': valor_parcela,
                'valor_total': valor_total,
                'valor_recebido': valor_recebido,
                'lucro': lucro,
                'taxa': taxa,
                'custo_parcelamento': valor_total * (taxa/100) if parcelas <= 3 else 0
            }

        # Log dos resultados
        logger.info(f"Resultados calculados: final={preco_final}, pix={preco_pix}")

        return jsonify({
            'preco_custo': preco_custo,
            'custo_adicional': custo_adicional,
            'porcentagem_lucro': porcentagem_lucro,
            'preco_final': preco_final,
            'lucro_vista': lucro_vista,
            'preco_pix': preco_pix,
            'lucro_pix': lucro_pix,
            'preco_boleto': preco_boleto,
            'lucro_boleto': lucro_boleto,
            'preco_credito': preco_credito,
            'lucro_credito': lucro_credito,
            'taxa_credito': taxa_credito,
            'opcoes_parcelamento': opcoes_parcelamento
        })

    except ValueError as e:
        logger.error(f"Erro de validação: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Erro ao calcular preços: {str(e)}")
        return jsonify({'error': 'Erro ao calcular os preços. Por favor, tente novamente.'}), 500

@app.route('/calcular-desconto', methods=['POST'])
def calcular_desconto():
    try:
        dados = request.get_json()
        
        # Extrair dados
        preco_original = float(dados.get('preco_original', 0))
        tipo_desconto = dados.get('tipo_desconto', 'porcentagem')
        valor_desconto = float(dados.get('valor_desconto', 0))

        # Log dos dados recebidos
        logger.info(f"Dados recebidos para cálculo de desconto: {dados}")

        # Validar dados
        if preco_original < 0:
            raise ValueError("O preço original não pode ser negativo")
        if valor_desconto < 0:
            raise ValueError("O valor do desconto não pode ser negativo")

        # Cálculos
        if tipo_desconto == 'porcentagem':
            if valor_desconto > 100:
                raise ValueError("A porcentagem de desconto não pode ser maior que 100%")
            valor_desconto_reais = (preco_original * valor_desconto) / 100
            porcentagem_desconto = valor_desconto
        else:
            if valor_desconto > preco_original:
                raise ValueError("O valor do desconto não pode ser maior que o preço original")
            valor_desconto_reais = valor_desconto
            porcentagem_desconto = (valor_desconto / preco_original) * 100

        preco_final = preco_original - valor_desconto_reais

        # Log dos resultados
        logger.info(f"Resultados do desconto: valor={valor_desconto_reais}, porcentagem={porcentagem_desconto}, final={preco_final}")

        return jsonify({
            'preco_original': preco_original,
            'valor_desconto': valor_desconto_reais,
            'porcentagem_desconto': porcentagem_desconto,
            'preco_final': preco_final
        })

    except ValueError as e:
        logger.error(f"Erro de validação no cálculo de desconto: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Erro ao calcular desconto: {str(e)}")
        return jsonify({'error': 'Erro ao calcular o desconto. Por favor, tente novamente.'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True) 