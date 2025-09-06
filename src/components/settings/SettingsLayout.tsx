import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle, ModernCardDescription } from '@/components/ui/modern-card';
import { MotionDiv, AnimatedPage } from '@/components/ui/motion';
import { PageHeader, ContentArea } from '@/components/layout/AppShell';
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
    <AnimatedPage>
      <PageHeader 
        title="Settings" 
        description="Manage your company profile, ZATCA compliance, and system preferences"
        icon={<Settings className="w-6 h-6" />}
      />
      
      <ContentArea>
        <MotionDiv variant="fadeInUp">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-7 gap-2 h-auto p-2 bg-muted/30 backdrop-blur-sm border">
                {settingsTabs.map((tab, index) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="flex flex-col items-center gap-2 p-4 h-auto rounded-lg transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-soft data-[state=active]:scale-105"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs text-center leading-tight font-medium">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            
            {settingsTabs.map((tab, index) => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                <MotionDiv variant="scaleIn" delay={index * 0.1}>
                  <ModernCard variant="floating" size="lg">
                    <ModernCardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <tab.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <ModernCardTitle className="text-xl">{tab.label}</ModernCardTitle>
                          <ModernCardDescription className="mt-1">{tab.description}</ModernCardDescription>
                        </div>
                      </div>
                    </ModernCardHeader>
                    <ModernCardContent>
                      {tab.id === 'company-profile' && <CompanyProfileSettings />}
                      {tab.id === 'zatca' && <ZatcaSettings />}
                      {tab.id === 'templates' && <TemplateSettings />}
                      {tab.id === 'tax' && <TaxSettings />}
                      {tab.id === 'regional' && <RegionalSettings />}
                      {tab.id === 'users' && <UserManagementSettings />}
                      {tab.id === 'system' && <SystemPreferences />}
                    </ModernCardContent>
                  </ModernCard>
                </MotionDiv>
              </TabsContent>
            ))}
          </Tabs>
        </MotionDiv>
      </ContentArea>
    </AnimatedPage>
  );
}

export default SettingsLayout;
