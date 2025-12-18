"use client";

import { useApi } from "@/lib/typed-api";
import { Button } from "@site-haus/ui/components/base/button";
import { Separator } from "@site-haus/ui/components/base/separator";
import { ClientReadOnlyField } from "@site-haus/ui/components/shared/client-readonly-field";
import { getDisplayMessage, parseApiError } from "@site-haus/ui/lib/api-error";
import { Check, Shield } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: "Verify your identity",
  profile: "Access your name and profile information",
  email: "Access your email address",
  "orders:read": "View your order history",
  "orders:write": "Create and modify orders on your behalf",
  admin: "Perform administrative actions",
};

export default function ConsentContainer() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientId = searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const scope = searchParams.get("scope") || "openid profile email";
  const state = searchParams.get("state") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "S256";
  const clientName = searchParams.get("client") || "Application";

  const scopes = scope.split(" ").filter(Boolean);

  const handleConsent = async (approved: boolean) => {
    setIsSubmitting(true);
    try {
      const r = await api.auth.oauth.consent({
        body: {
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          state: state || undefined,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod as "S256",
          approved,
        },
      });

      if (r.status !== 200) throw r;

      // Redirect to the URL provided by the server
      window.location.href = r.body.redirect_url;
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(getDisplayMessage(parsed));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <div className="flex items-center justify-center mb-4">
        <Shield className="h-12 w-12 text-blue-500" />
      </div>

      <h1 className="text-2xl font-semibold text-center mb-2">
        Authorize Application
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        {clientName} is requesting access to your account
      </p>

      <ClientReadOnlyField authForLabel={clientName} />

      <Separator className="my-6" />

      <div className="space-y-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700">
          This application will be able to:
        </h2>

        <ul className="space-y-3">
          {scopes.map((s) => (
            <li key={s} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {SCOPE_DESCRIPTIONS[s] || s}
                </p>
                {s !== SCOPE_DESCRIPTIONS[s] && (
                  <p className="text-xs text-gray-500">Scope: {s}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => handleConsent(true)}
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : "Allow"}
        </Button>

        <Button
          onClick={() => handleConsent(false)}
          variant="outline"
          className="w-full"
          disabled={isSubmitting}
        >
          Deny
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-6">
        By clicking "Allow", you authorize {clientName} to access the
        information listed above. You can revoke this access at any time from
        your account settings.
      </p>
    </div>
  );
}
