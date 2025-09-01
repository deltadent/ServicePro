import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  Shield, 
  FileText, 
  Calculator, 
  Globe, 
  Users, 
  Settings 
} from 'lucide-react';
import { CompanyProfileSettings } from './CompanyProfileSettings';
import { ZatcaSettings } from './ZatcaSettings';
import { TaxSettings } from './TaxSettings';
import { TemplateSettings } from './TemplateSettings';
import { RegionalSettings } from './RegionalSettings';
import { UserManagementSettings } from './UserManagementSettings';
import { SystemPreferences } from './SystemPreferences';

export function SettingsLayout() {
  const [activeTab, setActiveTab] = useState('company-profile');

  const settingsTabs = [
    {
      id: 'company-profile',
      label: 'Company Profile',
      icon: Building2,
      description: 'Basic company information and branding'
    },
    {
      id: 'zatca',
      label: 'ZATCA Configuration',
      icon: Shield,
      description: 'Saudi e-invoicing compliance settings'
    },
    {
      id: 'templates',
      label: 'Quote & Invoice Templates',
      icon: FileText,
      description: 'Document templates and formatting'
    },
    {
      id: 'tax',
      label: 'Tax Settings',
      icon: Calculator,
      description: 'VAT rates and tax configuration'
    },
    {
      id: 'regional',
      label: 'Regional Settings',
      icon: Globe,
      description: 'Language, currency, and localization'
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      description: 'User roles and permissions'
    },
    {
      id: 'system',
      label: 'System Preferences',
      icon: Settings,
      description: 'System-wide configuration'
    }
  ];

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company profile, ZATCA compliance, and system preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-7 gap-1 h-auto p-1">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex flex-col items-center gap-2 p-3 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs text-center leading-tight">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        {settingsTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <tab.icon className="h-5 w-5" />
                  <CardTitle>{tab.label}</CardTitle>
                </div>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {tab.id === 'company-profile' && <CompanyProfileSettings />}
                {tab.id === 'zatca' && <ZatcaSettings />}
                {tab.id === 'templates' && <TemplateSettings />}
                {tab.id === 'tax' && <TaxSettings />}
                {tab.id === 'regional' && <RegionalSettings />}
                {tab.id === 'users' && <UserManagementSettings />}
                {tab.id === 'system' && <SystemPreferences />}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default SettingsLayout;
