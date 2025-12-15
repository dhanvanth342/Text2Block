import os
from openai import OpenAI
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import re
from graphviz import Source

load_dotenv()


class GrokHandler:
    def __init__(self, openrouter_model="anthropic/claude-3.5-haiku",
                 groq_model="llama-3.3-70b-versatile"):
        #llama3-70b-8192
        #llama-3.3-70b-versatile
        """
        Initializes the QueryHandler with both OpenRouter and Groq clients.
        """
        # OpenRouter initialization
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set.")

        self.openrouter_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.openrouter_api_key,
            default_headers={
                "HTTP-Referer": "null",
                "X-Title": "Text2Block",
            }
        )
        self.openrouter_model = openrouter_model

        # Groq initialization
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable not set.")

        self.groq_client = ChatGroq(
            groq_api_key=self.groq_api_key,
            model_name=groq_model
        )
        self.groq_model = groq_model

        # Provider configuration for OpenRouter
        self.provider_config = {
            "provider": {
                "order": ["Anthropic", "Google Vertex"]
            },
            "allow_fallbacks": False
        }

    def generate_dot_code(self, user_prompt):
        """
        Generate DOT code using OpenRouter/Claude.
        """
        prompt = (

            f"You are responsible for generating DOT language code to create clear, visually explainable diagrams or flowcharts that effectively address the user's query."
            f"The User Query is : {user_prompt} \n\n"
            f"Follow these **guidelines** while generating the DOT code:\n\n"
            f"1. Begin the DOT code with [resolution=900] to ensure high resolution.\n"
            f"2. STRICTLY The graph name **must not** contain spaces, but node and edge names may include spaces."
            f"  - for example [digraph MDSembeddingsplot] is right way of naming a graph, but not [digraph MDS embeddings plot]\n"
            f"3. The DOT code must define the appropriate graph type (e.g., digraph for directed graphs or graph for undirected graphs) based on the user's query \n "
            f"4. Choose the most suitable layout engine [dot, neato, fdp, sfdp, circo, twopi, osage, and patchwork] for rendering the graph, "
            f"considering factors such as clarity, visual appeal, and the structure of the relationships being depicted. \n"
            f"5. Use valid Graphviz-supported or custom hexadecimal colors (\"#4CAF50\").\n"
            f"6. If the user query does not specify colors, default to pastel shades that are visually suitable for flowcharts with good text contrast to ensure readability.\n"
            f"7. Validate the DOT code to ensure it adheres to Graphviz syntax, including the use of valid node names and avoiding reserved keywords. \n"
            f"This is the example structure you can follow for the parameters to include in the start of the code:\n"
            f"digraph nameofgraph {{resolution = 900 layout= circo; rest of the code}}"
            f"8. If the input cannot be expressed in a flowchart (e.g., typos or meaningless queries), generate a generic response stating to elaborate the query"
            f"in the dot code with one square border to the text.:\n"
            f"9. The output should only be DOT CODE, STRICTLY Avoid preamble, unnecessary comments, or extraneous symbols,  \n\n"

        )

        try:
            response = self.openrouter_client.chat.completions.create(
                model=self.openrouter_model,
                messages=[{"role": "user", "content": prompt}],
                extra_headers={"X-Custom-Provider": str(self.provider_config)}
            )

            dot_code = response.choices[0].message.content.strip()

            # Extract and validate DOT code
            if "digraph" in dot_code:
                dot_code_start = dot_code.find("digraph")
                dot_code = dot_code[dot_code_start:].strip()
            elif "graph" in dot_code:
                dot_code_start = dot_code.find("graph")
                dot_code = dot_code[dot_code_start:].strip()
            # else:
            #     print("Warning: Generated DOT code does not contain 'digraph' or 'graph'.")

            # Cleanup DOT code
            #dot_code = re.sub(r"[^a-zA-Z0-9\s\-\->;{}\"\\\[\]=#\+\-\*/\^%()]", " ", dot_code)
            return dot_code

        except Exception as e:
            raise Exception(f"Error in OpenRouter API call: {e}")

    def fix_dot_code(self, dot_code, error_message):
        """
        Use OpenRouter/Claude to fix the DOT code based on the error message.
        """
        prompt = (
            f"Your task is to fix the errors and generate an error free dot code, while making sure it can render successfully as a flowchart. \n"
            f"The dot code is: \n {dot_code} \n"
            f"is showing this Error message: {error_message} \n"
            f"Please follow the below guidelines while generating the corrected code:"
            f"1. Firstly find the issues with given dot code as mentioned in Error message and correct them. \n"
            f"2. Make sure the name of the graph is not having spaces .\n"
            f" for example [digraph MDSembeddingsplot] is right way of naming a graph, but not [digraph MDS embeddings plot]\n"
            f"3. If node or edge names include spaces, enclose them in double quotes to avoid syntax errors. "
            f"   - For example: [node1 -> \"Node With Spaces\"] is valid.\n"
            f"4. Set the resolution of DOT code as 900 [resolution=900] in the beginning of the code "
            f"5. Make sure the corrected dot code carries the similar information as the original dot code carried. \n"
          
            f"6. The response dot code MUST contain digraph for directed graphs or graph for undirected graphs, Choose by context provided in given dot code. \n"
            f"7. Validate the DOT code to ensure it complies with Graphviz syntax and avoid reserved keywords or invalid node names (e.g., do not use 'subgraph' as a node name unless it is meant to represent a subgraph).\n"
            f"   - If a reserved term is used incorrectly, suggest an alternative or provide a corrected version.\n"
            f"   Example: If 'subgraph' is used as a node name, rename it to avoid conflicts or use proper subgraph syntax.\n"
            f"8. Ensure the use of '->' for directed graphs (digraph) and '--' for undirected graphs (graph) to avoid syntax errors.\n"
            f"9. STRICTLY NO PREAMBLE OR UNNECESSARY COMMENTS, Generate only DOT code as Output. \n"
        )

        try:
            response = self.openrouter_client.chat.completions.create(
                model=self.openrouter_model,
                messages=[{"role": "user", "content": prompt}],
                extra_headers={"X-Custom-Provider": str(self.provider_config)}
            )

            dot_code = response.choices[0].message.content.strip()

            # Extract and validate DOT code
            if "digraph" in dot_code:
                dot_code_start = dot_code.find("digraph")
                dot_code = dot_code[dot_code_start:].strip()
            elif "graph" in dot_code:
                dot_code_start = dot_code.find("graph")
                dot_code = dot_code[dot_code_start:].strip()
            # else:
            #     print("Warning: Generated DOT code does not contain 'digraph' or 'graph'.")

            # Cleanup DOT code
            #dot_code = re.sub(r"[^a-zA-Z0-9\s\-\->;{}\"\\\[\]=#\+\-\*/\^%()]", " ", dot_code)
            return dot_code

        except Exception as e:
            raise Exception(f"Error in OpenRouter API call: {e}")

    def generate_text_response(self, dot_code, user_prompt):
        """
        Generate a textual explanation using Groq/Llama.
        """
        prompt = (
            f"Your task is to generate a text response that provides a thorough understanding of the flowchart rendered by the dot code in context of user prompt:\n"
            f"Input Dot Code: {dot_code}\n"
            f"Input User Prompt: {user_prompt}\n"
            f"Flow chart: This is rendered by the input Dot Code"
            f"Follow the below instructions while drafting the text response: \n"
            f"1. Write a detailed explanation of the flowchart in a suitable structure [ex: bullet points, headings & subheadings & explanation etc.,] that effectively explains the concept outlined in the User Prompt through the flowchart. \n"
            f"   - Ensure the explanation helps the user satisfy his requirement as per the User Prompt. \n"  # Modified line
            f"2. Avoid repetitive descriptions for similar stages. Provide concise yet insightful summaries for repetitive processes while emphasizing unique aspects of each stage.\n"
            f"3. Incorporate key details (e.g., nested loops, termination conditions) to provide a deeper understanding of the topic inquired through the User Prompt.\n"
            f"4. If the flowchart lacks sufficient information to address the User Prompt, supplement the explanation with relevant additional insights "
            f"(e.g., practical applications, computational complexity). \n"
            f"5. Conclude the explanation with a summary that highlights the final outcome of the process and how the flowchart encapsulates this result. \n"
            f"6. Do not mention or talk about the word Dot Code in the response. \n"
            f"7. Only if mentioned in User query talk about the colors, by actual naming [e.g. blue, red etc.] and not Hexadecimal coding. \n"
            f"8. Avoid preambles or unnecessary introductory text. Start directly with the explanation.\n"
            f"9. MOST IMPORTANTLY The output MUST be structured in JSON format. Example structure:\n"
            f"{{\n"
            f"  \"explanation\": {{\n"
            f"    \"overview\": \"High-level explanation of the process depicted in the flowchart.\",\n"
            f"    \"details\": [\n"
            f"      {{\"heading\": \"Step 1\", \"description\": \"Detailed explanation of step 1.\"}},\n"
            f"      {{\"heading\": \"Step 2\", \"description\": \"Detailed explanation of step 2.\"}}\n"
            f"    ]\n"
            f"  }}\n"
            f"}}\n"

            # Added line
        )

        try:
            response = self.groq_client.invoke(prompt)

            return response.content.strip()


        except Exception as e:
            raise Exception(f"Error in Groq API call: {e}")

    def validate_and_render_dot_code(self, dot_code, output_file="flowchart"):
        """
        Validate and render the DOT code. Use LLM to fix errors if encountered.
        """
        max_retries = 5
        for attempt in range(max_retries):
            try:
                graphviz_path = r"C:\Program Files\Graphviz\bin"
                os.environ["PATH"] += os.pathsep + graphviz_path

                src = Source(dot_code, format="jpeg", engine="dot")
                output_path = src.render(output_file, cleanup=True)
                return output_path
            except Exception as e:
                if attempt < max_retries - 1:
                    # print(f"Render attempt {attempt + 1} failed. Sending error to LLM...")
                    dot_code = self.fix_dot_code(dot_code, str(e))
                else:
                    raise RuntimeError(f"DOT code validation failed after {max_retries} attempts. Error: {e}")


#prompts for text generation

prompt1 = (
            f"Your task is to generate a text response that provides a thorough understanding of the flowchart rendered by the dot code in context of user prompt:\n"
           # f"Input Dot Code: {dot_code}\n"
            #f"Input User Prompt: {user_prompt}\n"
            f"Flow chart: This is rendered by the input Dot Code"
            f"Follow the below instructions while drafting the text response: \n"
            f"1. Write a detailed explanation of the flowchart in a suitable structure [ex: bullet points, headings & subheadings & explanation etc.,] while aligning the response with the User Prompt. \n"
            f"   - Ensure the explanation helps the user understand the complex topic inquired through the User Prompt. \n"  # Modified line
            f"2. You are free to decide the length of the explanation that is most suitable for the User Prompt and Dot code given to you.\n"
            f"3. You can explain the color coding in standard format (ex: blue, yellow, red, etc.) but not in hexadecimal coding. \n"
            f"   - Only if that gives more clarity to users to understand the diagram/flowchart. \n"
            f"4. Avoid preambles or unnecessary introductory text. Start directly with the explanation.\n"
            f"5. You can provide additional information if the dot code is not carrying sufficient information as per the user prompt.\n"
            #f"7. MOST IMPORTANTLY response MUST be structured in JSON format with clear keys and values to ensure readability and usability.\n"
            f"7. MOST IMPORTANTLY The output MUST be structured in this exact JSON format. Example structure:\n"
            f"{{\n"
            f"  \"explanation\": {{\n"
            f"    \"overview\": \"High-level explanation of the flowchart and its purpose.\",\n"
            f"    \"details\": [\n"
            f"      {{\"heading\": \"Step 1\", \"description\": \"Detailed explanation of step 1.\"}},\n"
            f"      {{\"heading\": \"Step 2\", \"description\": \"Detailed explanation of step 2.\"}}\n"
            f"    ]\n"
            f"  }}\n"
            f"}}\n")
