import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import TaskList from './components/TaskList';
import ChatAssistant from './components/ChatAssistant';
import TaskStats from './components/TaskStats';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './App.css';

const API_URL = 'http://localhost:8000';

function MainApp() {
  const [activeTab, setActiveTab] = useState('chat');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    completed: false
  });
  const [dueDateTime, setDueDateTime] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    // Format the date and time for API submission
    const formattedDueDate = dueDateTime ? dueDateTime.toISOString() : '';

    try {
      await axios.post(`${API_URL}/tasks`, {
        ...newTask,
        due_date: formattedDueDate
      });
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        completed: false
      });
      setDueDateTime(null);
      fetchTasks();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleTaskUpdate = async (updatedTask) => {
    try {
      await axios.put(`${API_URL}/tasks/${updatedTask.id}`, updatedTask);
      fetchTasks();
      
      // Show statistics when a task is marked as completed
      if (updatedTask.completed) {
        setShowStats(true);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({
      ...newTask,
      [name]: value
    });
  };

  const handleDateTimeChange = (date) => {
    setDueDateTime(date);
    if (date) {
      const isoString = date.toISOString();
      setNewTask({
        ...newTask,
        due_date: isoString
      });
    } else {
      setNewTask({
        ...newTask,
        due_date: ''
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <h1>TimeWhisper</h1>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div className="tabs">
          <button 
            className={activeTab === 'chat' ? 'active' : ''} 
            onClick={() => setActiveTab('chat')}
          >
            Chat Assistant
          </button>
          <button 
            className={activeTab === 'tasks' ? 'active' : ''} 
            onClick={() => setActiveTab('tasks')}
          >
            Task Manager
          </button>
          <button 
            className={activeTab === 'stats' ? 'active' : ''} 
            onClick={() => setActiveTab('stats')}
          >
            Task Statistics
          </button>
        </div>
      </header>

      <main>
        <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
          <ChatAssistant />
        </div>
        <div style={{ display: activeTab === 'tasks' ? 'block' : 'none' }}>
          <div className="tasks-container">
            <form className="task-form" onSubmit={handleAddTask}>
              <input 
                type="text" 
                name="title" 
                placeholder="Task Title" 
                value={newTask.title} 
                onChange={handleInputChange} 
                required 
              />
              <input 
                type="text" 
                name="description" 
                placeholder="Task Description (Optional)" 
                value={newTask.description || ''} 
                onChange={handleInputChange} 
              />
              <div className="date-time-picker-wrapper">
                <label htmlFor="due-date-time">Due Date & Time:</label>
                <DatePicker
                  id="due-date-time"
                  selected={dueDateTime}
                  onChange={handleDateTimeChange}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={30}
                  timeCaption="Time"
                  dateFormat="MMMM d, yyyy h:mm aa"
                  placeholderText="Select due date and time"
                  className="date-time-picker"
                />
              </div>
              <button type="submit">Add Task</button>
            </form>

            <TaskList 
              tasks={tasks} 
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
            
            {/* Statistics popup shown when task is completed */}
            {showStats && (
              <div className="task-stats-popup">
                <div className="task-stats-popup-content">
                  <button 
                    className="close-stats-button" 
                    onClick={() => setShowStats(false)}
                  >
                    &times;
                  </button>
                  <TaskStats tasks={tasks} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: activeTab === 'stats' ? 'block' : 'none' }}>
          <div className="stats-container">
            <TaskStats tasks={tasks} />
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App; 