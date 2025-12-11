import { createRSCClient } from '@/lib/supabase/helpers';
import { getCurrentUserPermissions, canViewAllTenders } from '@/lib/permissions/check-permissions';

// Types
export interface DashboardOverview {
  totalTenders: number;
  activeTenders: number;
  wonTenders: number;
  lostTenders: number;
  pendingTenders: number;
  totalNmck: number;
  totalContractPrice: number;
  totalSavings: number;
  winRate: number;
  avgContractValue: number;
}

export interface StageStats {
  stage: string;
  count: number;
  nmck: number;
  color: string;
  percent: number;
}

export interface TypeStats {
  type: string;
  count: number;
  nmck: number;
  percent: number;
}

export interface MonthlyStats {
  month: string;
  monthKey: string;
  count: number;
  won: number;
  lost: number;
  nmck: number;
  contractValue: number;
}

export interface ManagerStats {
  id: string;
  name: string;
  avatar: string | null;
  totalTenders: number;
  wonTenders: number;
  lostTenders: number;
  winRate: number;
  totalNmck: number;
  totalContractValue: number;
}

export interface RecentTender {
  id: string;
  purchaseNumber: string;
  customer: string;
  subject: string;
  nmck: number;
  stage: string;
  stageColor: string;
  deadline: string | null;
  manager: string | null;
  createdAt: string;
}

export interface UpcomingDeadline {
  id: string;
  purchaseNumber: string;
  customer: string;
  deadline: string;
  daysLeft: number;
  stage: string;
  stageColor: string;
}

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface DashboardData {
  overview: DashboardOverview;
  byStage: StageStats[];
  byType: TypeStats[];
  monthly: MonthlyStats[];
  topManagers: ManagerStats[];
  recentTenders: RecentTender[];
  upcomingDeadlines: UpcomingDeadline[];
  taskSummary: TaskSummary;
}

// Tender row type for DB queries
interface TenderRow {
  id: string;
  purchase_number: string;
  customer: string;
  subject: string;
  nmck: number;
  contract_price: number | null;
  status: string;
  stage_id: string;
  stage: { id: string; name: string; color: string; is_final: boolean } | { id: string; name: string; color: string; is_final: boolean }[] | null;
  type: { id: string; name: string } | { id: string; name: string }[] | null;
  submission_deadline: string;
  manager_id: string | null;
  specialist_id: string | null;
  investor_id: string | null;
  executor_id: string | null;
  created_at: string;
}

// Helper to get stage object from possibly array
function getStage(t: TenderRow) {
  if (!t.stage) return null;
  return Array.isArray(t.stage) ? t.stage[0] : t.stage;
}

// Helper to get type object from possibly array
function getType(t: TenderRow) {
  if (!t.type) return null;
  return Array.isArray(t.type) ? t.type[0] : t.type;
}

export async function getDashboardData(companyId: string): Promise<DashboardData> {
  const supabase = await createRSCClient();

  // Проверяем права пользователя
  const userPermissions = await getCurrentUserPermissions();
  const canViewAll = canViewAllTenders(userPermissions);

  // Если нет права view_all и нет employee_id - возвращаем пустые данные
  if (!canViewAll && !userPermissions.employeeId) {
    return getEmptyDashboardData();
  }

  // Fetch all tenders with stage info
  let query = supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      customer,
      subject,
      nmck,
      contract_price,
      status,
      stage_id,
      stage:tender_stages(id, name, color, is_final),
      type:tender_types(id, name),
      submission_deadline,
      manager_id,
      specialist_id,
      investor_id,
      executor_id,
      created_at
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  // Фильтрация по правам пользователя
  if (!canViewAll && userPermissions.employeeId) {
    query = query.or(
      `manager_id.eq.${userPermissions.employeeId},specialist_id.eq.${userPermissions.employeeId},investor_id.eq.${userPermissions.employeeId},executor_id.eq.${userPermissions.employeeId}`
    );
  }

  const { data: tenders, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tenders for dashboard:', error);
    return getEmptyDashboardData();
  }

  const allTenders = (tenders || []) as TenderRow[];

  // Calculate overview
  const overview = calculateOverview(allTenders);

  // Calculate by stage
  const byStage = calculateByStage(allTenders);

  // Calculate by type
  const byType = calculateByType(allTenders);

  // Calculate monthly stats
  const monthly = calculateMonthlyStats(allTenders);

  // Get top managers
  const topManagers = await getTopManagers(companyId, allTenders);

  // Get recent tenders
  const recentTenders = getRecentTenders(allTenders);

  // Get upcoming deadlines
  const upcomingDeadlines = getUpcomingDeadlines(allTenders);

  // Get task summary (фильтруем по правам пользователя)
  const taskSummary = await getTaskSummary(companyId, canViewAll, userPermissions.employeeId ?? undefined);

  return {
    overview,
    byStage,
    byType,
    monthly,
    topManagers,
    recentTenders,
    upcomingDeadlines,
    taskSummary,
  };
}

function calculateOverview(tenders: TenderRow[]): DashboardOverview {
  const totalTenders = tenders.length;
  const wonTenders = tenders.filter(t => t.status === 'won').length;
  const lostTenders = tenders.filter(t => t.status === 'lost').length;
  const activeTenders = tenders.filter(t => t.status === 'active').length;
  const pendingTenders = tenders.filter(t => {
    const stage = getStage(t);
    const stageName = stage?.name?.toLowerCase() || '';
    return stageName.includes('анализ') || stageName.includes('новы');
  }).length;

  const totalNmck = tenders.reduce((sum, t) => sum + (t.nmck || 0), 0);
  const totalContractPrice = tenders
    .filter(t => t.status === 'won')
    .reduce((sum, t) => sum + (t.contract_price || t.nmck || 0), 0);

  const completedTenders = wonTenders + lostTenders;
  const winRate = completedTenders > 0 ? (wonTenders / completedTenders) * 100 : 0;
  
  const totalSavings = tenders
    .filter(t => t.status === 'won')
    .reduce((sum, t) => {
      const nmck = t.nmck || 0;
      const contract = t.contract_price || nmck;
      return sum + (nmck - contract);
    }, 0);

  const avgContractValue = wonTenders > 0 ? totalContractPrice / wonTenders : 0;

  return {
    totalTenders,
    activeTenders,
    wonTenders,
    lostTenders,
    pendingTenders,
    totalNmck,
    totalContractPrice,
    totalSavings,
    winRate,
    avgContractValue,
  };
}

function calculateByStage(tenders: TenderRow[]): StageStats[] {
  const stageCounts: Record<string, { count: number; nmck: number; color: string }> = {};
  
  tenders.forEach(t => {
    const stage = getStage(t);
    const stageName = stage?.name || 'Новый';
    const stageColor = stage?.color || '#6b7280';
    if (!stageCounts[stageName]) {
      stageCounts[stageName] = { count: 0, nmck: 0, color: stageColor };
    }
    stageCounts[stageName].count++;
    stageCounts[stageName].nmck += t.nmck || 0;
  });

  const total = tenders.length || 1;
  
  return Object.entries(stageCounts)
    .map(([stage, data]) => ({
      stage,
      count: data.count,
      nmck: data.nmck,
      color: data.color,
      percent: (data.count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateByType(tenders: TenderRow[]): TypeStats[] {
  const typeCounts: Record<string, { count: number; nmck: number }> = {};
  
  tenders.forEach(t => {
    const type = getType(t);
    const typeName = type?.name || 'Другое';
    if (!typeCounts[typeName]) {
      typeCounts[typeName] = { count: 0, nmck: 0 };
    }
    typeCounts[typeName].count++;
    typeCounts[typeName].nmck += t.nmck || 0;
  });

  const total = tenders.length || 1;
  
  return Object.entries(typeCounts)
    .map(([type, data]) => ({
      type,
      count: data.count,
      nmck: data.nmck,
      percent: (data.count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateMonthlyStats(tenders: TenderRow[]): MonthlyStats[] {
  const months: MonthlyStats[] = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
    
    const monthTenders = tenders.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt.getFullYear() === date.getFullYear() && 
             createdAt.getMonth() === date.getMonth();
    });

    months.push({
      month: monthName,
      monthKey,
      count: monthTenders.length,
      won: monthTenders.filter(t => t.status === 'won').length,
      lost: monthTenders.filter(t => t.status === 'lost').length,
      nmck: monthTenders.reduce((sum, t) => sum + (t.nmck || 0), 0),
      contractValue: monthTenders
        .filter(t => t.status === 'won')
        .reduce((sum, t) => sum + (t.contract_price || t.nmck || 0), 0),
    });
  }

  return months;
}

async function getTopManagers(companyId: string, tenders: TenderRow[]): Promise<ManagerStats[]> {
  const supabase = await createRSCClient();
  
  // Group by manager_id
  const managerStats: Record<string, {
    totalTenders: number;
    wonTenders: number;
    lostTenders: number;
    totalNmck: number;
    totalContractValue: number;
  }> = {};

  tenders.forEach(t => {
    if (!t.manager_id) return;
    
    if (!managerStats[t.manager_id]) {
      managerStats[t.manager_id] = {
        totalTenders: 0,
        wonTenders: 0,
        lostTenders: 0,
        totalNmck: 0,
        totalContractValue: 0,
      };
    }

    const stats = managerStats[t.manager_id];
    stats.totalTenders++;
    stats.totalNmck += t.nmck || 0;

    if (t.status === 'won') {
      stats.wonTenders++;
      stats.totalContractValue += t.contract_price || t.nmck || 0;
    } else if (t.status === 'lost') {
      stats.lostTenders++;
    }
  });

  const managerIds = Object.keys(managerStats);
  if (managerIds.length === 0) return [];

  // Fetch manager profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', managerIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return Object.entries(managerStats)
    .map(([id, stats]) => {
      const profile = profileMap.get(id);
      const completed = stats.wonTenders + stats.lostTenders;
      
      return {
        id,
        name: profile?.full_name || 'Неизвестный',
        avatar: profile?.avatar_url || null,
        totalTenders: stats.totalTenders,
        wonTenders: stats.wonTenders,
        lostTenders: stats.lostTenders,
        winRate: completed > 0 ? (stats.wonTenders / completed) * 100 : 0,
        totalNmck: stats.totalNmck,
        totalContractValue: stats.totalContractValue,
      };
    })
    .sort((a, b) => b.wonTenders - a.wonTenders || b.totalContractValue - a.totalContractValue)
    .slice(0, 5);
}

function getRecentTenders(tenders: TenderRow[]): RecentTender[] {
  return tenders.slice(0, 5).map(t => {
    const stage = getStage(t);
    return {
      id: t.id,
      purchaseNumber: t.purchase_number || '—',
      customer: t.customer || 'Неизвестный заказчик',
      subject: t.subject || 'Без названия',
      nmck: t.nmck || 0,
      stage: stage?.name || 'Новый',
      stageColor: stage?.color || '#6b7280',
      deadline: t.submission_deadline,
      manager: null,
      createdAt: t.created_at,
    };
  });
}

function getUpcomingDeadlines(tenders: TenderRow[]): UpcomingDeadline[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return tenders
    .filter(t => {
      if (!t.submission_deadline) return false;
      if (t.status !== 'active') return false;
      const deadline = new Date(t.submission_deadline);
      return deadline >= now;
    })
    .map(t => {
      const stage = getStage(t);
      const deadline = new Date(t.submission_deadline);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: t.id,
        purchaseNumber: t.purchase_number || '—',
        customer: t.customer || 'Неизвестный',
        deadline: t.submission_deadline,
        daysLeft,
        stage: stage?.name || 'Новый',
        stageColor: stage?.color || '#6b7280',
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);
}

async function getTaskSummary(
  companyId: string, 
  canViewAll: boolean = true, 
  employeeId?: string
): Promise<TaskSummary> {
  const supabase = await createRSCClient();

  let query = supabase
    .from('tender_tasks')
    .select('id, status, due_date')
    .eq('company_id', companyId);

  // Если пользователь не может видеть все - фильтруем по assigned_to
  if (!canViewAll && employeeId) {
    query = query.eq('assigned_to', employeeId);
  }

  const { data: tasks, error } = await query;

  if (error || !tasks) {
    return { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
      return new Date(t.due_date) < now;
    }).length,
  };
}

function getEmptyDashboardData(): DashboardData {
  return {
    overview: {
      totalTenders: 0,
      activeTenders: 0,
      wonTenders: 0,
      lostTenders: 0,
      pendingTenders: 0,
      totalNmck: 0,
      totalContractPrice: 0,
      totalSavings: 0,
      winRate: 0,
      avgContractValue: 0,
    },
    byStage: [],
    byType: [],
    monthly: [],
    topManagers: [],
    recentTenders: [],
    upcomingDeadlines: [],
    taskSummary: { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 },
  };
}
