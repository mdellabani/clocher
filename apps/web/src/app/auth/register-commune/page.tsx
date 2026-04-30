"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { registerCommuneSchema } from "@pretou/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { registerCommuneAction } from "./actions";

export default function RegisterCommunePage() {
  const [communeName, setCommuneName] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleDescription, setRoleDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    name: string;
    slug: string;
    invite_code: string;
  } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = registerCommuneSchema.safeParse({
      commune_name: communeName,
      code_postal: codePostal,
      email,
      password,
      display_name: displayName,
      role_description: roleDescription || undefined,
    });

    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Données invalides");
      return;
    }

    setLoading(true);
    const response = await registerCommuneAction(result.data);
    setLoading(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    if (response.success && response.commune) {
      setSuccess(response.commune);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Demande envoyée !</CardTitle>
            <CardDescription>
              Votre commune <strong>{success.name}</strong> a été enregistrée
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                Votre inscription est en attente de validation
              </p>
              <p className="mt-2 text-xs text-amber-600">
                Notre équipe va vérifier votre demande. Vous recevrez un accès dès que votre commune sera validée. Cela prend généralement moins de 24h.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium">
                Votre code d'invitation :
              </p>
              <p className="mt-1 font-mono text-lg font-bold">
                {success.invite_code}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Une fois validé, partagez ce code avec vos habitants pour qu'ils s'inscrivent directement.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push("/auth/login")}
              className="w-full"
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Inscrire ma commune</CardTitle>
          <CardDescription>
            Créez l'espace numérique de votre commune en quelques minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Commune section */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Votre commune
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="commune_name">Nom de la commune</Label>
                <Input
                  id="commune_name"
                  type="text"
                  placeholder="Saint-Médard"
                  value={communeName}
                  onChange={(e) => setCommuneName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code_postal">Code postal</Label>
                <Input
                  id="code_postal"
                  type="text"
                  placeholder="64370"
                  value={codePostal}
                  onChange={(e) => setCodePostal(e.target.value)}
                  required
                  maxLength={5}
                  pattern="\d{5}"
                />
              </div>
            </div>

            {/* Admin account section */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Votre compte administrateur
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="display_name">Votre nom</Label>
                <Input
                  id="display_name"
                  type="text"
                  placeholder="Marie Dupont"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role_description">Fonction (optionnel)</Label>
                <Input
                  id="role_description"
                  type="text"
                  placeholder="Secrétaire de mairie"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mairie@saint-medard.fr"
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
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Création en cours..." : "Créer l'espace de ma commune"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <a href="/auth/login" className="underline text-foreground">
                Se connecter
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
