"use client";

import type { BusinessProfileItem } from "@site-haus/contracts";
import { getApi } from "@site-haus/stores/api";
import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Spinner } from "@site-haus/ui/components/base/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@site-haus/ui/components/base/tabs";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ColorPicker, StringList } from "./list-inputs";
import { SocialInput, TikTokIcon } from "./social-input";

// ── Shared helpers ────────────────────────────────────────────────────────────

async function saveSection(
  profile: BusinessProfileItem | null,
  data: Record<string, unknown>
): Promise<BusinessProfileItem | null> {
  try {
    if (!profile) {
      const res = await getApi().businessProfiles.create({ body: data as never });
      if (res.status === 201) return res.body.profile;
      if (res.status === 409) toast.error("A profile already exists for this client.");
      else toast.error("Failed to create profile.");
    } else {
      const res = await getApi().businessProfiles.updateMe({ body: data as never });
      if (res.status === 200) return res.body.profile;
      else toast.error("Failed to save.");
    }
  } catch {
    toast.error("Something went wrong. Please try again.");
  }
  return null;
}

function SaveButton({
  saving,
  onClick,
  disabled,
}: {
  saving: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="pt-2">
      <Button onClick={onClick} disabled={saving || disabled} type="button">
        {saving && <Spinner className="mr-2 h-4 w-4" />}
        Save
      </Button>
      {disabled && (
        <p className="mt-2 text-xs text-muted-foreground">
          Fill in the About section first.
        </p>
      )}
    </div>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────

function AboutTab({
  profile,
  onSaved,
}: {
  profile: BusinessProfileItem | null;
  onSaved: (p: BusinessProfileItem) => void;
}) {
  const [businessName, setBusinessName] = useState(profile?.businessName ?? "");
  const [industry, setIndustry] = useState(profile?.industry ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [targetAudience, setTargetAudience] = useState(
    profile?.targetAudience ?? ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!businessName.trim()) {
      toast.error("Business name is required.");
      return;
    }
    setSaving(true);
    const saved = await saveSection(profile, {
      businessName: businessName.trim(),
      industry: industry || null,
      description: description || null,
      targetAudience: targetAudience || null,
    });
    if (saved) {
      toast.success("Saved!");
      onSaved(saved);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="businessName">
          Business Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Your business name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. Construction, Food & Beverage"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">About Your Business</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What do you do, and what makes you special?"
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="targetAudience">Who Are Your Customers?</Label>
        <Textarea
          id="targetAudience"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="Describe your typical customer"
          rows={3}
        />
      </div>

      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
}

// ── Brand ─────────────────────────────────────────────────────────────────────

function BrandTab({
  profile,
  onSaved,
}: {
  profile: BusinessProfileItem | null;
  onSaved: (p: BusinessProfileItem) => void;
}) {
  const [hasLogo, setHasLogo] = useState<boolean>(profile?.hasLogo ?? false);
  const [brandColors, setBrandColors] = useState<string[]>(
    (profile?.brandColors as string[] | null) ?? []
  );
  const [brandFonts, setBrandFonts] = useState(profile?.brandFonts ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const saved = await saveSection(profile, {
      hasLogo,
      brandColors: brandColors.filter(Boolean),
      brandFonts: brandFonts || null,
    });
    if (saved) {
      toast.success("Saved!");
      onSaved(saved);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Do you have an existing logo?</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={hasLogo ? "default" : "outline"}
            onClick={() => setHasLogo(true)}
          >
            Yes, I do
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!hasLogo ? "default" : "outline"}
            onClick={() => setHasLogo(false)}
          >
            No, I need one designed
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          You can share logo files in the Assets section of your project.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Brand Colors</Label>
        <p className="text-xs text-muted-foreground">
          Click a color to edit it. Click + to add a new one.
        </p>
        <ColorPicker value={brandColors} onChange={setBrandColors} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="brandFonts">Brand Fonts</Label>
        <Input
          id="brandFonts"
          value={brandFonts}
          onChange={(e) => setBrandFonts(e.target.value)}
          placeholder="e.g. Helvetica, Garamond"
        />
      </div>

      <SaveButton saving={saving} onClick={handleSave} disabled={!profile} />
    </div>
  );
}

// ── Online ────────────────────────────────────────────────────────────────────

function OnlineTab({
  profile,
  onSaved,
}: {
  profile: BusinessProfileItem | null;
  onSaved: (p: BusinessProfileItem) => void;
}) {
  const cp = (profile?.currentPresence as Record<string, unknown> | null) ?? {};
  const existingSocial = (cp.social as Record<string, string> | undefined) ?? {};

  const [website, setWebsite] = useState((cp.website as string) ?? "");
  const [facebook, setFacebook] = useState(existingSocial.facebook ?? "");
  const [instagram, setInstagram] = useState(existingSocial.instagram ?? "");
  const [twitter, setTwitter] = useState(existingSocial.twitter ?? "");
  const [linkedin, setLinkedin] = useState(existingSocial.linkedin ?? "");
  const [tiktok, setTiktok] = useState(existingSocial.tiktok ?? "");
  const [youtube, setYoutube] = useState(existingSocial.youtube ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const social: Record<string, string> = {};
    if (facebook) social.facebook = facebook;
    if (instagram) social.instagram = instagram;
    if (twitter) social.twitter = twitter;
    if (linkedin) social.linkedin = linkedin;
    if (tiktok) social.tiktok = tiktok;
    if (youtube) social.youtube = youtube;

    const saved = await saveSection(profile, {
      currentPresence: {
        website: website || undefined,
        social: Object.keys(social).length > 0 ? social : undefined,
      },
    });
    if (saved) {
      toast.success("Saved!");
      onSaved(saved);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Website</Label>
        <Input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourbusiness.com"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SocialInput
          label="Facebook"
          icon={<Facebook className="h-4 w-4" />}
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
          placeholder="facebook.com/yourbusiness"
        />
        <SocialInput
          label="Instagram"
          icon={<Instagram className="h-4 w-4" />}
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="instagram.com/yourbusiness"
        />
        <SocialInput
          label="Twitter / X"
          icon={<Twitter className="h-4 w-4" />}
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
          placeholder="x.com/yourbusiness"
        />
        <SocialInput
          label="LinkedIn"
          icon={<Linkedin className="h-4 w-4" />}
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          placeholder="linkedin.com/company/yourbusiness"
        />
        <SocialInput
          label="TikTok"
          icon={<TikTokIcon />}
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
          placeholder="tiktok.com/@yourbusiness"
        />
        <SocialInput
          label="YouTube"
          icon={<Youtube className="h-4 w-4" />}
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
          placeholder="youtube.com/@yourbusiness"
        />
      </div>

      <SaveButton saving={saving} onClick={handleSave} disabled={!profile} />
    </div>
  );
}

// ── Goals ─────────────────────────────────────────────────────────────────────

function GoalsTab({
  profile,
  onSaved,
}: {
  profile: BusinessProfileItem | null;
  onSaved: (p: BusinessProfileItem) => void;
}) {
  const [goals, setGoals] = useState(profile?.goals ?? "");
  const [painPoints, setPainPoints] = useState(profile?.painPoints ?? "");
  const [competitors, setCompetitors] = useState(profile?.competitors ?? "");
  const [inspirationUrls, setInspirationUrls] = useState<string[]>(
    (profile?.inspirationUrls as string[] | null) ?? []
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    profile?.additionalNotes ?? ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const saved = await saveSection(profile, {
      goals: goals || null,
      painPoints: painPoints || null,
      competitors: competitors || null,
      inspirationUrls: inspirationUrls.filter(Boolean),
      additionalNotes: additionalNotes || null,
    });
    if (saved) {
      toast.success("Saved!");
      onSaved(saved);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="goals">What do you want to achieve?</Label>
        <Textarea
          id="goals"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="What are your goals for the new website?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="painPoints">What's not working right now?</Label>
        <Textarea
          id="painPoints"
          value={painPoints}
          onChange={(e) => setPainPoints(e.target.value)}
          placeholder="What challenges are you facing with your current site or online presence?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="competitors">Competitors</Label>
        <Textarea
          id="competitors"
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          placeholder="Who are your main competitors?"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Sites You Like</Label>
        <p className="text-xs text-muted-foreground">
          Share links to websites whose design or feel you admire.
        </p>
        <StringList
          value={inspirationUrls}
          onChange={setInspirationUrls}
          placeholder="https://example.com"
          addLabel="Add a link"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="additionalNotes">Anything else?</Label>
        <Textarea
          id="additionalNotes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any other context that would help us understand your business"
          rows={3}
        />
      </div>

      <SaveButton saving={saving} onClick={handleSave} disabled={!profile} />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function ProfileForm({
  profile: initialProfile,
  onSaved,
}: {
  profile: BusinessProfileItem | null;
  mode: "create" | "edit";
  onSaved: (profile: BusinessProfileItem) => void;
}) {
  const [profile, setProfile] = useState(initialProfile);

  const handleSaved = (saved: BusinessProfileItem) => {
    setProfile(saved);
    onSaved(saved);
  };

  return (
    <Tabs defaultValue="about">
      <TabsList className="mb-6">
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="brand">Brand</TabsTrigger>
        <TabsTrigger value="online">Online</TabsTrigger>
        <TabsTrigger value="goals">Goals</TabsTrigger>
      </TabsList>

      <TabsContent value="about">
        <AboutTab profile={profile} onSaved={handleSaved} />
      </TabsContent>
      <TabsContent value="brand">
        <BrandTab profile={profile} onSaved={handleSaved} />
      </TabsContent>
      <TabsContent value="online">
        <OnlineTab profile={profile} onSaved={handleSaved} />
      </TabsContent>
      <TabsContent value="goals">
        <GoalsTab profile={profile} onSaved={handleSaved} />
      </TabsContent>
    </Tabs>
  );
}
