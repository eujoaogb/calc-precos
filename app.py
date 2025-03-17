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

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True) 