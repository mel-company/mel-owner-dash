export const renderText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
  
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
  
    if (typeof value === 'object') {
      const v = value as { name?: string; description?: string };
      return v.name || v.description || '';
    }
  
    return '';
  };
  