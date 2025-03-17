from flask import Flask, render_template, request, jsonify
from decimal import Decimal, ROUND_HALF_UP

app = Flask(__name__)

def formatar_valor(valor):
    """Formata um valor decimal para duas casas decimais."""
    return Decimal(str(valor)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def calcular_precos(preco_custo):
    """Calcula os preços e lucros para diferentes formas de pagamento."""
    try:
        preco_custo = Decimal(str(preco_custo))
        
        if preco_custo <= 0:
            return {"erro": "O preço de custo deve ser maior que zero"}
        
        # Cálculos base
        preco_com_acrescimo = preco_custo + Decimal('30.00')
        preco_final = preco_com_acrescimo * Decimal('1.30')
        preco_pix = preco_final * Decimal('0.95')
        
        # Cálculo dos lucros
        lucro_vista = preco_final - preco_custo
        lucro_pix = preco_pix - preco_custo
        custo_parcelamento = preco_final * Decimal('0.0701')
        lucro_parcelado = lucro_vista - custo_parcelamento
        
        # Formatação dos resultados
        return {
            "preco_custo": float(formatar_valor(preco_custo)),
            "preco_final": float(formatar_valor(preco_final)),
            "preco_pix": float(formatar_valor(preco_pix)),
            "valor_parcela": float(formatar_valor(preco_final/3)),
            "lucro_vista": float(formatar_valor(lucro_vista)),
            "lucro_pix": float(formatar_valor(lucro_pix)),
            "lucro_parcelado": float(formatar_valor(lucro_parcelado)),
            "desconto_pix": float(formatar_valor(preco_final - preco_pix)),
            "custo_parcelamento": float(formatar_valor(custo_parcelamento))
        }
    except (ValueError, TypeError, AttributeError):
        return {"erro": "Valor inválido"}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calcular', methods=['POST'])
def calcular():
    preco_custo = request.json.get('preco_custo', 0)
    return jsonify(calcular_precos(preco_custo))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 