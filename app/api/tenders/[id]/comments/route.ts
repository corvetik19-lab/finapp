import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Получаем комментарии с вложениями и родительскими комментариями
    const { data: comments, error } = await supabase
      .from('tender_comments')
      .select(`
        *,
        attachments:tender_comment_attachments(*),
        parent_comment:tender_comments!parent_comment_id(id, content, author_id)
      `)
      .eq('tender_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tender comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tender comments' },
        { status: 500 }
      );
    }

    // Получаем уникальные author_id из комментариев и родительских комментариев
    const authorIds = new Set<string>();
    comments?.forEach(comment => {
      if (comment.author_id) authorIds.add(comment.author_id);
      if (comment.parent_comment?.author_id) authorIds.add(comment.parent_comment.author_id);
    });

    // Загружаем данные авторов
    const { data: authors, error: authorsError } = await supabase
      .from('employees')
      .select('user_id, full_name')
      .in('user_id', Array.from(authorIds));

    if (authorsError) {
      console.error('Error fetching authors:', authorsError);
    }

    // Создаем map для быстрого доступа
    const authorsMap = new Map(
      authors?.map(a => [a.user_id, { full_name: a.full_name }]) || []
    );

    // Добавляем данные авторов к комментариям
    const commentsWithAuthors = comments?.map(comment => ({
      ...comment,
      author: authorsMap.get(comment.author_id),
      parent_comment: comment.parent_comment ? {
        ...comment.parent_comment,
        author: authorsMap.get(comment.parent_comment.author_id)
      } : null
    }));

    return NextResponse.json({
      data: commentsWithAuthors,
      count: commentsWithAuthors?.length || 0,
      currentUserId: user.id, // Возвращаем ID текущего пользователя
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: tenderId } = await params;
    const body = await request.json();
    const { content, comment_type = 'general', stage_id, stage_name, parent_comment_id } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Получаем company_id из тендера
    const { data: tender } = await supabase
      .from('tenders')
      .select('company_id')
      .eq('id', tenderId)
      .single();

    if (!tender) {
      return NextResponse.json(
        { error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Создаем комментарий
    const { data: comment, error } = await supabase
      .from('tender_comments')
      .insert({
        tender_id: tenderId,
        author_id: user.id,
        company_id: tender.company_id,
        content: content.trim(),
        comment_type,
        stage_id,
        stage_name,
        parent_comment_id: parent_comment_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tender comment:', error);
      return NextResponse.json(
        { error: 'Failed to create tender comment', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: comment,
      message: 'Comment created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/tenders/[id]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
