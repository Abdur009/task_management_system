import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import NavigationBar from './components/NavigationBar';
import Profile from './components/Profile';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TaskDetails from './components/TaskDetails';
import SearchAndFilter from './components/SearchAndFilter';
import TaskProgress from './components/TaskProgress';
import { taskService } from './services/api';

function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showProfile, setShowProfile] = useState(false);

  // Handle hash-based navigation
  useEffect(() => {
    const handleHashChange = () => {
      setShowProfile(window.location.hash === '#profile');
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch all tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to fetch tasks. Make sure the backend server is running on port 3000.');
      }
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setEditingTask(null);
    setShowForm(false);
  };

  const handleTaskCreate = () => {
    setEditingTask(null);
    setSelectedTask(null);
    setShowForm(true);
  };

  const handleTaskEdit = (task) => {
    setEditingTask(task);
    setSelectedTask(null);
    setShowForm(true);
  };

  const handleTaskSave = async (taskData) => {
    try {
      setError(null);
      
      // Optimistic update - update UI immediately
      let optimisticTask;
      if (editingTask) {
        optimisticTask = { ...editingTask, ...taskData };
        setTasks(prevTasks => 
          prevTasks.map(task => task.id === editingTask.id ? optimisticTask : task)
        );
      } else {
        optimisticTask = { ...taskData, id: Date.now() }; // Temporary ID
        setTasks(prevTasks => [...prevTasks, optimisticTask]);
      }

      // Perform actual API call
      if (editingTask) {
        await taskService.updateTask(editingTask.id, taskData);
      } else {
        await taskService.createTask(taskData);
      }
      
      // Refresh tasks list to get server data (with proper IDs)
      await fetchTasks();
      setShowForm(false);
      setEditingTask(null);
      setSelectedTask(null);
    } catch (err) {
      // Revert optimistic update on error
      await fetchTasks();
      setError('Failed to save task. Please try again.');
      console.error('Error saving task:', err);
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      setError(null);
      
      // Optimistic update - remove from UI immediately
      const taskToDelete = tasks.find(t => t.id === taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // Clear selection if deleted task was selected
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }

      // Perform actual API call
      await taskService.deleteTask(taskId);
      
      // Refresh to ensure sync (though optimistic update already handled it)
      await fetchTasks();
    } catch (err) {
      // Revert optimistic update on error
      await fetchTasks();
      setError('Failed to delete task. Please try again.');
      console.error('Error deleting task:', err);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  const handleDetailsClose = () => {
    setSelectedTask(null);
  };

  // Filter tasks based on search query and status filter
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (task) =>
          task.title?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tasks, searchQuery, statusFilter]);

  // Show profile page if hash is set
  if (showProfile) {
    return (
      <>
        <NavigationBar />
        <Profile onBack={() => {
          window.location.hash = '';
          setShowProfile(false);
        }} />
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
          <header className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                  Task Management
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Elevate your productivity with <span className="font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">QuantumDo</span>
                </p>
              </div>
            </div>
          </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border-l-4 border-red-500 text-red-700 rounded-xl shadow-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Task Progress Tracking */}
        {!loading && tasks.length > 0 && (
          <div className="mb-6">
            <TaskProgress tasks={tasks} />
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={handleTaskCreate}
            className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500/50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Task
          </button>
          {(searchQuery || statusFilter !== 'all') && (
            <div className="text-sm text-gray-600">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
            <p className="text-gray-600 text-sm font-medium">Loading tasks...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task List - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <SearchAndFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
              <TaskList
                tasks={filteredTasks}
                onTaskSelect={handleTaskSelect}
                onTaskEdit={handleTaskEdit}
                onTaskDelete={handleTaskDelete}
                selectedTaskId={selectedTask?.id}
              />
            </div>

            {/* Task Form or Task Details - Takes 1 column on large screens */}
            <div className="lg:col-span-1">
              {showForm ? (
                <TaskForm
                  task={editingTask}
                  onSave={handleTaskSave}
                  onCancel={handleFormCancel}
                />
              ) : (
                <TaskDetails
                  task={selectedTask}
                  onClose={handleDetailsClose}
                  onEdit={handleTaskEdit}
                  onDelete={handleTaskDelete}
                />
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

function App() {
  const { isAuthenticated, loading, login, signup } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-4 shadow-xl">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm font-medium">Loading QuantumDo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return showSignup ? (
      <Signup
        onSignup={signup}
        onSwitchToLogin={() => setShowSignup(false)}
      />
    ) : (
      <Login
        onLogin={login}
        onSwitchToSignup={() => setShowSignup(true)}
      />
    );
  }

  return <TaskManager />;
}

export default App;

