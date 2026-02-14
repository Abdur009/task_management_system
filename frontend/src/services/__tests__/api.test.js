import { apiCache } from '../../utils/apiCache';

// Mock axios BEFORE importing the api module
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      post: jest.fn(),
    },
    create: jest.fn(() => mockAxiosInstance),
  };
});

// Mock apiCache
jest.mock('../../utils/apiCache', () => ({
  apiCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidatePattern: jest.fn(),
  },
  requestDeduplicator: {
    dedupe: jest.fn((key, fn) => fn()),
    clear: jest.fn(),
  },
}));

// Now import the services after mocks are set up
import axios from 'axios';
import { taskService, authService } from '../api';

describe('API Services', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    
    // Get the mock instance
    mockAxiosInstance = axios.create();
    
    // Reset mock instances
    mockAxiosInstance.get.mockClear();
    mockAxiosInstance.post.mockClear();
    mockAxiosInstance.put.mockClear();
    mockAxiosInstance.delete.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('taskService', () => {
    describe('getAllTasks', () => {
      it('should fetch all tasks from API', async () => {
        const mockTasks = [{ id: 1, title: 'Test Task' }];
        apiCache.get.mockReturnValue(null); // No cache
        mockAxiosInstance.get.mockResolvedValue({ data: mockTasks });

        const tasks = await taskService.getAllTasks();
        expect(tasks).toEqual(mockTasks);
      });

      it('should return cached data if available', async () => {
        const cachedTasks = [{ id: 1, title: 'Cached Task' }];
        apiCache.get.mockReturnValue(cachedTasks);

        const tasks = await taskService.getAllTasks();
        expect(tasks).toEqual(cachedTasks);
        expect(apiCache.get).toHaveBeenCalledWith('tasks:all');
      });
    });

    describe('createTask', () => {
      it('should create a new task and invalidate cache', async () => {
        const newTask = { title: 'New Task', status: 'Pending' };
        const createdTask = { id: 1, ...newTask };
        
        mockAxiosInstance.post.mockResolvedValue({ data: createdTask });

        const result = await taskService.createTask(newTask);
        expect(result).toEqual(createdTask);
        expect(apiCache.invalidatePattern).toHaveBeenCalledWith('tasks:');
      });
    });

    describe('updateTask', () => {
      it('should update a task and invalidate cache', async () => {
        const updatedTask = { id: 1, title: 'Updated Task' };
        
        mockAxiosInstance.put.mockResolvedValue({ data: updatedTask });

        const result = await taskService.updateTask(1, updatedTask);
        expect(result).toEqual(updatedTask);
        expect(apiCache.delete).toHaveBeenCalledWith('tasks:1');
        expect(apiCache.invalidatePattern).toHaveBeenCalledWith('tasks:');
      });
    });

    describe('deleteTask', () => {
      it('should delete a task and invalidate cache', async () => {
        mockAxiosInstance.delete.mockResolvedValue({ data: { message: 'Deleted' } });

        await taskService.deleteTask(1);
        expect(apiCache.delete).toHaveBeenCalledWith('tasks:1');
        expect(apiCache.invalidatePattern).toHaveBeenCalledWith('tasks:');
      });
    });
  });

  describe('authService', () => {
    describe('login', () => {
      it('should login user successfully', async () => {
        const credentials = { email: 'test@example.com', password: 'password123' };
        const mockResponse = {
          token: 'test-token',
          user: { id: 1, email: 'test@example.com' },
        };

        const authMockInstance = axios.create();
        authMockInstance.post.mockResolvedValue({ data: mockResponse });

        const result = await authService.login(credentials);
        expect(result).toEqual(mockResponse);
      });

      it('should throw error on failed login', async () => {
        const credentials = { email: 'test@example.com', password: 'wrong' };
        
        const authMockInstance = axios.create();
        authMockInstance.post.mockRejectedValue({
          response: { data: { error: 'Invalid credentials' } },
        });

        await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
      });
    });
  });
});
