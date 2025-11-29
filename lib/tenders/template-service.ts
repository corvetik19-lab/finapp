import { TenderStageTemplate } from './types';

export async function loadStageTemplates(companyId?: string): Promise<TenderStageTemplate[]> {
  try {
    const url = companyId 
      ? `/api/tenders/stage-templates?company_id=${companyId}`
      : '/api/tenders/stage-templates';
      
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load templates');
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error loading templates:', error);
    return [];
  }
}

export async function createStageTemplate(data: {
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  stage_ids: string[];
}): Promise<TenderStageTemplate> {
  const response = await fetch('/api/tenders/stage-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create template');
  }
  
  const result = await response.json();
  return result.data;
}

export async function updateStageTemplate(
  id: string,
  data: {
    name: string;
    description: string;
    icon: string;
    is_active: boolean;
    stage_ids: string[];
  }
): Promise<TenderStageTemplate> {
  const response = await fetch(`/api/tenders/stage-templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update template');
  }
  
  const result = await response.json();
  return result.data;
}

export async function deleteStageTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/tenders/stage-templates/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete template');
  }
}
