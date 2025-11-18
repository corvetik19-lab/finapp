import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// GET /api/tenders/[id]/tasks - получение задач
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { id: tenderId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем задачи тендера
    const { data: tasks, error } = await supabase
      .from('tender_tasks')
      .select('*')
      .eq('tender_id', tenderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Маппинг приоритетов: normal -> medium для фронтенда
    const mappedTasks = (tasks || []).map(task => ({
      ...task,
      priority: task.priority === 'normal' ? 'medium' : task.priority,
    }));

    return NextResponse.json(mappedTasks);
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenders/[id]/tasks - создание задачи
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { id: tenderId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Current user ID:', user.id);
    console.log('User email:', user.email);

    const body = await request.json();
    console.log('POST /api/tenders/[id]/tasks - Body:', body);
    console.log('Tender ID:', tenderId);
    
    const { title, description, status = 'pending', priority = 'medium', due_time } = body;

    if (!title) {
      console.error('Title is missing');
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Получаем тендер для company_id
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select('company_id')
      .eq('id', tenderId)
      .single();

    if (tenderError) {
      console.error('Error fetching tender:', tenderError);
      return NextResponse.json({ error: `Tender error: ${tenderError.message}` }, { status: 500 });
    }

    if (!tender) {
      console.error('Tender not found:', tenderId);
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    console.log('Tender company_id:', tender.company_id);

    // Проверяем членство пользователя в компании
    const { data: membership, error: membershipError } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', tender.company_id)
      .eq('user_id', user.id)
      .single();

    console.log('User membership:', membership);
    if (membershipError) {
      console.error('Membership error:', membershipError);
    }

    if (!membership) {
      console.error('User is not a member of the company');
      return NextResponse.json({ 
        error: 'You are not a member of this company',
        details: {
          user_id: user.id,
          company_id: tender.company_id
        }
      }, { status: 403 });
    }

    // Маппинг приоритетов: medium -> normal
    const dbPriority = priority === 'medium' ? 'normal' : priority;

    const taskData = {
      company_id: tender.company_id,
      tender_id: tenderId,
      title,
      description,
      status,
      priority: dbPriority,
      due_time: due_time || null,
      created_by: user.id,
    };

    console.log('Creating task with data:', taskData);

    // Создаём задачу
    const { data: task, error } = await supabase
      .from('tender_tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    console.log('Task created successfully:', task);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tenders/[id]/tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
