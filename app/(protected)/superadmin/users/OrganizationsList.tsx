"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Briefcase, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  global_role: string;
  created_at: string;
  last_sign_in_at: string | null;
  memberships: Array<{
    role: string;
    company: string;
    organization: string;
    organization_id: string;
    department?: string;
  }>;
}

interface OrganizationData {
  org: { id: string; name: string; owner_id?: string };
  users: UserData[];
}

interface OrganizationsListProps {
  organizations: Array<[string, OrganizationData]>;
  allUsers: UserData[];
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrganizationsList({ organizations, allUsers }: OrganizationsListProps) {
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set(organizations.map(([id]) => id)));

  const toggleOrg = (orgId: string) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedOrgs(new Set(organizations.map(([id]) => id)));
  };

  const collapseAll = () => {
    setExpandedOrgs(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Кнопки развернуть/свернуть все */}
      <div className="flex gap-2 justify-end">
        <button 
          onClick={expandAll}
          className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          Развернуть все
        </button>
        <button 
          onClick={collapseAll}
          className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          Свернуть все
        </button>
      </div>

      {organizations.map(([orgId, { org, users: orgUsers }]) => {
        const isExpanded = expandedOrgs.has(orgId);
        const isSuperAdminOrg = org.owner_id && allUsers.find(u => u.id === org.owner_id)?.global_role === 'super_admin';
        
        return (
          <Card key={orgId} className={cn(
            "overflow-hidden transition-all",
            isSuperAdminOrg ? "ring-2 ring-purple-500 ring-offset-2" : ""
          )}>
            <CardHeader 
              className={cn(
                "pb-3 cursor-pointer select-none transition-colors hover:bg-gray-50",
                isSuperAdminOrg ? "bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200 hover:from-purple-100 hover:to-blue-100" : ""
              )}
              onClick={() => toggleOrg(orgId)}
            >
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    isSuperAdminOrg
                      ? "bg-gradient-to-br from-purple-600 to-blue-600"
                      : "bg-gradient-to-br from-blue-500 to-indigo-600"
                  )}>
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                </div>
                <span>{org.name}</span>
                <Badge variant="secondary" className="ml-auto">{orgUsers.length} чел.</Badge>
                {isSuperAdminOrg && (
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                    <Shield className="h-3 w-3 mr-1" />
                    Владелец: Супер-админ
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Пользователь</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Роль</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Отдел</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Последний вход</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgUsers.map((user) => {
                        const membership = user.memberships.find(m => m.organization_id === orgId);
                        return (
                          <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm",
                                  user.global_role === 'super_admin' 
                                    ? 'bg-gradient-to-br from-purple-600 to-blue-600'
                                    : user.global_role === 'admin'
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                )}>
                                  {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <span className="font-medium text-gray-900 text-sm">{user.full_name || 'Без имени'}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-600 text-sm">{user.email}</td>
                            <td className="py-2 px-3">
                              <Badge variant={
                                user.global_role === 'super_admin' ? 'default' :
                                user.global_role === 'admin' ? 'secondary' : 'outline'
                              } className={cn(
                                "text-xs",
                                user.global_role === 'super_admin' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : ''
                              )}>
                                {user.global_role === 'super_admin' ? 'Супер-админ' :
                                 membership?.role && membership.role !== 'member' && membership.role !== 'admin' && membership.role !== 'owner' 
                                   ? membership.role 
                                   : user.global_role === 'admin' ? 'Админ' : 'Пользователь'}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              {membership?.department ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Briefcase className="h-3 w-3 text-gray-400" />
                                  <span className="text-gray-600">{membership.department}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-sm">
                              {user.last_sign_in_at 
                                ? <span className="text-gray-600">{formatDateTime(user.last_sign_in_at)}</span>
                                : <span className="text-gray-400">Никогда</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
