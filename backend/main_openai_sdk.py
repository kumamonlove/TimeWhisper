from fastapi import FastAPI, HTTPException, Depends, Body, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
from datetime import datetime
import json
from openai import OpenAI
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Should be set to the actual frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure OpenAI client for DeepSeek API - updated to the officially recommended initialization
client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"  # Removed "/v1" according to official documentation
)

# Available DeepSeek models
DEEPSEEK_MODELS = {
    "deepseek-chat": "DeepSeek-V3 model, general conversation model",
    "deepseek-reasoner": "DeepSeek-R1 reasoning model, excels at complex reasoning"
}

# Data models
class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "deepseek-chat"
    history: Optional[List[Message]] = []  # Added history message list

# Simple data storage
tasks = []
task_id_counter = 1

# API routes
@app.get("/")
def read_root():
    return {"message": "Welcome to Time Management App"}

@app.get("/models")
def get_models():
    """Get list of available DeepSeek models"""
    return DEEPSEEK_MODELS

@app.get("/tasks", response_model=List[Task])
def get_tasks():
    return tasks

@app.post("/tasks", response_model=Task)
def create_task(task: Task):
    global task_id_counter
    task.id = task_id_counter
    tasks.append(task)
    task_id_counter += 1
    return task

@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task: Task):
    for i, t in enumerate(tasks):
        if t.id == task_id:
            task.id = task_id
            tasks[i] = task
            return task
    raise HTTPException(status_code=404, detail="Task not found")

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    for i, task in enumerate(tasks):
        if task.id == task_id:
            del tasks[i]
            return {"message": "Task deleted"}
    raise HTTPException(status_code=404, detail="Task not found")

def get_completion_stream(message: str, model: str = "deepseek-chat", history: List[Message] = None):
    """Generate DeepSeek streaming response generator function"""
    try:
        # Validate if the model exists
        if model not in DEEPSEEK_MODELS:
            yield f"data: {{\"error\": \"Invalid model: {model}, Available models: {list(DEEPSEEK_MODELS.keys())}\" }}\n\n"
            return

        # Build message list
        messages = [{"role": "system", "content": "You are a time management expert assistant, please help the user manage time and tasks."}]
        
        # For DeepSeek Reasoner, ensure the first non-system message is a user message
        # Check if there's history and it starts with an assistant message
        if model == "deepseek-reasoner" and history and history[0].role == "assistant":
            # Filter out assistant messages until we find a user message
            filtered_history = []
            user_message_found = False
            
            for msg in history:
                if msg.role == "user":
                    user_message_found = True
                    filtered_history.append(msg)
                elif user_message_found:  # Only include assistant messages after a user message
                    filtered_history.append(msg)
            
            # Use the filtered history
            for msg in filtered_history:
                messages.append({"role": msg.role, "content": msg.content})
        else:
            # For other models, use the regular history
            if history:
                for msg in history:
                    messages.append({"role": msg.role, "content": msg.content})
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        # Use OpenAI SDK to call DeepSeek API for streaming response
        print(f"Sending message to DeepSeek (streaming): {message}")
        print(f"Using model: {model}")
        print(f"History message count: {len(history) if history else 0}")
        print(f"Final message structure: {json.dumps(messages, indent=2)}")
        
        # Create streaming response
        response_stream = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
            stream=True  # Enable streaming output
        )
        
        # Send model info as the first event
        yield f"data: {{\"model\": \"{model}\"}}\n\n"
        
        # Send response tokens one by one
        for chunk in response_stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                # Format as SSE event
                yield f"data: {json.dumps({'content': content})}\n\n"
                
        # Send completion event
        yield f"data: {{\"done\": true}}\n\n"
            
    except Exception as e:
        error_message = str(e)
        print(f"Streaming DeepSeek API error: {error_message}")
        yield f"data: {{\"error\": \"{error_message}\" }}\n\n"

@app.post("/chat")
def chat_with_deepseek(chat_request: ChatRequest):
    try:
        # Validate if the model exists
        if chat_request.model not in DEEPSEEK_MODELS:
            raise HTTPException(status_code=400, detail=f"Invalid model: {chat_request.model}, Available models: {list(DEEPSEEK_MODELS.keys())}")
            
        # Build message list
        messages = [{"role": "system", "content": "You are a time management expert assistant, please help the user manage time and tasks."}]
        
        # For DeepSeek Reasoner, ensure the first non-system message is a user message
        if chat_request.model == "deepseek-reasoner" and chat_request.history and chat_request.history[0].role == "assistant":
            # Filter out assistant messages until we find a user message
            filtered_history = []
            user_message_found = False
            
            for msg in chat_request.history:
                if msg.role == "user":
                    user_message_found = True
                    filtered_history.append(msg)
                elif user_message_found:  # Only include assistant messages after a user message
                    filtered_history.append(msg)
            
            # Use the filtered history
            for msg in filtered_history:
                messages.append({"role": msg.role, "content": msg.content})
        else:
            # For other models, use the regular history
            if chat_request.history:
                for msg in chat_request.history:
                    messages.append({"role": msg.role, "content": msg.content})
        
        # Add current message
        messages.append({"role": "user", "content": chat_request.message})
        
        # Log request details
        print(f"Sending message to DeepSeek: {chat_request.message}")
        print(f"Using model: {chat_request.model}")
        print(f"History message count: {len(chat_request.history) if chat_request.history else 0}")
        print(f"Final message structure: {json.dumps(messages, indent=2)}")
            
        # Use format from official documentation
        response = client.chat.completions.create(
            model=chat_request.model,  # Use the user selected model
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
            stream=False
        )
        
        # Print complete response for debugging
        print(f"DeepSeek response: {response}")
        
        # Return generated message content
        return {"response": response.choices[0].message.content, "model": chat_request.model}
        
    except Exception as e:
        print(f"DeepSeek API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Communication error with DeepSeek: {str(e)}")

@app.post("/chat_stream")
async def chat_stream_post(chat_request: ChatRequest):
    """Streaming chat interface - POST method"""
    return StreamingResponse(
        get_completion_stream(chat_request.message, chat_request.model, chat_request.history),
        media_type="text/event-stream"
    )

@app.get("/chat_stream")
async def chat_stream_get(message: str = Query(None), model: str = Query("deepseek-chat")):
    """Streaming chat interface - GET method"""
    if not message:
        return {"error": "message parameter is required"}
    
    return StreamingResponse(
        get_completion_stream(message, model),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 