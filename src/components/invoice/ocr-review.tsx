'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Edit, Save, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EquipmentItem {
  name: string;
  serialNumber?: string;
  specifications?: string;
  quantity?: number;
  unitPrice?: number;
  category?: string;
}

interface SubscriptionItem {
  softwareName: string;
  licenseType?: string;
  subscriptionPeriod?: string;
  seats?: number;
  unitPrice?: number;
  totalPrice?: number;
  renewalDate?: string;
}

interface OCRResult {
  vendor?: string;
  invoiceNumber?: string;
  date?: string;
  amount?: number;
  currency?: string;
  vatAmount?: number;
  invoiceType?: 'equipment' | 'subscription' | 'mixed';
  equipment?: EquipmentItem[];
  subscriptions?: SubscriptionItem[];
  purchaseMethod?: 'ProfiCo' | 'ZOPI' | 'Leasing' | 'Off-the-shelf';
  depreciationPeriod?: number;
  confidence?: number;
  rawText?: string;
  validationErrors?: string[];
  extractionDetails?: {
    processingTime: number;
    modelUsed: string;
    tokensUsed?: number;
  };
}

interface OCRReviewProps {
  ocrData: OCRResult;
  onSave?: (data: OCRResult, createEquipment: boolean, createSubscriptions: boolean, saveAsDraft: boolean) => void;
  onCancel?: () => void;
}

export function OCRReview({ ocrData, onSave, onCancel }: OCRReviewProps) {
  const [editedData, setEditedData] = useState<OCRResult>({ ...ocrData });
  const [isEditing, setIsEditing] = useState(false);
  const [createEquipment, setCreateEquipment] = useState(true);
  const [createSubscriptions, setCreateSubscriptions] = useState(true);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (field: keyof OCRResult, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateEquipment = (index: number, field: keyof EquipmentItem, value: any) => {
    setEditedData(prev => ({
      ...prev,
      equipment: prev.equipment?.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateSubscription = (index: number, field: keyof SubscriptionItem, value: any) => {
    setEditedData(prev => ({
      ...prev,
      subscriptions: prev.subscriptions?.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addEquipment = () => {
    setEditedData(prev => ({
      ...prev,
      equipment: [
        ...(prev.equipment || []),
        { name: '', quantity: 1 }
      ]
    }));
  };

  const removeEquipment = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      equipment: prev.equipment?.filter((_, i) => i !== index)
    }));
  };

  const addSubscription = () => {
    setEditedData(prev => ({
      ...prev,
      subscriptions: [
        ...(prev.subscriptions || []),
        { softwareName: '', seats: 1 }
      ]
    }));
  };

  const removeSubscription = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      subscriptions: prev.subscriptions?.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(editedData, createEquipment, createSubscriptions, saveAsDraft);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = () => {
    const hasVendor = editedData.vendor;
    const hasAmount = editedData.amount;
    const hasEquipment = editedData.equipment?.length && editedData.equipment.some(item => item.name);
    const hasSubscriptions = editedData.subscriptions?.length && editedData.subscriptions.some(item => item.softwareName);
    
    return hasVendor && hasAmount && (hasEquipment || hasSubscriptions);
  };

  const confidenceLevel = editedData.confidence || 0;
  const confidenceColor = confidenceLevel > 0.8 ? 'text-green-600' : 
                         confidenceLevel > 0.6 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Review Extracted Invoice Data</CardTitle>
              <CardDescription>
                Review and edit the extracted information before saving
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={confidenceColor}>
                {Math.round(confidenceLevel * 100)}% confidence
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                {isEditing ? 'View Mode' : 'Edit Mode'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Validation Errors */}
      {editedData.validationErrors && editedData.validationErrors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <strong>Validation Issues:</strong>
              {editedData.validationErrors.map((error, index) => (
                <div key={index} className="text-sm">• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="invoice" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoice">Invoice Details</TabsTrigger>
          <TabsTrigger value="equipment">
            Equipment Items ({editedData.equipment?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            Subscriptions ({editedData.subscriptions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="raw">Raw Text</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor *</Label>
                  {isEditing ? (
                    <Input
                      id="vendor"
                      value={editedData.vendor || ''}
                      onChange={(e) => updateField('vendor', e.target.value)}
                      placeholder="Enter vendor name"
                    />
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.vendor || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  {isEditing ? (
                    <Input
                      id="invoiceNumber"
                      value={editedData.invoiceNumber || ''}
                      onChange={(e) => updateField('invoiceNumber', e.target.value)}
                      placeholder="Enter invoice number"
                    />
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.invoiceNumber || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Invoice Date</Label>
                  {isEditing ? (
                    <Input
                      id="date"
                      type="date"
                      value={editedData.date || ''}
                      onChange={(e) => updateField('date', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.date || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (€) *</Label>
                  {isEditing ? (
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={editedData.amount || ''}
                      onChange={(e) => updateField('amount', parseFloat(e.target.value))}
                      placeholder="0.00"
                    />
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.amount ? `€${editedData.amount.toFixed(2)}` : 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseMethod">Purchase Method</Label>
                  {isEditing ? (
                    <Select
                      value={editedData.purchaseMethod || ''}
                      onValueChange={(value) => updateField('purchaseMethod', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select purchase method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ProfiCo">ProfiCo</SelectItem>
                        <SelectItem value="ZOPI">ZOPI</SelectItem>
                        <SelectItem value="Leasing">Leasing</SelectItem>
                        <SelectItem value="Off-the-shelf">Off-the-shelf</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.purchaseMethod || 'Off-the-shelf'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  {isEditing ? (
                    <Input
                      id="currency"
                      value={editedData.currency || 'EUR'}
                      onChange={(e) => updateField('currency', e.target.value)}
                      placeholder="EUR"
                    />
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.currency || 'EUR'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatAmount">VAT Amount</Label>
                  {isEditing ? (
                    <Input
                      id="vatAmount"
                      type="number"
                      step="0.01"
                      value={editedData.vatAmount || ''}
                      onChange={(e) => updateField('vatAmount', parseFloat(e.target.value))}
                      placeholder="0.00"
                    />
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.vatAmount ? `${editedData.currency || '€'}${editedData.vatAmount.toFixed(2)}` : 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceType">Invoice Type</Label>
                  {isEditing ? (
                    <Select
                      value={editedData.invoiceType || 'equipment'}
                      onValueChange={(value) => updateField('invoiceType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select invoice type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.invoiceType || 'equipment'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depreciationPeriod">Depreciation Period (months)</Label>
                  {isEditing ? (
                    <Input
                      id="depreciationPeriod"
                      type="number"
                      value={editedData.depreciationPeriod || 24}
                      onChange={(e) => updateField('depreciationPeriod', parseInt(e.target.value))}
                    />
                  ) : (
                    <div className="p-2 border rounded bg-gray-50">
                      {editedData.depreciationPeriod || 24} months
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Equipment Items</CardTitle>
                {isEditing && (
                  <Button onClick={addEquipment} size="sm">
                    Add Equipment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editedData.equipment?.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Equipment {index + 1}</h4>
                      {isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeEquipment(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        {isEditing ? (
                          <Input
                            value={item.name}
                            onChange={(e) => updateEquipment(index, 'name', e.target.value)}
                            placeholder="Equipment name"
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.name || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Serial Number</Label>
                        {isEditing ? (
                          <Input
                            value={item.serialNumber || ''}
                            onChange={(e) => updateEquipment(index, 'serialNumber', e.target.value)}
                            placeholder="Serial number"
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.serialNumber || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.quantity || 1}
                            onChange={(e) => updateEquipment(index, 'quantity', parseInt(e.target.value))}
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.quantity || 1}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Unit Price</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateEquipment(index, 'unitPrice', parseFloat(e.target.value))}
                            placeholder="0.00"
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.unitPrice ? `${editedData.currency || '€'}${item.unitPrice.toFixed(2)}` : 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Category</Label>
                        {isEditing ? (
                          <Input
                            value={item.category || ''}
                            onChange={(e) => updateEquipment(index, 'category', e.target.value)}
                            placeholder="laptop, desktop, monitor, etc."
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.category || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label>Specifications</Label>
                        {isEditing ? (
                          <Textarea
                            value={item.specifications || ''}
                            onChange={(e) => updateEquipment(index, 'specifications', e.target.value)}
                            placeholder="Technical specifications"
                            rows={2}
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.specifications || 'Not provided'}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                
                {(!editedData.equipment || editedData.equipment.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No equipment items found. Click "Add Equipment" to add items manually.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Subscription Items</CardTitle>
                {isEditing && (
                  <Button onClick={addSubscription} size="sm">
                    Add Subscription
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editedData.subscriptions?.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Subscription {index + 1}</h4>
                      {isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSubscription(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Software Name *</Label>
                        {isEditing ? (
                          <Input
                            value={item.softwareName}
                            onChange={(e) => updateSubscription(index, 'softwareName', e.target.value)}
                            placeholder="Software/Service name"
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.softwareName || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>License Type</Label>
                        {isEditing ? (
                          <Input
                            value={item.licenseType || ''}
                            onChange={(e) => updateSubscription(index, 'licenseType', e.target.value)}
                            placeholder="Standard, Premium, Enterprise"
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.licenseType || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Subscription Period</Label>
                        {isEditing ? (
                          <Select
                            value={item.subscriptionPeriod || 'monthly'}
                            onValueChange={(value) => updateSubscription(index, 'subscriptionPeriod', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.subscriptionPeriod || 'Monthly'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Seats/Users</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.seats || 1}
                            onChange={(e) => updateSubscription(index, 'seats', parseInt(e.target.value))}
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.seats || 1}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Unit Price</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateSubscription(index, 'unitPrice', parseFloat(e.target.value))}
                            placeholder="0.00"
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.unitPrice ? `${editedData.currency || '€'}${item.unitPrice.toFixed(2)}` : 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Total Price</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={item.totalPrice || ''}
                            onChange={(e) => updateSubscription(index, 'totalPrice', parseFloat(e.target.value))}
                            placeholder="0.00"
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.totalPrice ? `${editedData.currency || '€'}${item.totalPrice.toFixed(2)}` : 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label>Renewal Date</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={item.renewalDate || ''}
                            onChange={(e) => updateSubscription(index, 'renewalDate', e.target.value)}
                          />
                        ) : (
                          <div className="p-2 border rounded bg-gray-50">
                            {item.renewalDate || 'Not provided'}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                
                {(!editedData.subscriptions || editedData.subscriptions.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No subscription items found. Click "Add Subscription" to add items manually.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Raw Extracted Text</CardTitle>
              <CardDescription>
                The raw text extracted from the PDF invoice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedData.rawText || ''}
                readOnly
                rows={10}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Options */}
      <Card>
        <CardHeader>
          <CardTitle>Save Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="createEquipment"
              checked={createEquipment}
              onChange={(e) => setCreateEquipment(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="createEquipment">
              Create equipment records ({editedData.equipment?.length || 0} items)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="createSubscriptions"
              checked={createSubscriptions}
              onChange={(e) => setCreateSubscriptions(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="createSubscriptions">
              Create subscription records ({editedData.subscriptions?.length || 0} items)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="saveAsDraft"
              checked={saveAsDraft}
              onChange={(e) => setSaveAsDraft(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="saveAsDraft">Save as draft (skip validation)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || (!isValid() && !saveAsDraft)}
        >
          {isSaving ? 'Saving...' : <Save className="h-4 w-4 mr-2" />}
          {saveAsDraft ? 'Save Draft' : 'Save & Process'}
        </Button>
      </div>
    </div>
  );
}