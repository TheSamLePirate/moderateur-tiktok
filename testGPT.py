import json
import http.client
import ssl

# Configuration de l'API ChatGPT
API_KEY = "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"
API_URL = "https://api.openai.com/v1/responses"
# Configuration du script
config = [
    {
        "type": "text",
        "label": "Prompt pour l'IA",
        "value": "Décrire ici ce que le script est censé faire...",
    },
    {
        "id": "prompt",
        "label": "Prompt IA",
        "type": "input",
    },
    {
        "id": "model",
        "label": "Modèle:",
        "type": "input",
        "value": "gpt-4o",
    },
    {
        "id": "output_file",
        "label": "Output File Path:",
        "type": "input",
        "value": "/var/mobile/Media/CatScript/generated_code.py",
    },
]

def http_post(url, headers, data):
    try:
        parsed_url = http.client.urlsplit(url)
        context = ssl._create_unverified_context()  # Créer un contexte SSL non vérifié
        conn = http.client.HTTPSConnection(parsed_url.netloc, context=context)
        conn.request("POST", parsed_url.path, body=json.dumps(data), headers=headers)
        response = conn.getresponse()
        
        # Ajouter des logs pour le code de statut et le contenu de la réponse
        print(f"HTTP Status: {response.status}")
        response_data = response.read().decode()
        print(f"Response Data: {response_data}")
        
        return response_data
    except Exception as e:
        print(f"Erreur de communication HTTP: {e}")
        return None

def generate_code(prompt, model):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }
    data = {
        "model": model,
        "input": prompt
    }
    response = http_post(API_URL, headers, data)
    if response:
        try:
            result = json.loads(response)
            print(f"Response structure: {json.dumps(result, indent=2)}")
            
            # Parsing the new response format
            if 'output' in result and isinstance(result['output'], list) and len(result['output']) > 0:
                message = result['output'][0]
                if 'content' in message and isinstance(message['content'], list) and len(message['content']) > 0:
                    content_item = message['content'][0]
                    if 'text' in content_item:
                        return content_item['text']
            
            print(f"Réponse inattendue de l'API ou structure non reconnue: {result}")
            return None
        except json.JSONDecodeError as e:
            print(f"Erreur de décodage JSON: {e}")
            return None
    else:
        print("Erreur de communication avec l'API OpenAI")
        return None

def write_to_file(file_path, content):
    try:
        with open(file_path, "w") as file:
            file.write(content)
        print(f"Code écrit dans le fichier : {file_path}")
    except Exception as e:
        print(f"Erreur lors de l'écriture du fichier : {e}")

def main():
    
    
    # Utiliser .get() pour éviter les KeyError
    prompt = "Dis moi l'heure en python"
    model = "gpt-4o"
    output_file_path = "/var/mobile/Media/CatScript/generated_code.py"

    code = generate_code(prompt, model)
    if code:
        print("Code généré par l'IA :")
        print(code)
        write_to_file(output_file_path, code)
        try:
            exec(code)
        except Exception as e:
            print(f"Erreur lors de l'exécution du code généré : {e}")
    else:
        print("Écriture de 'erreur' dans le fichier de sortie")
        write_to_file(output_file_path, "erreur")

if __name__ == "__main__":
    
    main()
