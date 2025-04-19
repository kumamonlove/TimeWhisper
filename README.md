# TimeWhisper

This is a time management web application built with React and Python FastAPI, integrated with DeepSeek AI features to help users manage their time and tasks more effectively.

## Features
1	Task Management: Add, view, complete, and delete tasks  
2	AI Assistant: Provides time management suggestions and help  
◦	Supports multiple DeepSeek models  
◦	DeepSeek-V3 (deepseek-chat): General-purpose conversation model  
◦	DeepSeek-R1 (deepseek-reasoner): Optimized for complex reasoning  
◦	Supports Markdown rendering, including syntax highlighting for code  

## Tech Stack
•	Frontend: React, Axios, React Icons, React Markdown  
•	Backend: Python, FastAPI, DeepSeek API  

## Installation & Run

### Backend  
1	Install Python dependencies:  
`pip install -r requirements.txt`

2	Create a `.env` file and set your DeepSeek API key:  
`DEEPSEEK_API_KEY=your_deepseek_api_key_here`

◦	Note: DeepSeek API keys usually start with sk-  
◦	You can obtain a key at https://platform.deepseek.com/api_keys

3	Choose a launch method:  
Use OpenAI SDK (recommended):  
`cd backend`  
`python run_sdk.py`

### Frontend  
1	Install Node.js dependencies:  
`cd frontend`  
`npm install`  
`npm install react-markdown react-syntax-highlighter --save`

2	Start the frontend dev server:  
`npm start`

3	(Optional) Production build:  
`npm run build`  
`npm install -g serve`  
`serve -s build`

## DeepSeek API Usage

This project provides two ways to call the DeepSeek API:  
1	Using requests library: Direct HTTP requests to the DeepSeek API endpoint  
2	Using OpenAI SDK: Leverages OpenAI-compatible interface, which is the officially recommended method by DeepSeek  

DeepSeek provides OpenAI-compatible APIs, so you can call DeepSeek services directly via the OpenAI SDK. If you encounter issues with raw HTTP calls, try the SDK method.

## DeepSeek Models

The app supports the following DeepSeek models:  
1	DeepSeek-V3 (deepseek-chat): General-purpose model for casual conversation and common queries  
2	DeepSeek-R1 (deepseek-reasoner): Optimized for reasoning and logical analysis  

Users can select their preferred model from a dropdown menu in the chat assistant. Different models may vary in response style and strengths.

## Markdown Support

The chat assistant supports Markdown-rendered responses, including:  
•	Headers (H1–H6)  
•	Lists (ordered and unordered)  
•	Links and images  
•	Code blocks (with syntax highlighting)  
•	Tables  
•	Blockquotes  
•	Text formatting (bold, italic, etc.)

This enables the AI assistant to provide rich and well-formatted outputs. You can try prompting the AI with something like:  
**Please provide today’s time management plan using Markdown format, including a table and some code samples.**

## Troubleshooting

1	If API calls fail, check:  
◦	Whether the API key is correct (should start with sk-)  
◦	The model name is correct (deepseek-chat, deepseek-reasoner, etc.)  
◦	Request payload format is valid  

2	If you get timeout errors, it may be due to network lag or a slow API response — try increasing the timeout parameter.

3	If Markdown doesn’t render correctly:  
◦	Make sure react-markdown and react-syntax-highlighter are installed  
◦	Check if the AI’s response follows proper Markdown syntax

## How to Use

1	Visit http://localhost:3000 to open the app  
2	Use the "Task Management" tab to add and manage tasks  
3	Use the "Chat Assistant" tab to communicate with the AI for time management suggestions  
◦	You can select different AI models from the dropdown  
◦	Different models may offer varying response styles  
◦	Try prompting the AI to return responses in Markdown with tables, code, etc.
