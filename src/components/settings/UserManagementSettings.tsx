import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ModernButton } from '@/components/ui/modern-button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Shield, Settings } from 'lucide-react';

export function UserManagementSettings() {
  return (
    <div className="space-y-6">
      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                  A
                </div>
                <div>
                  <p className="font-medium text-sm">Admin User</p>
                  <p className="text-xs text-muted-foreground">admin@servicepro.sa</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Administrator</Badge>
                <ModernButton variant="ghost" size="sm">
                  <Settings className="h-3 w-3" />
                </ModernButton>
              </div>
            </div>

            <div className="flex justify-center py-6 text-muted-foreground">
              <div className="text-center">
                <UserPlus className="mx-auto h-12 w-12 mb-4" />
                <p className="text-sm font-medium">User Management</p>
                <p className="text-xs">User management features will be available in future updates</p>
                <ModernButton variant="outline" size="sm" className="mt-3" disabled>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Invite User
                </ModernButton>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles and Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Roles and Permissions
          </CardTitle>
          <CardDescription>
            Available user roles and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Administrator</p>
                <p className="text-xs text-muted-foreground">Full system access and management</p>
              </div>
              <Badge variant="default">Full Access</Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm text-muted-foreground">Manager</p>
                <p className="text-xs text-muted-foreground">Customer and quote management</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm text-muted-foreground">Employee</p>
                <p className="text-xs text-muted-foreground">Basic customer and job access</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
