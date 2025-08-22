"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const SettingsPage = () => {
  const [metaVerifyToken, setMetaVerifyToken] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMetaVerifyToken(data.metaVerifyToken || "");
        setMetaAppSecret(data.metaAppSecret || "");
        setMetaAccessToken(data.metaAccessToken || "");
        setMetaPhoneNumberId(data.metaPhoneNumberId || "");
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        metaVerifyToken,
        metaAppSecret,
        metaAccessToken,
        metaPhoneNumberId,
      }),
    });

    if (response.ok) {
      toast.success("Settings saved successfully.");
    } else {
      toast.error("Failed to save settings.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <Card>
        <CardHeader>
          <CardTitle>Meta Cloud API Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaVerifyToken">Verify Token</Label>
              <Input
                id="metaVerifyToken"
                value={metaVerifyToken}
                onChange={(e) => setMetaVerifyToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaAppSecret">App Secret</Label>
              <Input
                id="metaAppSecret"
                type="password"
                value={metaAppSecret}
                onChange={(e) => setMetaAppSecret(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaAccessToken">Access Token</Label>
              <Input
                id="metaAccessToken"
                type="password"
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaPhoneNumberId">Phone Number ID</Label>
              <Input
                id="metaPhoneNumberId"
                value={metaPhoneNumberId}
                onChange={(e) => setMetaPhoneNumberId(e.target.value)}
              />
            </div>
            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
