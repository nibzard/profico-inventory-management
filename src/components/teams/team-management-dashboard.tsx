// ABOUTME: Team management dashboard component for administrators
// ABOUTME: Comprehensive interface for managing teams, team leads, and team member assignments

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Crown,
  User,
  Edit,
  Trash2,
  Settings,
} from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "team_lead" | "user";
  isActive: boolean;
}

interface Team {
  id: string;
  name: string;
  createdAt: Date;
  leader?: {
    id: string;
    name: string;
    email: string;
  };
  members: TeamMember[];
  memberCount: number;
  activeMemberCount: number;
}

interface CreateTeamData {
  name: string;
  leaderId?: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId?: string | null;
}

export function TeamManagementDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const [formData, setFormData] = useState<CreateTeamData>({
    name: "",
    leaderId: "",
  });

  // Fetch teams and users
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch teams with members
      const teamsResponse = await fetch("/api/teams?includeMembers=true");
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setTeams(teamsData);
      }

      // Fetch users for team leader assignment
      const usersResponse = await fetch("/api/users?active=true");
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  // Filter teams based on search
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTeam = async () => {
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Team created successfully");
        setIsCreateDialogOpen(false);
        setFormData({ name: "", leaderId: "" });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create team");
      }
    } catch (error) {
      console.error("Create team error:", error);
      toast.error("Failed to create team");
    }
  };

  const handleUpdateTeam = async (teamId: string, updates: Partial<Team>) => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success("Team updated successfully");
        setIsEditDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update team");
      }
    } catch (error) {
      console.error("Update team error:", error);
      toast.error("Failed to update team");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team? Team members will become unassigned.")) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Team deleted successfully");
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete team");
      }
    } catch (error) {
      console.error("Delete team error:", error);
      toast.error("Failed to delete team");
    }
  };

  const handleAssignTeamLead = async (teamId: string, leaderId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/leader`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leaderId }),
      });

      if (response.ok) {
        toast.success("Team lead assigned successfully");
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to assign team lead");
      }
    } catch (error) {
      console.error("Assign team lead error:", error);
      toast.error("Failed to assign team lead");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", leaderId: "" });
    setSelectedTeam(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "team_lead":
        return "bg-blue-100 text-blue-800";
      case "user":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = {
    totalTeams: teams.length,
    totalMembers: teams.reduce((sum, team) => sum + team.memberCount, 0),
    activeMembers: teams.reduce((sum, team) => sum + team.activeMemberCount, 0),
    teamsWithLeads: teams.filter(team => team.leader).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600 mt-1">
            Manage teams, assign team leads, and organize team members
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team and assign a team lead (optional).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <Label htmlFor="teamLead">Team Lead (Optional)</Label>
                <Select onValueChange={(value) => setFormData({ ...formData, leaderId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Team Lead</SelectItem>
                    {users
                      .filter(user => user.role === "team_lead" || user.role === "admin")
                      .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={!formData.name}>
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Total Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
            <p className="text-xs text-gray-500">active teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-gray-500">{stats.activeMembers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Crown className="h-4 w-4 mr-2" />
              Team Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.teamsWithLeads}</div>
            <p className="text-xs text-gray-500">assigned leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Avg Team Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTeams > 0 ? Math.round(stats.totalMembers / stats.totalTeams) : 0}
            </div>
            <p className="text-xs text-gray-500">members per team</p>
          </CardContent>
        </Card>
      </div>

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Manage team settings and member assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredTeams.map((team) => (
              <Card key={team.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Building2 className="h-5 w-5" />
                        <span>{team.name}</span>
                        {team.leader && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            {team.leader.name}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Created {format(new Date(team.createdAt), "MMMM d, yyyy")} • 
                        {team.memberCount} member{team.memberCount !== 1 ? "s" : ""} 
                        ({team.activeMemberCount} active)
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team);
                          setFormData({
                            name: team.name,
                            leaderId: team.leader?.id || "",
                          });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Team Members</h4>
                      {team.members.length === 0 ? (
                        <p className="text-sm text-gray-500">No members assigned to this team</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {team.members.map((member) => (
                            <div key={member.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.email} />
                                <AvatarFallback className="text-xs">
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{member.name}</p>
                                <p className="text-xs text-gray-500 truncate">{member.email}</p>
                              </div>
                              <Badge className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                                {member.role}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!team.leader && (
                      <div className="flex items-center space-x-2">
                        <Select onValueChange={(value) => handleAssignTeamLead(team.id, value)}>
                          <SelectTrigger className="w-64">
                            <SelectValue placeholder="Assign team lead" />
                          </SelectTrigger>
                          <SelectContent>
                            {users
                              .filter(user => (user.role === "team_lead" || user.role === "admin") && user.teamId !== team.id)
                              .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredTeams.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No teams found</p>
                  <p className="text-sm">Create your first team to get started</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}