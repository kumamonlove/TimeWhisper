import React from 'react';
import { FaTrash } from 'react-icons/fa';

const TaskList = ({ tasks, onTaskUpdate, onTaskDelete }) => {
  if (tasks.length === 0) {
    return <p className="no-tasks">No tasks yet. Add a task to get started!</p>;
  }

  const handleToggleComplete = (task) => {
    onTaskUpdate({
      ...task,
      completed: !task.completed
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'No due date';
    
    const date = new Date(dateTimeString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Format date: Month Day, Year at Hour:Minute AM/PM
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleString('en-US', options);
  };

  return (
    <div className="task-list">
      <h2>Your Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id} className={task.completed ? 'completed' : ''}>
            <div className="task-header">
              <h3>{task.title}</h3>
              <div className="task-actions">
                <button 
                  className="toggle-button"
                  onClick={() => handleToggleComplete(task)}
                >
                  {task.completed ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
                <button 
                  className="delete-button"
                  onClick={() => onTaskDelete(task.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {task.description && <p className="task-description">{task.description}</p>}
            {task.due_date && (
              <p className="task-due-date">
                <span className="due-label">Due: </span>
                <span className="due-datetime">{formatDateTime(task.due_date)}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList; 