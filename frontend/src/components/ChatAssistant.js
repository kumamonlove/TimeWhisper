import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';  // Import remarkGfm plugin
import { AiOutlineMessage, AiOutlinePlus, AiOutlineDelete, AiOutlineEdit, AiOutlineImport, AiOutlineTable } from 'react-icons/ai';

const API_URL = 'http://localhost:8000';

const ChatAssistant = ({ onAddTasks, onSwitchTab }) => {
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
  
  // New states for conversation management
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  
  // New state for task table import
  const [detectedTables, setDetectedTables] = useState([]);

  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const abortControllerRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
    fetchModels();
    fetchConversations();

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

  // Detect tables in messages whenever messages change
  useEffect(() => {
    detectTables();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch available models
  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/models`);
      setModels(response.data);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  // Detect tables in the latest assistant message
  const detectTables = () => {
    // Find the latest assistant message
    const assistantMessages = messages.filter(msg => msg.sender === 'assistant');
    if (assistantMessages.length === 0) return;
    
    const latestMessage = assistantMessages[assistantMessages.length - 1];
    if (!latestMessage.text) return;
    
    // Detect markdown tables in the message
    const detectedTables = [];
    // This regex matches markdown tables with headers, separator row, and data rows
    const tableRegex = /(?:^\|\s*(.+?)\s*\|\s*\n\|\s*[-:]+\s*\|\s*[-:]+[\s\|:-]*\n((?:\|[^\n]+\|\n)+))/gm;
    
    // Search for keywords to display after import
    const dateKeywordRegex = /(today|tomorrow|day after tomorrow|in three days|next (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|今天|明天|后天|大后天|下周[一二三四五六日天])/gi;
    let dateKeywordMatch;
    let detectedDateKeyword = '';
    
    // Look for date keywords in the latest message
    while ((dateKeywordMatch = dateKeywordRegex.exec(latestMessage.text)) !== null) {
      detectedDateKeyword = dateKeywordMatch[1];
      break; // Only take the first matching keyword
    }
    
    let match;
    while ((match = tableRegex.exec(latestMessage.text)) !== null) {
      try {
        const fullTable = match[0];
        
        // Split into lines
        const lines = fullTable.split('\n').filter(line => line.trim().length > 0);
        
        // Header row is the first line
        const headerRow = lines[0];
        
        // Separator row is the second line
        const separatorRow = lines[1];
        
        // Data rows are the rest
        const dataRows = lines.slice(2);
        
        // Parse header to get column names
        const headers = headerRow
          .split('|')
          .filter(cell => cell.trim() !== '')
          .map(cell => cell.trim());
        
        // Parse data rows
        const rows = dataRows
          .map(row => {
            const cells = row
              .split('|')
              .filter(cell => cell.trim() !== '')
              .map(cell => {
                // Clean the cell content by removing Markdown formatting
                let cleanedCell = cell.trim();
                
                // Remove bold formatting (**text**)
                cleanedCell = cleanedCell.replace(/\*\*(.*?)\*\*/g, '$1');
                
                // Remove italic formatting (*text*)
                cleanedCell = cleanedCell.replace(/\*(.*?)\*/g, '$1');
                
                // Remove inline code formatting (`text`)
                cleanedCell = cleanedCell.replace(/`(.*?)`/g, '$1');
                
                return cleanedCell;
              });
            return cells;
          });
        
        if (headers.length > 0 && rows.length > 0) {
          detectedTables.push({
            id: `table-${Date.now()}-${detectedTables.length}`,
            headers,
            rows,
            fullTable,
            dateKeyword: detectedDateKeyword // Add detected date keyword
          });
        }
      } catch (error) {
        console.error('Error parsing table:', error);
      }
    }
    
    if (detectedTables.length > 0) {
      console.log('Detected tables:', detectedTables);
      setDetectedTables(detectedTables);
    }
  };
  
  // Import tasks from a detected table
  const importTasksFromTable = async (table) => {
    try {
      // Determine which columns to use for task properties
      const titleIndex = table.headers.findIndex(h => 
        /title|task|name|activity/i.test(h)
      );
      
      const descriptionIndex = table.headers.findIndex(h => 
        /description|detail|note/i.test(h)
      );
      
      const dueDateIndex = table.headers.findIndex(h => 
        /due|date|deadline|time/i.test(h)
      );
      
      if (titleIndex === -1) {
        alert("Could not identify a title column in the table. Please ensure your table has a column for task titles.");
        return;
      }
      
      // Detect date keywords in table content or title
      let tableDate = null;
      let tableText = table.fullTable;
      
      // Check if there are date keywords in the table content
      const dateKeywords = {
        'today': 0,
        'tomorrow': 1,
        'day after tomorrow': 2,
        'in three days': 3,
        'next Monday': getNextWeekday(1),
        'next Tuesday': getNextWeekday(2),
        'next Wednesday': getNextWeekday(3),
        'next Thursday': getNextWeekday(4),
        'next Friday': getNextWeekday(5),
        'next Saturday': getNextWeekday(6),
        'next Sunday': getNextWeekday(0),
        // Chinese keywords for backward compatibility
        '今天': 0,
        '明天': 1,
        '后天': 2,
        '大后天': 3,
        '下周一': getNextWeekday(1),
        '下周二': getNextWeekday(2),
        '下周三': getNextWeekday(3),
        '下周四': getNextWeekday(4),
        '下周五': getNextWeekday(5),
        '下周六': getNextWeekday(6),
        '下周日': getNextWeekday(0),
        '下周天': getNextWeekday(0)
      };
      
      // Check for date keywords in recent messages
      const recentMessages = messages.slice(-5).map(msg => msg.text).join(" ");
      
      for (const [keyword, dayOffset] of Object.entries(dateKeywords)) {
        if (tableText.includes(keyword) || recentMessages.includes(keyword)) {
          // Found a date keyword
          const today = new Date();
          if (typeof dayOffset === 'number') {
            tableDate = new Date(today);
            tableDate.setDate(today.getDate() + dayOffset);
          } else {
            tableDate = dayOffset; // For 'next weekday' cases, it's already a date object
          }
          console.log(`Detected date keyword "${keyword}", setting date to: ${tableDate.toLocaleDateString()}`);
          break;
        }
      }
      
      // If no date keyword found, default to today's date
      if (!tableDate) {
        tableDate = new Date();
        console.log("No date keywords detected, defaulting to today's date");
      }
      
      // Create task times, distribute tasks evenly throughout the day
      const startHour = 9; // Start at 9 AM
      const endHour = 18; // End at 6 PM
      const taskCount = table.rows.length;
      const timeInterval = (endHour - startHour) / taskCount; // Evenly distribute time
      
      // Create tasks from each row
      const tasksToCreate = table.rows.map((row, index) => {
        const title = row[titleIndex] ? row[titleIndex].replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1') : "Untitled Task";
        
        const description = descriptionIndex !== -1 ? 
          (row[descriptionIndex] ? row[descriptionIndex].replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1') : "") : 
          "";
        
        let dueDate = "";
        
        // Use the date column specified in the table or the detected table date
        if (dueDateIndex !== -1) {
          const dateStr = row[dueDateIndex] ? row[dueDateIndex].replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1') : "";
          if (dateStr) {
            try {
              // Try to parse various date formats
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate.getTime())) {
                dueDate = parsedDate.toISOString();
              } else {
                // Check for date keywords in the date string
                for (const [keyword, dayOffset] of Object.entries(dateKeywords)) {
                  if (dateStr.includes(keyword)) {
                    const specificDate = typeof dayOffset === 'number' ? 
                      new Date(new Date().setDate(new Date().getDate() + dayOffset)) : dayOffset;
                    dueDate = specificDate.toISOString();
                    break;
                  }
                }
              }
            } catch (e) {
              console.error("Failed to parse date:", dateStr);
            }
          }
        }
        
        // If no date was successfully parsed, use the table date and add time
        if (!dueDate && tableDate) {
          const taskDate = new Date(tableDate);
          
          // Assign time based on task index
          const taskHour = startHour + index * timeInterval;
          const hours = Math.floor(taskHour);
          const minutes = Math.floor((taskHour - hours) * 60);
          
          taskDate.setHours(hours, minutes, 0, 0);
          dueDate = taskDate.toISOString();
        }
        
        return {
          title,
          description,
          due_date: dueDate,
          completed: false
        };
      });
      
      if (onAddTasks) {
        // Use the parent component's function to add tasks
        const result = await onAddTasks(tasksToCreate);
        
        if (result.success) {
          // Show success message
          alert(`Successfully imported ${result.count} tasks with scheduled times! Switching to Task Manager...`);
          
          // Switch to tasks tab
          if (onSwitchTab) {
            onSwitchTab('tasks');
          }
          
          // Clear detected tables after import
          setDetectedTables([]);
        } else {
          alert(`Failed to import tasks: ${result.error}`);
        }
      } else {
        // Fall back to direct API calls if onAddTasks prop is not provided
        for (const task of tasksToCreate) {
          await axios.post(`${API_URL}/tasks`, task);
        }
        
        // Show success message
        alert(`Successfully imported ${tasksToCreate.length} tasks with scheduled times!`);
        
        // Clear detected tables after import
        setDetectedTables([]);
      }
      
    } catch (error) {
      console.error('Failed to import tasks:', error);
      alert('Failed to import tasks. Please try again.');
    }
  };

  // Helper function: Calculate the date of the next specified weekday
  const getNextWeekday = (dayOfWeek) => {
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, ...
    
    let daysToAdd = dayOfWeek - todayDayOfWeek;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // If it's a day in the current week, add 7 days to make it next week
    }
    
    // Add another 7 days to ensure it's "next week"
    daysToAdd += 7;
    
    const nextWeekday = new Date(today);
    nextWeekday.setDate(today.getDate() + daysToAdd);
    return nextWeekday;
  };

  // Fetch conversation history
  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/conversations`);
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
    }
  };

  // Create a new conversation
  const createNewConversation = async () => {
    try {
      const response = await axios.post(`${API_URL}/conversations`, {
        title: 'New Conversation',
        model: selectedModel
      });
      
      setActiveConversation(response.data);
      setMessages([
        { id: 1, text: 'Hello! I am your time management assistant. I can help you manage tasks, schedule time, and provide time management advice. How can I help you?', sender: 'assistant' }
      ]);
      
      // Refresh conversation list
      fetchConversations();
      
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  // Load a specific conversation
  const loadConversation = async (conversationId) => {
    try {
      const response = await axios.get(`${API_URL}/conversations/${conversationId}`);
      const conversation = response.data;
      
      setActiveConversation(conversation);
      setSelectedModel(conversation.model || 'deepseek-chat');
      
      // Convert message format
      if (conversation.messages && conversation.messages.length > 0) {
        const formattedMessages = conversation.messages.map(msg => ({
          id: msg.id,
          text: msg.content,
          sender: msg.role,
          created_at: msg.created_at
        }));
        setMessages(formattedMessages);
      } else {
        setMessages([
          { id: 1, text: 'Hello! I am your time management assistant. I can help you manage tasks, schedule time, and provide time management advice. How can I help you?', sender: 'assistant' }
        ]);
      }
      
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // Delete a conversation
  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation(); // Prevent event propagation
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        await axios.delete(`${API_URL}/conversations/${conversationId}`);
        
        // If deleting the active conversation, create a new one
        if (activeConversation && activeConversation.id === conversationId) {
          createNewConversation();
        }
        
        // Refresh conversation list
        fetchConversations();
        
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  // Update conversation title
  const updateConversationTitle = async (e) => {
    e.preventDefault();
    
    if (!activeConversation) return;
    
    try {
      await axios.put(`${API_URL}/conversations/${activeConversation.id}/title`, {
        title: editedTitle
      });
      
      setActiveConversation({
        ...activeConversation,
        title: editedTitle
      });
      
      setIsEditingTitle(false);
      fetchConversations();
      
    } catch (error) {
      console.error('Failed to update conversation title:', error);
    }
  };

  // Start editing the title
  const startEditingTitle = () => {
    if (activeConversation) {
      setEditedTitle(activeConversation.title);
      setIsEditingTitle(true);
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
          history: historyMessages, // Add history messages
          conversation_id: activeConversation ? activeConversation.id : null // Add conversation ID
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
              
              // Update conversation list after content is updated
              fetchConversations();
              break;
            }
            
            // Process error events
            if (data.error) {
              console.error('Stream error:', data.error);
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
          } catch (e) {
            console.error('Failed to parse event:', e, event);
          }
        }
      }
    } catch (error) {
      console.error('Stream request failed:', error);
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.loading) {
          return prev.map(msg =>
            msg.id === lastMessage.id
              ? { ...msg, text: `Error: ${error.message}`, loading: false }
              : msg
          );
        }
        return [
          ...prev,
          {
            id: Date.now() + 1,
            text: `Error: ${error.message}`,
            sender: 'assistant'
          }
        ];
      });
      
      setIsLoading(false);
      setIsStreaming(false);
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
        history: historyMessages, // Add history messages
        conversation_id: activeConversation ? activeConversation.id : null // Add conversation ID
      });

      const assistantMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        sender: 'assistant',
        model: response.data.model
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation list after content is updated
      fetchConversations();
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

    // If there's no active conversation, create a new one
    if (!activeConversation) {
      try {
        const response = await axios.post(`${API_URL}/conversations`, {
          title: newMessage.substring(0, 30) + (newMessage.length > 30 ? '...' : ''),
          model: selectedModel
        });
        setActiveConversation(response.data);
        
        // Continue sending the message
        const userMessage = {
          id: Date.now(),
          text: newMessage,
          sender: 'user'
        };

        setNewMessage('');
        setIsLoading(true);

        if (isStreamMode) {
          await handleStreamResponse({...userMessage, conversation_id: response.data.id});
        } else {
          await handleNormalResponse({...userMessage, conversation_id: response.data.id});
        }
        
        // Update conversation list
        fetchConversations();
      } catch (error) {
        console.error('Failed to create new conversation:', error);
        return;
      }
    } else {
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
      // Check if this message contains any detected tables
      const hasTables = detectedTables.length > 0 && 
                        messages.filter(msg => msg.sender === 'assistant')
                               .slice(-1)[0]?.id === message.id;
                               
      return (
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}  // Add remarkGfm plugin to support tables and GFM syntax
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, '')}
                    style={tomorrow}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {message.text}
          </ReactMarkdown>
          {message.loading && (
            <span className="loading-cursor"></span>
          )}
          
          {/* Show import buttons for any detected tables in the latest assistant message */}
          {hasTables && (
            <div className="table-import-actions">
              {detectedTables.map((table, index) => (
                <button 
                  key={table.id}
                  className="import-table-button"
                  onClick={() => importTasksFromTable(table)}
                >
                  <AiOutlineImport /> Import Table {index + 1} to Task Manager
                  {table.dateKeyword && <span className="date-info">(Detected date: {table.dateKeyword})</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    return message.text;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to send a prompt to generate a plan table
  const requestPlanTable = () => {
    const planTablePrompt = "Please create a detailed weekly planning table for me with the following columns: | Task | Description | Due Date | Priority |. Add at least 5 example tasks with realistic descriptions, clear due dates (please use terms like 'today', 'tomorrow', 'day after tomorrow', or 'next Monday/Tuesday/etc.'), and priority levels.";
    setNewMessage(planTablePrompt);
  };

  return (
    <div className={`chat-app ${showSidebar ? 'with-sidebar' : ''}`}>
      {/* Sidebar: Conversation list */}
      <div className={`chat-sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h3>Conversation History</h3>
          <button className="new-chat-button" onClick={createNewConversation}>
            <AiOutlinePlus /> New Conversation
          </button>
        </div>
        
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">No conversations yet</div>
          ) : (
            conversations.map(conversation => (
              <div 
                key={conversation.id} 
                className={`conversation-item ${activeConversation && activeConversation.id === conversation.id ? 'active' : ''}`}
                onClick={() => loadConversation(conversation.id)}
              >
                <div className="conversation-icon">
                  <AiOutlineMessage />
                </div>
                <div className="conversation-details">
                  <div className="conversation-title">{conversation.title}</div>
                  <div className="conversation-date">{formatDate(conversation.updated_at)}</div>
                </div>
                <button 
                  className="delete-conversation-button"
                  onClick={(e) => deleteConversation(conversation.id, e)}
                >
                  <AiOutlineDelete />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Sidebar toggle button */}
      <button 
        className="toggle-sidebar-button"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        {showSidebar ? '«' : '»'}
      </button>
      
      {/* Main chat area */}
      <div className="chat-container" ref={chatContainerRef}>
        <div className="model-selector">
          {/* Model selection and streaming toggle */}
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
          
          {/* History options and action buttons */}
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
            <div className="action-buttons">
              <button
                onClick={requestPlanTable}
                disabled={isLoading}
                className="plan-table-button mr-2"
                title="Request a plan table that can be imported as tasks"
              >
                <AiOutlineTable /> Request Plan Table
              </button>
              <button
                onClick={clearHistory}
                disabled={isLoading || messages.length <= 1}
                className="clear-button"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>

        {/* Conversation title editing */}
        {activeConversation && (
          <div className="conversation-title-container">
            {isEditingTitle ? (
              <form onSubmit={updateConversationTitle} className="edit-title-form">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  autoFocus
                  className="title-input"
                />
                <button type="submit" className="save-title-button">Save</button>
                <button
                  type="button"
                  className="cancel-edit-button"
                  onClick={() => setIsEditingTitle(false)}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="active-conversation-title">
                <h2>{activeConversation.title}</h2>
                <button
                  className="edit-title-button"
                  onClick={startEditingTitle}
                >
                  <AiOutlineEdit />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="messages-container">
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
    </div>
  );
};

export default ChatAssistant; 