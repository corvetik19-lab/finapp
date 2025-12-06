'use client';

import Link from 'next/link';
import { UserProfile } from '@/lib/auth/types';
import { Organization } from '@/lib/organizations/types';
import { OrganizationOverview } from './organization-overview';
import { OrganizationModes } from './organization-modes';
import { OrganizationEmployees } from './organization-employees';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Target, Users, ArrowLeft } from 'lucide-react';

interface OrganizationDetailsProps {
    organization: Organization;
    profile: UserProfile;
}

export function OrganizationDetails({ organization, profile }: OrganizationDetailsProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{organization.name}</h1>
                    <p className="text-muted-foreground">Управление организацией</p>
                </div>
                <Button variant="ghost" asChild>
                    <Link href="/admin/settings/organization"><ArrowLeft className="h-4 w-4 mr-2" />Назад к списку</Link>
                </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-2" />Обзор</TabsTrigger>
                    <TabsTrigger value="modes"><Target className="h-4 w-4 mr-2" />Режимы</TabsTrigger>
                    <TabsTrigger value="employees"><Users className="h-4 w-4 mr-2" />Сотрудники</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6"><OrganizationOverview organization={organization} /></TabsContent>
                <TabsContent value="modes" className="mt-6"><OrganizationModes organization={organization} profile={profile} /></TabsContent>
                <TabsContent value="employees" className="mt-6"><OrganizationEmployees organization={organization} profile={profile} /></TabsContent>
            </Tabs>
        </div>
    );
}
