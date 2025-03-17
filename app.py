from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        porcentagem_pix = float(dados.get('porcentagem_pix', 0))
        max_parcelas = int(dados.get('max_parcelas', 1))
        taxa_parcelamento = float(dados.get('taxa_parcelamento', 0))

        # Log dos dados recebidos
        logger.info(f"Dados recebidos: {dados}")

        # Validar dados
        if preco_custo < 0 or porcentagem_lucro < 0 or porcentagem_pix < 0 or taxa_parcelamento < 0:
            raise ValueError("Os valores não podem ser negativos")

        # Cálculos
        custo_total = preco_custo + custo_adicional
        margem_lucro = custo_total * (porcentagem_lucro / 100)
        preco_final = custo_total + margem_lucro
        lucro_vista = preco_final - custo_total

        # Cálculo do preço no PIX
        desconto_pix = preco_final * (porcentagem_pix / 100)
        preco_pix = preco_final - desconto_pix
        lucro_pix = preco_pix - custo_total

        # Cálculo do preço parcelado
        preco_parcelado = preco_final * (1 + taxa_parcelamento / 100)

        # Log dos resultados
        logger.info(f"Resultados calculados: final={preco_final}, pix={preco_pix}, parcelado={preco_parcelado}")

        return jsonify({
            'preco_custo': preco_custo,
            'custo_adicional': custo_adicional,
            'porcentagem_lucro': porcentagem_lucro,
            'porcentagem_pix': porcentagem_pix,
            'preco_final': preco_final,
            'lucro_vista': lucro_vista,
            'preco_pix': preco_pix,
            'lucro_pix': lucro_pix,
            'preco_parcelado': preco_parcelado,
            'max_parcelas': max_parcelas,
            'taxa_parcelamento': taxa_parcelamento
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