/**
 * Knowledge Graph Builder для KAG Lite
 * Строит граф отношений между транзакциями
 */

import { createRSCClient } from "@/lib/supabase/helpers";

export interface GraphRelation {
  entity_type: string;
  entity_id: string;
  related_type: string;
  related_id: string;
  relation_type: string;
  strength: number;
  metadata?: Record<string, unknown>;
}

/**
 * Строит граф знаний для транзакций пользователя
 */
export async function buildTransactionGraph(userId: string): Promise<number> {
  const supabase = await createRSCClient();
  
  // Получаем транзакции пользователя за последние 3 месяца
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, occurred_at, category_id, account_id, amount_minor, note, direction')
    .eq('user_id', userId)
    .gte('occurred_at', threeMonthsAgo.toISOString())
    .order('occurred_at', { ascending: true });

  if (error || !transactions) {
    console.error('Error fetching transactions:', error);
    return 0;
  }

  const relations: GraphRelation[] = [];

  // 1. Связи: транзакция → категория
  for (const txn of transactions) {
    if (txn.category_id) {
      relations.push({
        entity_type: 'transaction',
        entity_id: txn.id,
        related_type: 'category',
        related_id: txn.category_id,
        relation_type: 'belongs_to',
        strength: 1.0,
      });
    }

    // 2. Связи: транзакция → счет
    if (txn.account_id) {
      relations.push({
        entity_type: 'transaction',
        entity_id: txn.id,
        related_type: 'account',
        related_id: txn.account_id,
        relation_type: 'from_account',
        strength: 1.0,
      });
    }
  }

  // 3. Последовательные транзакции (в течение 24 часов)
  for (let i = 0; i < transactions.length - 1; i++) {
    const current = transactions[i];
    const next = transactions[i + 1];
    
    const timeDiff = new Date(next.occurred_at).getTime() - new Date(current.occurred_at).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff <= 24) {
      // Чем ближе по времени, тем сильнее связь
      const strength = Math.max(0.3, 1 - (hoursDiff / 24));
      
      relations.push({
        entity_type: 'transaction',
        entity_id: current.id,
        related_type: 'transaction',
        related_id: next.id,
        relation_type: 'followed_by',
        strength,
        metadata: {
          hours_diff: hoursDiff.toFixed(2),
          same_day: hoursDiff <= 24,
        },
      });
    }
  }

  // 4. Транзакции в тот же день с той же категорией
  const transactionsByDay = new Map<string, typeof transactions>();
  
  for (const txn of transactions) {
    const day = new Date(txn.occurred_at).toISOString().split('T')[0];
    if (!transactionsByDay.has(day)) {
      transactionsByDay.set(day, []);
    }
    transactionsByDay.get(day)!.push(txn);
  }

  for (const [day, dayTxns] of transactionsByDay) {
    for (let i = 0; i < dayTxns.length; i++) {
      for (let j = i + 1; j < dayTxns.length; j++) {
        const txn1 = dayTxns[i];
        const txn2 = dayTxns[j];
        
        // Если в один день и та же категория - сильная связь
        if (txn1.category_id && txn1.category_id === txn2.category_id) {
          relations.push({
            entity_type: 'transaction',
            entity_id: txn1.id,
            related_type: 'transaction',
            related_id: txn2.id,
            relation_type: 'same_day_same_category',
            strength: 0.8,
            metadata: { day },
          });
        } else {
          // Просто в один день
          relations.push({
            entity_type: 'transaction',
            entity_id: txn1.id,
            related_type: 'transaction',
            related_id: txn2.id,
            relation_type: 'same_day',
            strength: 0.5,
            metadata: { day },
          });
        }
      }
    }
  }

  // 5. Сохраняем все связи в БД
  if (relations.length > 0) {
    // Удаляем старые связи пользователя
    await supabase
      .from('knowledge_graph')
      .delete()
      .eq('user_id', userId);

    // Вставляем новые связи батчами по 100
    const batchSize = 100;
    for (let i = 0; i < relations.length; i += batchSize) {
      const batch = relations.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('knowledge_graph')
        .insert(
          batch.map(r => ({
            user_id: userId,
            ...r,
          }))
        );

      if (insertError) {
        console.error('Error inserting graph relations:', insertError);
      }
    }
  }

  return relations.length;
}

/**
 * Анализирует паттерны трат пользователя
 */
export async function analyzeSpendingPatterns(userId: string) {
  const supabase = await createRSCClient();

  // 1. Используем функцию из миграции для поиска паттернов
  const { data: patterns, error } = await supabase.rpc('find_transaction_patterns', {
    p_user_id: userId,
    p_min_occurrences: 2,
  });

  if (error) {
    console.error('Error finding patterns:', error);
    return { patterns: [], insights: [] };
  }

  // 2. Получаем часто встречающиеся последовательности категорий
  const { data: categorySequences } = await supabase
    .from('knowledge_graph')
    .select('*')
    .eq('user_id', userId)
    .eq('relation_type', 'followed_by')
    .gte('strength', 0.7)
    .order('strength', { ascending: false })
    .limit(10);

  // 3. Формируем инсайты
  const insights = [];

  if (patterns && patterns.length > 0) {
    for (const pattern of patterns) {
      if (pattern.pattern_description === 'followed_by' && pattern.occurrences >= 3) {
        insights.push({
          type: 'sequential_pattern',
          title: 'Последовательные траты',
          description: `Обнаружено ${pattern.occurrences} случаев последовательных трат в течение 24 часов`,
          strength: pattern.avg_strength,
        });
      }
      
      if (pattern.pattern_description === 'same_day' && pattern.occurrences >= 5) {
        insights.push({
          type: 'same_day_pattern',
          title: 'Множественные траты в день',
          description: `${pattern.occurrences} дней с несколькими тратами`,
          strength: pattern.avg_strength,
        });
      }
    }
  }

  return {
    patterns: patterns || [],
    sequences: categorySequences || [],
    insights,
  };
}

/**
 * Получает рекомендации на основе графа знаний
 */
export async function getGraphBasedRecommendations(userId: string) {
  const supabase = await createRSCClient();

  const recommendations = [];

  // 1. Анализируем паттерны
  const { patterns, insights } = await analyzeSpendingPatterns(userId);

  // 2. Ищем частые последовательности
  const { data: frequentSequences } = await supabase
    .from('knowledge_graph')
    .select('entity_id, related_id, relation_type, strength, metadata')
    .eq('user_id', userId)
    .eq('relation_type', 'followed_by')
    .gte('strength', 0.8)
    .limit(5);

  if (frequentSequences && frequentSequences.length > 0) {
    recommendations.push({
      type: 'pattern_alert',
      priority: 'medium',
      title: 'Обнаружены паттерны трат',
      description: `Вы часто делаете покупки последовательно. Возможно, стоит планировать траты заранее.`,
      action: 'Создать бюджет',
    });
  }

  // 3. Проверяем траты в один день
  const { count: sameDayCount } = await supabase
    .from('knowledge_graph')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('relation_type', 'same_day');

  if (sameDayCount && sameDayCount > 20) {
    recommendations.push({
      type: 'spending_habit',
      priority: 'low',
      title: 'Множественные траты в день',
      description: 'Вы часто делаете несколько покупок в один день. Попробуйте объединять покупки.',
      action: 'Создать список покупок',
    });
  }

  return {
    recommendations,
    insights,
    patterns,
  };
}
