import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';  // Import remarkGfm plugin

const API_URL = 'http://localhost:8000';

const ChatAssistant = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I am your time management assistant. I can help you manage tasks, schedule time, and provide time management advice. How can I help you?', sender: 'assistant' }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [isStreamMode, setIsStreamMode] = useState(true); // Default to streaming output
  const [enableHistory, setEnableHistory] = useState(true); // Default to enable history
  const [historyLength, setHistoryLength] = useState(5); // Default to keep 5 conversation rounds
  const [isStreaming, setIsStreaming] = useState(false); // Track if streaming is in progress

  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
    fetchModels();

    return () => {
      // Clean up EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Clean up Fetch request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/models`);
      setModels(response.data);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  // Prepare history messages according to backend API requirements
  const prepareHistoryMessages = () => {
    if (!enableHistory) return [];
    
    // Filter out the most recent messages in order
    const recentMessages = [...messages].filter(msg => msg.id !== 'temp') // Exclude temporary messages
                                        .slice(-historyLength * 2); // Get the most recent n conversations (user and assistant)
    
    // Convert to the format required by the backend API
    return recentMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
  };

  // Function to abort the current streaming response
  const handleAbortStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Update the last message to show it was interrupted
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.loading) {
        return prev.map(msg =>
          msg.id === lastMessage.id
            ? { ...msg, text: msg.text + " (Response interrupted)", loading: false }
            : msg
        );
      }
      return prev;
    });
    
    setIsLoading(false);
    setIsStreaming(false);
  };

  const handleStreamResponse = async (userMessage) => {
    try {
      // First add user message
      setMessages(prev => [...prev, userMessage]);
      
      // Create an initial empty assistant message
      const assistantMessageId = Date.now() + 1;
      setMessages(prev => [
        ...prev, 
        { 
          id: assistantMessageId, 
          text: '', 
          sender: 'assistant',
          loading: true
        }
      ]);

      // Get history messages
      const historyMessages = prepareHistoryMessages();

      // Cancel previous requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      // Set streaming flag to true
      setIsStreaming(true);

      // Use /chat_stream interface to get streaming response
      const response = await fetch(`${API_URL}/chat_stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          message: userMessage.text,
          model: selectedModel,
          history: historyMessages // Add history messages
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let receivedModel = '';
      let fullContent = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode byte stream
        const text = decoder.decode(value);
        accumulatedText += text;
        
        // Process SSE events
        const events = accumulatedText.split("\n\n");
        accumulatedText = events.pop() || ''; // Last one might be incomplete
        
        for (const event of events) {
          if (event.trim() === '') continue;
          
          // Parse event data
          const dataMatch = event.match(/^data: (.+)$/m);
          if (!dataMatch) continue;
          
          try {
            const data = JSON.parse(dataMatch[1]);
            
            // Process model info
            if (data.model && !receivedModel) {
              receivedModel = data.model;
            }
            
            // Process content fragments
            if (data.content) {
              fullContent += data.content;
              
              // Update message content
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, text: fullContent, model: receivedModel, loading: true } 
                    : msg
                )
              );
            }
            
            // Process completion event
            if (data.done) {
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, loading: false, model: receivedModel } 
                    : msg
                )
              );
              setIsLoading(false);
              setIsStreaming(false);
              break;
            }
            
            // Process error
            if (data.error) {
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, text: `Error: ${data.error}`, loading: false } 
                    : msg
                )
              );
              setIsLoading(false);
              setIsStreaming(false);
              break;
            }
            
          } catch (err) {
            console.error('Error parsing event data:', err);
          }
        }
        
        // Scroll to bottom to show new messages
        scrollToBottom();
      }
      
    } catch (error) {
      console.error('Error processing streaming response:', error);
      setMessages(prev => {
        // Find the last message
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.loading) {
          // Update error message
          return prev.map(msg =>
            msg.id === lastMessage.id
              ? { ...msg, text: `Connection error: ${error.message}`, loading: false }
              : msg
          );
        }
        return prev;
      });
      setIsLoading(false);
      setIsStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleNormalResponse = async (userMessage) => {
    // First add user message
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Get history messages
    const historyMessages = prepareHistoryMessages();

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: userMessage.text,
        model: selectedModel,
        history: historyMessages // Add history messages
      });

      const assistantMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        sender: 'assistant',
        model: response.data.model
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat request failed:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered a problem. Please try again later.' + 
              (error.response?.data?.detail ? `Error: ${error.response.data.detail}` : ''),
        sender: 'assistant'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: newMessage,
      sender: 'user'
    };

    setNewMessage('');
    setIsLoading(true);

    if (isStreamMode) {
      await handleStreamResponse(userMessage);
    } else {
      await handleNormalResponse(userMessage);
    }
  };

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  const toggleStreamMode = () => {
    setIsStreamMode(!isStreamMode);
  };

  const toggleHistoryMode = () => {
    setEnableHistory(!enableHistory);
  };

  const handleHistoryLengthChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setHistoryLength(value);
    }
  };

  const clearHistory = () => {
    // Only keep the initial greeting
    setMessages([
      { id: 1, text: 'Hello! I am your time management assistant. I can help you manage tasks, schedule time, and provide time management advice. How can I help you?', sender: 'assistant' }
    ]);
  };

  // Render message content, using Markdown for assistant messages
  const renderMessageContent = (message) => {
    if (message.sender === 'assistant') {
      return (
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}  // Add remarkGfm plugin to support tables and GFM syntax
            components={{
              // Add styles for elements
              h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-md font-bold my-1" {...props} />,
              h4: ({node, ...props}) => <h4 className="text-sm font-bold my-1" {...props} />,
              p: ({node, ...props}) => <p className="mb-3" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3" {...props} />,
              li: ({node, ...props}) => <li className="mb-1" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3" {...props} />,
              table: ({node, ...props}) => <table className="w-full border-collapse mb-3" {...props} />,
              th: ({node, ...props}) => <th className="border border-gray-300 bg-gray-100 font-bold p-2" {...props} />,
              td: ({node, ...props}) => <td className="border border-gray-300 p-2" {...props} />,
              a: ({node, ...props}) => <a className="text-blue-500 hover:underline" {...props} />,
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.text}
          </ReactMarkdown>
          {message.loading && (
            <span className="loading-cursor"></span>
          )}
        </div>
      );
    }
    return message.text;
  };

  return (
    <div className="chat-container">
      <div className="model-selector">
        {/* First row: Model selection and streaming toggle */}
        <div className="flex flex-wrap justify-between items-center mb-2">
          <div className="model-select-container">
            <label htmlFor="model-select">Select AI Model: </label>
            <select 
              id="model-select" 
              value={selectedModel} 
              onChange={handleModelChange}
              disabled={isLoading}
              className="mr-4"
            >
              {Object.entries(models).map(([modelId, description]) => (
                <option key={modelId} value={modelId}>
                  {modelId} - {description}
                </option>
              ))}
            </select>
          </div>
          <div className="stream-toggle">
            <label htmlFor="stream-mode" className="mr-2">Streaming Output: </label>
            <input
              type="checkbox"
              id="stream-mode"
              checked={isStreamMode}
              onChange={toggleStreamMode}
              disabled={isLoading}
            />
          </div>
        </div>
        
        {/* Second row: History options and clear button */}
        <div className="flex flex-wrap justify-between items-center">
          <div className="history-controls">
            <div className="flex flex-wrap items-center">
              <label htmlFor="history-mode" className="mr-2">History Memory: </label>
              <input
                type="checkbox"
                id="history-mode"
                checked={enableHistory}
                onChange={toggleHistoryMode}
                disabled={isLoading}
                className="mr-4"
              />
              {enableHistory && (
                <div className="history-length-input flex items-center">
                  <label htmlFor="history-length" className="mr-2">Memory Length: </label>
                  <input
                    type="number"
                    id="history-length"
                    min="1"
                    max="10"
                    value={historyLength}
                    onChange={handleHistoryLengthChange}
                    disabled={isLoading}
                    className="w-14 mr-4 px-2 py-1 border rounded"
                  />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={clearHistory}
            disabled={isLoading || messages.length <= 1}
            className="clear-button"
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div className="messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.sender}-message`}
          >
            {renderMessageContent(message)}
            {message.model && message.sender === 'assistant' && !message.loading && (
              <div className="message-model">Using model: {message.model}</div>
            )}
          </div>
        ))}
        {isLoading && !messages.some(m => m.loading) && (
          <div className="message assistant-message">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder="Type your question..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          disabled={isLoading}
        />
        {isStreaming ? (
          <button 
            type="button" 
            className="stop-button"
            onClick={handleAbortStream}
          >
            Stop
          </button>
        ) : (
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !newMessage.trim()}
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatAssistant; 