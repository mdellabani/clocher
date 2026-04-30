"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@pretou/shared";
import { Eye, EyeOff } from "lucide-react";
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

type Commune = {
  id: string;
  name: string;
};

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchCommunes() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("communes")
        .select("id, name")
        .order("name");
      if (!error && data) {
        setCommunes(data);
      }
    }
    fetchCommunes();
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = signupSchema.safeParse({
      email,
      password,
      display_name: displayName,
      commune_id: communeId,
      invite_code: inviteCode || undefined,
    });

    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Données invalides");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setError("Erreur lors de la création du compte");
      setLoading(false);
      return;
    }

    // If invite code provided, validate it
    if (inviteCode) {
      const { data: commune } = await supabase
        .from("communes")
        .select("invite_code")
        .eq("id", communeId)
        .single();

      if (!commune || commune.invite_code !== inviteCode) {
        setError("Code d'invitation invalide");
        setLoading(false);
        return;
      }

      // Valid code: create profile with active status
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        display_name: displayName,
        commune_id: communeId,
        status: "active",
        role: "resident",
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      router.push("/app/feed");
    } else {
      // No code: create profile with pending status
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        display_name: displayName,
        commune_id: communeId,
        status: "pending",
        role: "resident",
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      router.push("/auth/pending");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Inscription</CardTitle>
          <CardDescription>Rejoignez votre commune</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="display_name">Nom affiché</Label>
              <Input
                id="display_name"
                type="text"
                placeholder="Jean Dupont"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="commune">Commune</Label>
              <Select value={communeId} onValueChange={setCommuneId} required>
                <SelectTrigger id="commune">
                  <SelectValue placeholder="Sélectionner votre commune" />
                </SelectTrigger>
                <SelectContent>
                  {communes.map((commune) => (
                    <SelectItem key={commune.id} value={commune.id}>
                      {commune.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite_code">Code d'invitation (optionnel)</Label>
              <Input
                id="invite_code"
                type="text"
                placeholder="Code fourni par la mairie"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                Si vous avez un code, votre inscription sera validée automatiquement.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Inscription..." : "S'inscrire"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà inscrit ?{" "}
              <a href="/auth/login" className="underline text-foreground">
                Se connecter
              </a>
            </p>

            <div className="border-t border-border pt-3 mt-1">
              <p className="text-center text-sm text-muted-foreground">
                Vous êtes une mairie ?{" "}
                <a href="/auth/register-commune" className="underline text-foreground font-medium">
                  Inscrire ma commune
                </a>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
