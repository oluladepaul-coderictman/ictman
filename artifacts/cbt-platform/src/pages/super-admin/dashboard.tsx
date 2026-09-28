import * as React from "react";
import { useListCompanies } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";

export default function SuperAdminDashboard() {
  const { data: companies, isLoading } = useListCompanies();

  if (isLoading) {
    return <div className="animate-pulse flex gap-6">
      <div className="h-32 w-1/3 bg-muted rounded-2xl"></div>
      <div className="h-32 w-1/3 bg-muted rounded-2xl"></div>
    </div>;
  }

  const activeCompanies = companies?.filter(c => c.isActive).length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Platform Overview</h1>
        <p className="text-muted-foreground mt-2">Manage your tenants and platform metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{companies?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Companies</CardTitle>
            <Building2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{activeCompanies}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
