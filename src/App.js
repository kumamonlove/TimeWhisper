import React, { useState, useEffect } from 'react';
import TaskList from './components/TaskList';
import ChatAssistant from './components/ChatAssistant';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    completed: false
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to obtain task:', error);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await axios.post(`${API_URL}/tasks`, newTask);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        completed: false
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleTaskUpdate = async (updatedTask) => {
    try {
      await axios.put(`${API_URL}/tasks/${updatedTask.id}`, updatedTask);
      fetchTasks();
    } catch (error) {
      console.error('Update task failed:', error);
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
      fetchTasks();
    } catch (error) {
      console.error('Task deletion failed:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({
      ...newTask,
      [name]: value
    });
  };

  return (
    <div className="app-container">
      <header>
        <h1>TimeWhisper</h1>
        <div className="tabs">
          <button 
            className={activeTab === 'tasks' ? 'active' : ''} 
            onClick={() => setActiveTab('tasks')}
          >
            task management
          </button>
          <button 
            className={activeTab === 'chat' ? 'active' : ''} 
            onClick={() => setActiveTab('chat')}
          >
            Chat Assistant
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'tasks' ? (
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
                placeholder="Task description (optional)" 
                value={newTask.description || ''} 
                onChange={handleInputChange} 
              />
              <input 
                type="date" 
                name="due_date" 
                placeholder="deadline" 
                value={newTask.due_date || ''} 
                onChange={handleInputChange} 
              />
              <button type="submit">add task</button>
            </form>

            <TaskList 
              tasks={tasks} 
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          </div>
        ) : (
          <ChatAssistant />
        )}
      </main>
    </div>
  );
}

export default App; 