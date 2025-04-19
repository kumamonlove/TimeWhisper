import uvicorn

if __name__ == "__main__":
    print("Using OpenAI SDK to Call DeepSeek API to Start Service...")
    uvicorn.run("main_openai_sdk:app", host="0.0.0.0", port=8000, reload=True) 