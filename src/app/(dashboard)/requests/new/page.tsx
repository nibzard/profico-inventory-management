// ABOUTME: New equipment request page for users to submit equipment requests
// ABOUTME: Includes form validation and submission with justification requirements

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EquipmentRequestForm } from "@/components/requests/equipment-request-form";

export default async function NewRequestPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">New Equipment Request</h1>
          <p className="text-gray-600 mt-2">
            Submit a request for new equipment or reassignment of existing
            equipment. All requests require justification and will go through
            the approval process.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Please provide detailed information about your equipment needs.
              This will help speed up the approval process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentRequestForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Submit Request</p>
                  <p className="text-sm text-gray-600">
                    Complete and submit your request form
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Team Lead Review</p>
                  <p className="text-sm text-gray-600">
                    Your team lead will review and approve/reject
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Admin Approval</p>
                  <p className="text-sm text-gray-600">
                    Final approval by system administrator
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <p className="font-medium">Equipment Assignment</p>
                  <p className="text-sm text-gray-600">
                    Equipment is ordered/assigned and delivered
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
