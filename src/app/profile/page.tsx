// ABOUTME: User profile page for viewing and editing personal information
// ABOUTME: Allows users to update their profile details and view account information

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/profile/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch complete user data including team information
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      team: true,
      ownedEquipment: {
        where: { status: "assigned" },
        select: { id: true, name: true, serialNumber: true, category: true },
      },
      equipmentRequests: {
        where: { status: { in: ["pending", "approved"] } },
        select: {
          id: true,
          equipmentType: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.image || ""} alt={user.name} />
            <AvatarFallback className="text-xl">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge
                variant={
                  user.role === "admin"
                    ? "default"
                    : user.role === "team_lead"
                      ? "secondary"
                      : "outline"
                }
              >
                {user.role.replace("_", " ").toUpperCase()}
              </Badge>
              {user.team && (
                <Badge variant="outline">Team: {user.team.name}</Badge>
              )}
              <Badge variant={user.isActive ? "default" : "destructive"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm user={user} />
              </CardContent>
            </Card>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            {/* Current Equipment */}
            <Card>
              <CardHeader>
                <CardTitle>My Equipment</CardTitle>
                <CardDescription>
                  Equipment currently assigned to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user.ownedEquipment.length > 0 ? (
                  <div className="space-y-3">
                    {user.ownedEquipment.map((equipment) => (
                      <div
                        key={equipment.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{equipment.name}</p>
                          <p className="text-sm text-gray-600">
                            {equipment.serialNumber}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {equipment.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No equipment assigned
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Requests</CardTitle>
                <CardDescription>
                  Your latest equipment requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user.equipmentRequests.length > 0 ? (
                  <div className="space-y-3">
                    {user.equipmentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{request.equipmentType}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "pending"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No recent requests
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member since:</span>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last updated:</span>
                  <span>{new Date(user.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">User ID:</span>
                  <span className="font-mono text-xs">{user.id}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
