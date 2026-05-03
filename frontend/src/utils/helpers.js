// Common utilities for frontend
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US');
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US');
};

export const getStatusColor = (status) => {
  const colors = {
    active: '#2d5016',
    inactive: '#666666',
    maintenance: '#663c00',
    completed: '#2d5016',
    in_progress: '#004b87',
    pending: '#663c00',
  };
  return colors[status] || '#666666';
};

export const getStatusBg = (status) => {
  const backgrounds = {
    active: '#e8f5e9',
    inactive: '#f5f5f5',
    maintenance: '#fff3e0',
    completed: '#e8f5e9',
    in_progress: '#e3f2fd',
    pending: '#fff3e0',
  };
  return backgrounds[status] || '#f5f5f5';
};

export const truncateText = (text, length = 50) => {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '...' : text;
};

export const sortByDate = (items, field = 'created_at', order = 'desc') => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a[field]);
    const dateB = new Date(b[field]);
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
};

export const filterByStatus = (items, status) => {
  if (!status) return items;
  return items.filter(item => item.status === status);
};
