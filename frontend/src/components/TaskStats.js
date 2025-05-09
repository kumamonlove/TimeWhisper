import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = ['#3a6ea5', '#6b46c1', '#38a169', '#e53e3e', '#dd6b20', '#0891b2'];

const TaskStats = ({ tasks }) => {
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    categories: {},
    weekly: Array(7).fill(0),
    yearly: Array(12).fill(0)
  });

  // Update statistics
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    // Completed and pending tasks
    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.length - completed;

    // Categorize by the first word in the task title
    const categories = {};
    tasks.forEach(task => {
      const category = task.title.split(' ')[0].toLowerCase();
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
    });

    // Weekly completed tasks
    const weekly = Array(7).fill(0);
    // Monthly completed tasks
    const yearly = Array(12).fill(0);

    tasks.forEach(task => {
      if (task.completed && task.due_date) {
        const date = new Date(task.due_date);
        const day = date.getDay(); // 0-6
        const month = date.getMonth(); // 0-11
        
        weekly[day]++;
        yearly[month]++;
      }
    });

    setStats({
      completed,
      pending,
      categories,
      weekly,
      yearly
    });
  }, [tasks]);

  // Prepare chart data
  const pieData = [
    { name: 'Completed', value: stats.completed },
    { name: 'Pending', value: stats.pending }
  ];

  const categoryData = Object.keys(stats.categories).map(key => ({
    name: key,
    value: stats.categories[key]
  }));

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weeklyData = weekDays.map((day, index) => ({
    name: day,
    Completed: stats.weekly[index]
  }));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearlyData = months.map((month, index) => ({
    name: month,
    Completed: stats.yearly[index]
  }));

  return (
    <div className="stats-container">
      <h2>Task Statistics & Visualization</h2>
      
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Task Completion Status</h3>
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-value">{stats.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{tasks.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-card">
          <h3>Task Category Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={categoryData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3a6ea5" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-card full-width">
          <h3>Weekly Task Completion</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={weeklyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Completed" fill="#6b46c1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-card full-width">
          <h3>Annual Task Completion Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={yearlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Completed" stroke="#38a169" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskStats; 