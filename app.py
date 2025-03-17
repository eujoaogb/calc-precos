from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calcular', methods=['POST'])
def calcular():
    data = request.get_json()
    
    # Obtém os valores do formulário
    preco_custo = float(data['preco_custo'])
    porcentagem_lucro = float(data['porcentagem_lucro'])
    porcentagem_pix = float(data['porcentagem_pix'])
    custo_adicional = float(data['custo_adicional'])
    
    # Calcula o custo total
    custo_total = preco_custo + custo_adicional
    
    # Calcula o preço final com a margem de lucro
    margem_lucro = custo_total * (porcentagem_lucro / 100)
    preco_final = custo_total + margem_lucro
    
    # Calcula o preço com desconto PIX
    desconto_pix = preco_final * (porcentagem_pix / 100)
    preco_pix = preco_final - desconto_pix
    
    # Calcula o preço parcelado (acréscimo de 15% para cobrir taxas)
    preco_parcelado = preco_final * 1.15
    
    return jsonify({
        'preco_custo': preco_custo,
        'custo_adicional': custo_adicional,
        'porcentagem_lucro': porcentagem_lucro,
        'porcentagem_pix': porcentagem_pix,
        'preco_final': preco_final,
        'preco_pix': preco_pix,
        'preco_parcelado': preco_parcelado
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True) 