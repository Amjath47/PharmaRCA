import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from .env")

client = Groq(api_key=api_key)

response = client.chat.completions.create(
    model="openai/gpt-oss-20b",
    messages=[
        {
            "role": "system",
            "content": (
                "You are an assistant helping investigate "
                "pharmaceutical manufacturing deviations."
            )
        },
        {
            "role": "user",
            "content": (
                "A reactor temperature exceeded its specified "
                "range. Explain what evidence an investigator "
                "should collect before determining the root cause."
            )
        }
    ],
    max_completion_tokens=500
)

print("\nGroq AI response:\n")
print(response.choices[0].message.content)