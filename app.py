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
    'pix': 0.00,
    'boleto': 0.00,
    'credito': 4.20,
    '2': 6.09,
    '3': 7.01,
    '4': 7.91,
    '5': 8.79,
    '6': 9.66,
    '7': 10.52,
    '8': 11.37,
    '9': 12.21,
    '10': 13.04,
    '11': 13.86,
    '12': 16.66
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

        # Cálculo do preço final
        preco_final = preco_custo + custo_adicional
        if porcentagem_lucro > 0:
            preco_final *= (1 + porcentagem_lucro/100)
            
        # Cálculo do preço no PIX e Boleto (sem taxa)
        preco_pix = preco_final
        preco_boleto = preco_final
        lucro_pix = preco_pix - preco_custo - custo_adicional
        
        # Cálculo do preço no crédito à vista
        taxa_credito = TAXAS_INFINITE['credito']
        preco_credito = preco_final
        lucro_credito = preco_credito * (1 - taxa_credito/100) - preco_custo - custo_adicional

        # Calcular preços e lucros para cada opção de parcelamento
        opcoes_parcelamento = {}
        for parcelas, taxa in TAXAS_INFINITE.items():
            if parcelas == 'pix' or parcelas == 'boleto':
                continue
                
            if parcelas == 'credito':
                opcoes_parcelamento[parcelas] = {
                    'preco_credito': preco_credito,
                    'lucro_credito': lucro_credito,
                    'taxa_credito': taxa
                }
            else:
                num_parcelas = int(parcelas)
                if num_parcelas <= 3:
                    # Para até 3x, o vendedor recebe o valor total mas paga a taxa
                    valor_parcela = preco_final / num_parcelas
                    valor_total = preco_final
                    taxa_parcelamento = taxa
                    valor_recebido = valor_total  # Recebe o valor total
                    custo_parcelamento = valor_total * (taxa_parcelamento/100)  # Paga a taxa
                    lucro_parcelamento = valor_recebido - custo_parcelamento - preco_custo - custo_adicional
                    
                    opcoes_parcelamento[parcelas] = {
                        'valor_parcela': valor_parcela,
                        'valor_total': valor_total,
                        'taxa': taxa_parcelamento,
                        'valor_recebido': valor_recebido,
                        'custo_parcelamento': custo_parcelamento,
                        'lucro': lucro_parcelamento
                    }
                else:
                    # Para 4x ou mais, o cliente paga a taxa
                    valor_parcela = preco_final / num_parcelas
                    valor_total = preco_final * (1 + taxa/100)
                    taxa_parcelamento = taxa
                    valor_recebido = preco_final  # Recebe o valor sem a taxa
                    lucro_parcelamento = valor_recebido - preco_custo - custo_adicional
                    
                    opcoes_parcelamento[parcelas] = {
                        'valor_parcela': valor_parcela,
                        'valor_total': valor_total,
                        'taxa': taxa_parcelamento,
                        'valor_recebido': valor_recebido,
                        'lucro': lucro_parcelamento
                    }

        # Log dos resultados
        logger.info(f"Resultados calculados: final={preco_final}, pix={preco_pix}")

        return jsonify({
            'preco_custo': preco_custo,
            'custo_adicional': custo_adicional,
            'porcentagem_lucro': porcentagem_lucro,
            'preco_final': preco_final,
            'lucro_pix': lucro_pix,
            'preco_boleto': preco_boleto,
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