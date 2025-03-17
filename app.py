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
        margem_lucro = float(dados.get('margem_lucro', 0))
        desconto_pix = float(dados.get('desconto_pix', 0))
        taxa_parcelamento = float(dados.get('taxa_parcelamento', 0))
        num_parcelas = int(dados.get('num_parcelas', 1))

        # Log dos dados recebidos
        logger.info(f"Dados recebidos: {dados}")

        # Validar dados
        if preco_custo < 0 or margem_lucro < 0 or desconto_pix < 0 or taxa_parcelamento < 0:
            raise ValueError("Os valores não podem ser negativos")

        # Cálculos
        custo_total = preco_custo + custo_adicional
        margem = custo_total * (margem_lucro / 100)
        preco_final = custo_total + margem

        # Cálculo do preço no PIX
        preco_pix = preco_final * (1 - desconto_pix / 100)

        # Cálculo do preço parcelado
        preco_parcelado = preco_final * (1 + taxa_parcelamento / 100)

        # Log dos resultados
        logger.info(f"Resultados calculados: final={preco_final}, pix={preco_pix}, parcelado={preco_parcelado}")

        return jsonify({
            'preco_final': round(preco_final, 2),
            'preco_pix': round(preco_pix, 2),
            'preco_parcelado': round(preco_parcelado, 2),
            'valor_parcela': round(preco_parcelado / num_parcelas, 2)
        })

    except ValueError as e:
        logger.error(f"Erro de validação: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Erro ao calcular preços: {str(e)}")
        return jsonify({'error': 'Erro ao calcular os preços. Por favor, tente novamente.'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True) 