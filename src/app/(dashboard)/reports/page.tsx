'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Package,
  Users,
  Euro,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportData {
  totalEquipment: number;
  availableEquipment: number;
  assignedEquipment: number;
  maintenanceEquipment: number;
  brokenEquipment: number;
  decommissionedEquipment: number;
  totalValue: number;
  equipmentByCategory: Record<string, number>;
  equipmentByStatus: Record<string, number>;
  recentEquipment: Array<{
    id: string;
    name: string;
    serialNumber: string;
    status: string;
    purchaseDate: string;
    purchasePrice: number;
  }>;
  depreciation?: {
    summary: {
      totalEquipment: number;
      totalOriginalValue: number;
      totalCurrentValue: number;
      totalDepreciatedValue: number;
      averageDepreciationRate: number;
      netBookValue: number;
    };
    byAge: Array<{
      ageRange: string;
      depreciationRate: number;
      equipmentCount: number;
      originalValue: number;
      currentValue: number;
      depreciatedValue: number;
    }>;
    byCategory: Array<{
      category: string;
      totalEquipment: number;
      totalOriginalValue: number;
      depreciatedValue: number;
      currentValue: number;
      depreciationRate: number;
    }>;
    equipmentNearingFullDepreciation: Array<{
      id: string;
      name: string;
      serialNumber: string;
      purchaseDate: string;
      purchasePrice: number;
      currentValue: number;
      category: string;
      status: string;
      currentOwner?: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  };
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [reportResponse, depreciationResponse] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/reports/depreciation')
      ]);
      
      const reportData = await reportResponse.json();
      const depreciationData = await depreciationResponse.json();
      
      setReportData({
        ...reportData,
        depreciation: depreciationData
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!reportData) return;

    const summaryData = [
      { Metric: 'Total Equipment', Value: reportData.totalEquipment },
      { Metric: 'Available Equipment', Value: reportData.availableEquipment },
      { Metric: 'Assigned Equipment', Value: reportData.assignedEquipment },
      { Metric: 'In Maintenance', Value: reportData.maintenanceEquipment },
      { Metric: 'Broken Equipment', Value: reportData.brokenEquipment },
      { Metric: 'Decommissioned Equipment', Value: reportData.decommissionedEquipment },
      { Metric: 'Total Value (€)', Value: reportData.totalValue },
    ];

    // Add depreciation summary if available
    if (reportData.depreciation) {
      summaryData.push(
        { Metric: 'Total Depreciated Value (€)', Value: reportData.depreciation.summary.totalDepreciatedValue },
        { Metric: 'Net Book Value (€)', Value: reportData.depreciation.summary.netBookValue },
        { Metric: 'Average Depreciation Rate (%)', Value: (reportData.depreciation.summary.averageDepreciationRate * 100).toFixed(1) }
      );
    }

    const worksheet = XLSX.utils.json_to_sheet(summaryData);

    const categoryData = Object.entries(reportData.equipmentByCategory).map(([category, count]) => ({
      Category: category.replace('_', ' ').toUpperCase(),
      Count: count,
    }));

    const categoryWorksheet = XLSX.utils.json_to_sheet(categoryData);

    const recentEquipmentData = reportData.recentEquipment.map(item => ({
      Name: item.name,
      'Serial Number': item.serialNumber,
      Status: item.status.replace('_', ' ').toUpperCase(),
      'Purchase Date': new Date(item.purchaseDate).toLocaleDateString(),
      'Purchase Price (€)': item.purchasePrice,
    }));

    const equipmentWorksheet = XLSX.utils.json_to_sheet(recentEquipmentData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, categoryWorksheet, 'By Category');
    XLSX.utils.book_append_sheet(workbook, equipmentWorksheet, 'Recent Equipment');

    // Add depreciation worksheets if available
    if (reportData.depreciation) {
      const depreciationByAge = reportData.depreciation.byAge.map(age => ({
        'Age Range': age.ageRange,
        'Equipment Count': age.equipmentCount,
        'Original Value (€)': age.originalValue,
        'Current Value (€)': age.currentValue,
        'Depreciated Value (€)': age.depreciatedValue,
        'Depreciation Rate (%)': (age.depreciationRate * 100).toFixed(1),
      }));

      const depreciationByCategory = reportData.depreciation.byCategory.map(cat => ({
        Category: cat.category.replace('_', ' ').toUpperCase(),
        'Equipment Count': cat.totalEquipment,
        'Original Value (€)': cat.totalOriginalValue,
        'Current Value (€)': cat.currentValue,
        'Depreciated Value (€)': cat.depreciatedValue,
        'Depreciation Rate (%)': (cat.depreciationRate * 100).toFixed(1),
      }));

      const depreciationAgeWorksheet = XLSX.utils.json_to_sheet(depreciationByAge);
      const depreciationCategoryWorksheet = XLSX.utils.json_to_sheet(depreciationByCategory);

      XLSX.utils.book_append_sheet(workbook, depreciationAgeWorksheet, 'Depreciation by Age');
      XLSX.utils.book_append_sheet(workbook, depreciationCategoryWorksheet, 'Depreciation by Category');

      if (reportData.depreciation.equipmentNearingFullDepreciation.length > 0) {
        const nearingDepreciationData = reportData.depreciation.equipmentNearingFullDepreciation.map(item => ({
          Name: item.name,
          Category: item.category.replace('_', ' ').toUpperCase(),
          'Purchase Date': new Date(item.purchaseDate).toLocaleDateString(),
          'Original Value (€)': item.purchasePrice,
          'Current Value (€)': item.currentValue,
          Owner: item.currentOwner ? item.currentOwner.name : 'Unassigned',
        }));

        const nearingDepreciationWorksheet = XLSX.utils.json_to_sheet(nearingDepreciationData);
        XLSX.utils.book_append_sheet(workbook, nearingDepreciationWorksheet, 'Nearing Full Depreciation');
      }
    }

    XLSX.writeFile(workbook, 'inventory-report.xlsx');
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    const canvas = await html2canvas(document.getElementById('report-content')!, {
      scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('inventory-report.pdf');
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    if (format === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      assigned: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      broken: 'bg-red-100 text-red-800',
      decommissioned: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load report data</p>
      </div>
    );
  }

  const availabilityRate = (reportData.availableEquipment / reportData.totalEquipment) * 100;
  const operationalRate = ((reportData.availableEquipment + reportData.assignedEquipment) / reportData.totalEquipment) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Inventory Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of your equipment inventory
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => handleExport('excel')} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div id="report-content" className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalEquipment}</div>
              <p className="text-xs text-muted-foreground">
                {reportData.assignedEquipment} assigned, {reportData.availableEquipment} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{reportData.totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Average: €{(reportData.totalValue / reportData.totalEquipment).toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Availability Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availabilityRate.toFixed(1)}%</div>
              <Progress value={availabilityRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {reportData.maintenanceEquipment + reportData.brokenEquipment}
              </div>
              <p className="text-xs text-muted-foreground">
                {reportData.maintenanceEquipment} maintenance, {reportData.brokenEquipment} broken
              </p>
            </CardContent>
          </Card>

          {reportData.depreciation && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Depreciated Value</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    €{reportData.depreciation.summary.totalDepreciatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(reportData.depreciation.summary.averageDepreciationRate * 100).toFixed(1)}% average rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Book Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    €{reportData.depreciation.summary.netBookValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current value of all assets
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Equipment by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Status Distribution</CardTitle>
            <CardDescription>
              Overview of equipment status and operational metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(reportData.equipmentByStatus).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getStatusColor(status)}`}>
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                    <p className="text-sm font-medium mt-2">
                      {status.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((count / reportData.totalEquipment) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Operational Rate</span>
                  <span className="text-sm text-muted-foreground">{operationalRate.toFixed(1)}%</span>
                </div>
                <Progress value={operationalRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment by Category</CardTitle>
            <CardDescription>
              Distribution of equipment across different categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(reportData.equipmentByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">
                        {category.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} items
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={(count / reportData.totalEquipment) * 100} 
                        className="w-24" 
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {((count / reportData.totalEquipment) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Depreciation by Age */}
        {reportData.depreciation && (
          <Card>
            <CardHeader>
              <CardTitle>Depreciation by Equipment Age</CardTitle>
              <CardDescription>
                Equipment depreciation analysis based on age categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.depreciation.byAge.map((ageGroup) => (
                  <div key={ageGroup.ageRange} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium min-w-[120px]">
                        {ageGroup.ageRange}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ageGroup.equipmentCount} items
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          €{ageGroup.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current Value
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-orange-600">
                          €{ageGroup.depreciatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Depreciated ({(ageGroup.depreciationRate * 100).toFixed(0)}%)
                        </div>
                      </div>
                      <div className="w-20">
                        <Progress value={ageGroup.depreciationRate * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Depreciation by Category */}
        {reportData.depreciation && (
          <Card>
            <CardHeader>
              <CardTitle>Depreciation by Category</CardTitle>
              <CardDescription>
                Depreciation breakdown across equipment categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.depreciation.byCategory
                  .sort((a, b) => b.depreciatedValue - a.depreciatedValue)
                  .map((category) => (
                    <div key={category.category} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">
                          {category.category.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {category.totalEquipment} items
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            €{category.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Current Value
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-orange-600">
                            €{category.depreciatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Depreciated ({(category.depreciationRate * 100).toFixed(1)}%)
                          </div>
                        </div>
                        <div className="w-20">
                          <Progress value={category.depreciationRate * 100} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Equipment Nearing Full Depreciation */}
        {reportData.depreciation && reportData.depreciation.equipmentNearingFullDepreciation.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Equipment Nearing Full Depreciation</CardTitle>
              <CardDescription>
                Equipment older than 4.5 years (90%+ depreciated)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Original Value</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.depreciation.equipmentNearingFullDepreciation.slice(0, 10).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.category.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(item.purchaseDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          €{item.purchasePrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          €{item.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell>
                          {item.currentOwner ? (
                            <div>
                              <div className="text-sm font-medium">{item.currentOwner.name}</div>
                              <div className="text-xs text-muted-foreground">{item.currentOwner.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Equipment */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Equipment</CardTitle>
            <CardDescription>
              Recently added equipment items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.recentEquipment.slice(0, 10).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.serialNumber}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(item.purchaseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        €{item.purchasePrice.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}