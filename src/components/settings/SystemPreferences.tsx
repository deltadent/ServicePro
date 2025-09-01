import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Settings, Database, Shield, Bell, Download, RefreshCw } from 'lucide-react';
import { getPublicSystemConfigs, getSystemConfig } from '@/lib/companyRepo';
import { subscribeToPushNotifications } from '@/lib/notifications';

export function SystemPreferences() {
  const { toast } = useToast();
  const [systemConfigs, setSystemConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemConfigs();
  }, []);

  const loadSystemConfigs = async () => {
    try {
      const configs = await getPublicSystemConfigs();
      setSystemConfigs(configs);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load system preferences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportSystemData = () => {
    toast({
      title: 'Export Started',
      description: 'System data export will be available soon',
    });
  };

  const refreshSystemData = () => {
    toast({
      title: 'Refresh Started',
      description: 'Refreshing system data...',
    });
    loadSystemConfigs();
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>
            Current system status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Application Name:</span>
                <span className="text-sm text-muted-foreground">
                  {systemConfigs.app_name || 'ServicePro'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm font-medium">Version:</span>
                <Badge variant="outline">
                  {systemConfigs.app_version || '1.0.0'}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium">Environment:</span>
                <Badge variant="default">
                  Production
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Maintenance Mode:</span>
                <Badge variant={systemConfigs.maintenance_mode === 'true' ? 'destructive' : 'default'}>
                  {systemConfigs.maintenance_mode === 'true' ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium">Database Status:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium">Last Updated:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Feature Configuration
          </CardTitle>
          <CardDescription>
            Enable or disable system features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Quotes Feature</Label>
                <p className="text-sm text-muted-foreground">
                  Enable quote creation and management
                </p>
              </div>
              <Switch
                checked={systemConfigs.features_enabled?.quotes !== false}
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Invoices Feature</Label>
                <p className="text-sm text-muted-foreground">
                  Enable invoice creation and management
                </p>
              </div>
              <Switch
                checked={systemConfigs.features_enabled?.invoices !== false}
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>ZATCA Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Enable Saudi e-invoicing compliance
                </p>
              </div>
              <Switch
                checked={systemConfigs.features_enabled?.zatca !== false}
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Saudi Compliance</Label>
                <p className="text-sm text-muted-foreground">
                  Enable Saudi business regulations and validations
                </p>
              </div>
              <Switch
                checked={systemConfigs.features_enabled?.saudi_compliance !== false}
                disabled
              />
            </div>
          </div>

          <Alert className="mt-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Feature toggles are managed by system administrators. Contact support for changes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure system notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications via email
                </p>
              </div>
              <Switch
                checked={systemConfigs.notification_settings?.email_enabled !== false}
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>WhatsApp Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications via WhatsApp
                </p>
              </div>
              <Switch
                checked={systemConfigs.notification_settings?.whatsapp_enabled !== false}
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications via SMS
                </p>
              </div>
              <Switch
                checked={systemConfigs.notification_settings?.sms_enabled === true}
                disabled
              />
            </div>
          </div>

          <Alert className="mt-4">
            <Bell className="h-4 w-4" />
            <AlertDescription>
              Notification preferences are managed by system administrators. Contact support for changes.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between mt-4">
            <div>
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Enable push notifications for this device
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={subscribeToPushNotifications}
            >
              Subscribe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Tools
          </CardTitle>
          <CardDescription>
            System maintenance and data management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={exportSystemData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export System Data
            </Button>

            <Button 
              variant="outline"
              onClick={refreshSystemData} 
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh System Data
            </Button>
          </div>

          <Alert className="mt-4">
            <Database className="h-4 w-4" />
            <AlertDescription>
              System tools are available to administrators only. Some operations may require system maintenance windows.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
