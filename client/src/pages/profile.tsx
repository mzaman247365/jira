import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { User, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/profile", profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings.</p>
      </div>

      {/* Profile Info */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <UserAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            imageUrl={user.profileImageUrl}
            size="lg"
          />
          <div>
            <h3 className="font-semibold">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.username && (
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-first-name">First Name</Label>
              <Input
                id="profile-first-name"
                value={profileData.firstName}
                onChange={(e) =>
                  setProfileData((d) => ({ ...d, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-last-name">Last Name</Label>
              <Input
                id="profile-last-name"
                value={profileData.lastName}
                onChange={(e) =>
                  setProfileData((d) => ({ ...d, lastName: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={profileData.email}
              onChange={(e) =>
                setProfileData((d) => ({ ...d, email: e.target.value }))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="gap-1.5"
            >
              {updateProfileMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Change Password</h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData((d) => ({ ...d, currentPassword: e.target.value }))
              }
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData((d) => ({ ...d, newPassword: e.target.value }))
              }
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData((d) => ({ ...d, confirmPassword: e.target.value }))
              }
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                changePasswordMutation.isPending ||
                !passwordData.currentPassword ||
                !passwordData.newPassword
              }
              className="gap-1.5"
            >
              {changePasswordMutation.isPending ? (
                "Changing..."
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Change Password
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
