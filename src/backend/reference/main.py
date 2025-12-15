from flask import Flask, request, jsonify
from flask_cors import CORS
from router_groq_llms import GrokHandler
import base64
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze():
   if request.method == 'OPTIONS':
       return jsonify({}), 200
       
   try:
       if not request.is_json:
           return jsonify({'error': 'Request must be JSON'}), 400
           
       data = request.get_json()
       if not data:
           return jsonify({'error': 'No data provided'}), 400
           
       user_prompt = data.get('prompt')
       if not user_prompt:
           return jsonify({'error': 'No prompt provided'}), 400

       query_handler = GrokHandler()
       dot_code = query_handler.generate_dot_code(user_prompt)
       if not dot_code:
           return jsonify({'error': 'Failed to generate flowchart structure'}), 500

       output_image_path = query_handler.validate_and_render_dot_code(
           dot_code,
           output_file="flowchart"
       )
       
       if not output_image_path or not os.path.exists(output_image_path):
           return jsonify({'error': 'Failed to generate flowchart image'}), 500

       explanation = query_handler.generate_text_response(dot_code, user_prompt)
       if not explanation:
           return jsonify({'error': 'Failed to generate explanation'}), 500

       try:
           with open(output_image_path, "rb") as image_file:
               encoded_image = base64.b64encode(image_file.read()).decode()
       except Exception as e:
           return jsonify({'error': 'Failed to process the generated image'}), 500

       try:
           if os.path.exists(output_image_path):
               os.remove(output_image_path)
           if os.path.exists(output_image_path + ".jpeg"):
               os.remove(output_image_path + ".jpeg")
       except Exception as e:
           print(f"Warning: Failed to clean up temporary files: {str(e)}")

       return jsonify({
           'flowchart': encoded_image,
           'explanation': explanation
       })

   except Exception as e:
       print(f"Error: {str(e)}")
       return jsonify({'error': 'An unexpected error occurred. Please try again.'}), 500

if __name__ == '__main__':
   port = int(os.environ.get('PORT', 5000))
   app.run(host='0.0.0.0', port=port, debug=True)