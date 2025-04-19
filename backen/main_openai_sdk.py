from fastapi import FastAPI, HTTPException, Depends, Body, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime
import json
from openai import OpenAI
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"  
)


DEEPSEEK_MODELS = {
    "deepseek-chat": "DeepSeek-V3 model, universal dialogue model",
    "deepseek-reasoner": "DeepSeek-R1 reasoning model, proficient in complex reasoning"
}


class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False

class ChatMessage(BaseModel):
    message: str
    model: Optional[str] = "deepseek-chat" 


tasks = []
task_id_counter = 1


@app.get("/")
def read_root():
    return {"message": "Welcome to the time management application"}

@app.get("/models")
def get_models():
    """Get a list of available DeepSeek models"""
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

def get_completion_stream(message: str, model: str = "deepseek-chat"):

    try:

        if model not in DEEPSEEK_MODELS:
            yield f"data: {{\"error\": \"Invalid model: {model}, Available models: {list(DEEPSEEK_MODELS.keys())}\" }}\n\n"
            return


        print(f"Send a message to DeepSeek (streaming): {message}")
        print(f"Using the model: {model}")
        

        response_stream = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a time management expert assistant, please help users manage time and tasks."},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=2000,
            stream=True  
        )
        

        yield f"data: {{\"model\": \"{model}\"}}\n\n"
        

        for chunk in response_stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content

                yield f"data: {json.dumps({'content': content})}\n\n"
                

        yield f"data: {{\"done\": true}}\n\n"
            
    except Exception as e:
        error_message = str(e)
        print(f"Streaming call to DeepSeek API error: {error_message}")
        yield f"data: {{\"error\": \"{error_message}\" }}\n\n"

@app.post("/chat")
def chat_with_deepseek(chat_message: ChatMessage):
    try:

        if chat_message.model not in DEEPSEEK_MODELS:
            raise HTTPException(status_code=400, detail=f"Invalid model: {chat_message.model}, Available models: {list(DEEPSEEK_MODELS.keys())}")
            

        print(f"Send a message to DeepSeek: {chat_message.message}")
        print(f"use model: {chat_message.model}")

        response = client.chat.completions.create(
            model=chat_message.model, 
            messages=[
                {"role": "system", "content": "You are a time management expert assistant, please help users manage time and tasks."},
                {"role": "user", "content": chat_message.message}
            ],
            temperature=0.7,
            max_tokens=2000,
            stream=True
        )
        

        print(f"DeepSeekresponse: {response}")
        

        return {"response": response.choices[0].message.content, "model": chat_message.model}
        
    except Exception as e:
        print(f"Error calling DeepSeek API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Communication error with DeepSeek: {str(e)}")

@app.post("/chat_stream")
async def chat_stream_post(chat_message: ChatMessage):

    return StreamingResponse(
        get_completion_stream(chat_message.message, chat_message.model),
        media_type="text/event-stream"
    )

@app.get("/chat_stream")
async def chat_stream_get(message: str = Query(None), model: str = Query("deepseek-chat")):

    if not message:
        return {"error": "message Parameters are required"}
    
    return StreamingResponse(
        get_completion_stream(message, model),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 