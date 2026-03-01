"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LoginClientProps {
  logoUrl: string | null;
  studioName: string;
}

function StudioLogo({ logoUrl, studioName }: { logoUrl: string | null; studioName: string }) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div className="flex justify-center mb-4">
        <Image
          src={logoUrl}
          alt={studioName}
          width={72}
          height={72}
          className="rounded-full object-cover w-18 h-18"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-maroon-700 text-white text-2xl font-bold">
        {studioName.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}

export function LoginClient({ logoUrl, studioName }: LoginClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login gagal", description: error.message, variant: "destructive" });
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-maroon-50 to-white p-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <StudioLogo logoUrl={logoUrl} studioName={studioName} />
          <h1 className="text-2xl font-bold text-maroon-700">{studioName}</h1>
          <p className="text-muted-foreground text-sm mt-1">Studio Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-maroon-700 hover:bg-maroon-600"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Masuk
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
