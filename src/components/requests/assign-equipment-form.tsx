// ABOUTME: Equipment assignment component for admins to assign equipment to approved requests
// ABOUTME: Shows equipment selection and assignment functionality for approved requests

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, Package, User, Calendar, AlertTriangle } from "lucide-react";
import type { Equipment, EquipmentRequest } from "@prisma/client";

interface EquipmentWithDetails extends Equipment {
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface RequestWithDetails extends EquipmentRequest {
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  equipment?: EquipmentWithDetails | null;
}

interface AssignEquipmentFormProps {
  request: RequestWithDetails;
  availableEquipment: EquipmentWithDetails[];
}

export function AssignEquipmentForm({ request, availableEquipment }: AssignEquipmentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEquipment, setFilteredEquipment] = useState(availableEquipment);

  useEffect(() => {
    if (searchTerm) {
      const filtered = availableEquipment.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEquipment(filtered);
    } else {
      setFilteredEquipment(availableEquipment);
    }
  }, [searchTerm, availableEquipment]);

  const handleAssignEquipment = async () => {
    if (!selectedEquipmentId) {
      toast.error("Please select equipment to assign");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/requests/${request.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipmentId: selectedEquipmentId,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign equipment");
      }

      const result = await response.json();
      toast.success("Equipment assigned successfully!");
      router.push(`/requests/${request.id}`);
      router.refresh();
    } catch (error) {
      console.error("Equipment assignment error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to assign equipment"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEquipment = filteredEquipment.find(item => item.id === selectedEquipmentId);

  return (
    <div className="space-y-6">
      {/* Request Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Approved request waiting for equipment assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Equipment Type</p>
              <p className="font-medium">{request.equipmentType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Category</p>
              <p className="font-medium capitalize">{request.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Priority</p>
              <Badge variant={
                request.priority === 'urgent' ? 'destructive' :
                request.priority === 'high' ? 'default' :
                request.priority === 'medium' ? 'secondary' : 'outline'
              }>
                {request.priority.toUpperCase()}
              </Badge>
            </div>
            {request.budget && (
              <div>
                <p className="text-sm font-medium text-gray-600">Budget</p>
                <p className="font-medium">€{request.budget.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Justification</p>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              {request.justification}
            </div>
          </div>

          {request.specificRequirements && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Specific Requirements</p>
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                {request.specificRequirements}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 pt-3 border-t">
            <Avatar className="h-8 w-8">
              <AvatarImage src={request.requester.image || ""} />
              <AvatarFallback className="text-xs">
                {request.requester.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{request.requester.name}</p>
              <p className="text-xs text-gray-600">{request.requester.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Select Equipment to Assign</span>
          </CardTitle>
          <CardDescription>
            Choose available equipment to assign to this request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search equipment by name, serial number, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Equipment List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEquipment.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No available equipment found</p>
                <p className="text-sm">Try adjusting your search or check back later</p>
              </div>
            ) : (
              filteredEquipment.map((equipment) => (
                <div
                  key={equipment.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedEquipmentId === equipment.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                  onClick={() => setSelectedEquipmentId(equipment.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{equipment.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {equipment.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {equipment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Serial:</span> {equipment.serialNumber}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {equipment.location || 'Not specified'}
                        </div>
                        {equipment.purchaseDate && (
                          <div>
                            <span className="font-medium">Purchased:</span> {
                              new Date(equipment.purchaseDate).toLocaleDateString()
                            }
                          </div>
                        )}
                        {equipment.purchasePrice && (
                          <div>
                            <span className="font-medium">Value:</span> €{
                              equipment.purchasePrice.toLocaleString()
                            }
                          </div>
                        )}
                      </div>

                      {equipment.specifications && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Specs:</span> {equipment.specifications}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          selectedEquipmentId === equipment.id
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedEquipmentId === equipment.id && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Equipment Preview */}
          {selectedEquipment && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Selected Equipment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-700">Name:</span> {selectedEquipment.name}
                </div>
                <div>
                  <span className="font-medium text-green-700">Serial:</span> {selectedEquipment.serialNumber}
                </div>
                <div>
                  <span className="font-medium text-green-700">Category:</span> {selectedEquipment.category}
                </div>
                <div>
                  <span className="font-medium text-green-700">Location:</span> {selectedEquipment.location || 'Not specified'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Notes (Optional)</CardTitle>
          <CardDescription>
            Add any notes about this equipment assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Special instructions, condition notes, or any additional information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Assignment Confirmation</h4>
            <p className="text-sm text-yellow-700 mt-1">
              This action will assign the selected equipment to {request.requester.name} and 
              mark the request as fulfilled. The equipment status will change to &quot;assigned&quot; 
              and the user will be notified via email.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleAssignEquipment}
          disabled={!selectedEquipmentId || isLoading}
        >
          {isLoading ? "Assigning..." : "Assign Equipment"}
        </Button>
      </div>
    </div>
  );
}