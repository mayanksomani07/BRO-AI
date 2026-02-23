import google.generativeai as genai
import json
import time
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("Missing GOOGLE_API_KEY in environment.")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

BASE_PROMPT = """
You are an expert AI Data Scientist creating a synthetic dataset for a 'Bro-AI' chatbot. 
The persona is a Soft/Supportive Person for an Indian male/female both going through a one-sided love breakup, and he/she wants to express his/her feelings.
Tone: Hinglish, empathetic, non-judgmental, practical but warm.
Avoid robotic language. Talk like a friend at a chai-tapri.

Your Task:
Convert the following raw personal logs into 50 unique (Query, Response) pairs.
Each query should be a 'User' asking for help, and each response should be like a 'Bro' giving advice.

Safety Requirements:
- Do NOT include instructions for self-harm or suicide.
- If a query implies self-harm, respond with supportive, non-judgmental help and encourage reaching out to trusted people or local support.

Variation Requirements:
- Queries should range from angry, sad, confused, to suicidal/hopeless.
- Queries should reflect different stages of a breakup (e.g., denial, anger, acceptance, moving on).
- Include queries from both male and female perspectives.
- Responses might use some 'Philosophical Stoic Principles' (Kindness, Self-Investment, Silence, Action over Words).
- Responses should include actionable advice, relatable anecdotes, or comforting words that align with the persona.
- Use Hinglish phrases and colloquial expressions to make the responses feel natural and conversational.

Format:
A valid JSON list of objects with keys: "query", "response".
"""

# Add batch-specific instructions for diversity
BATCH_VARIATIONS = [
    "Focus on angry and frustrated queries.",
    "Focus on sad and hopeless queries.",
    "Focus on confused and questioning queries.",
    "Focus on queries about moving on and acceptance.",
    "Focus on queries about friendship and loneliness.",
    "Focus on queries about philosophical thoughts and stoicism.",
    "Focus on queries about regret and missed opportunities.",
    "Focus on queries about trust issues and betrayal.",
    "Focus on queries about self-worth and confidence.",
    "Focus on queries about dealing with rejection.",
    "Focus on queries about coping with anxiety and overthinking.",
    "Focus on queries about handling peer pressure.",
    "Focus on queries about finding purpose and meaning.",
    "Focus on queries about emotional maturity.",
    "Focus on queries about rebuilding after heartbreak."
]

def generate(raw_logs, extra_instruction):
    prompt = BASE_PROMPT + "\n" + extra_instruction
    try:
        response = model.generate_content(f"{prompt}\n\nRAW LOG DATA:\n{raw_logs}")
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(clean_json)
        if not isinstance(data, list):
            raise ValueError("Model output is not a JSON list.")
        return data
    except Exception as e:
        print(f"Error: {e}")
        return []

def save_json(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

with open("rawlogs.txt", "r", encoding="utf-8") as f:
    raw_logs = f.read()

dataset = []
for i, variation in enumerate(BATCH_VARIATIONS):
    print(f"Generating batch {i+1} with variation: {variation}")
    batch = generate(raw_logs, variation)
    dataset.extend(batch)
    time.sleep(2)

# Remove duplicates
unique_dataset = []
seen = set()
for item in dataset:
    key = (item['query'].strip(), item['response'].strip())
    if key not in seen:
        unique_dataset.append(item)
        seen.add(key)

save_json(unique_dataset, "bro_ai_dataset2.json")
print(f"Saved {len(unique_dataset)} unique items to bro_ai_dataset.json")