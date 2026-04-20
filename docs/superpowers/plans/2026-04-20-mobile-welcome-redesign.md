# Mobile Welcome Screen Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `apps/mobile/src/app/auth/welcome.tsx` as a scrollable, web-aligned marketing screen with hero + how-it-works + residents benefits + élu deep-link, serving residents, curious visitors, and élus evaluating the app.

**Architecture:** Single file, four local helper components (Hero, HowItWorks, ForResidents, EluBlock), cream + red/orange palette matching the web landing, `expo-linear-gradient` for hero gradient + élu card. No new dependencies. No data fetch. No tests (mobile lacks test infra; Phase 2 roadmap).

**Tech Stack:** Expo Router, React Native, `expo-linear-gradient` (already installed), `@expo-google-fonts/dm-sans` (already wired).

**Spec:** `docs/superpowers/specs/2026-04-20-mobile-welcome-redesign-design.md`

---

## File Structure

Only one file is created or modified:

- **Modify:** `apps/mobile/src/app/auth/welcome.tsx` — complete rewrite. Responsibility: render the signed-out entry screen. Everything lives in this one file — palette constants at the top, four local helper components below `Welcome()`, StyleSheets at the bottom. Target length: ~350 lines.

No other files change (no new components, no new assets, no new dependencies, no route changes).

---

## Task 1: Skeleton — replace the file with the new shell

**Files:**
- Modify: `apps/mobile/src/app/auth/welcome.tsx` (full rewrite)

- [ ] **Step 1: Replace the entire file contents**

Overwrite `apps/mobile/src/app/auth/welcome.tsx` with:

```tsx
import { View, Text, StyleSheet, Pressable, Linking, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://app.example.fr";

const colors = {
  bg: "#FBF7F1",
  bgSoft: "#FDF0EB",
  surface: "#FFFFFF",
  border: "#f0e0d0",
  text: "#2a1a14",
  textMuted: "#5a4030",
  textSubtle: "#7a5e4d",
  primary: "#2a1a14",
  accentStrong: "#BF3328",
  accentMid: "#D35230",
  accentLight: "#E49035",
};

export default function Welcome() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Hero
        onInvite={() => router.push("/auth/signup")}
        onLogin={() => router.push("/auth/login")}
      />
      <HowItWorks />
      <ForResidents />
      <EluBlock />
      <Text style={styles.footnote}>Hébergé en France · Sans engagement</Text>
    </ScrollView>
  );
}

function Hero({ onInvite, onLogin }: { onInvite: () => void; onLogin: () => void }) {
  return (
    <View style={heroStyles.wrapper}>
      <Text>Hero — implemented in Task 2</Text>
    </View>
  );
}

function HowItWorks() {
  return (
    <View style={howStyles.section}>
      <Text>HowItWorks — implemented in Task 3</Text>
    </View>
  );
}

function ForResidents() {
  return (
    <View style={residentsStyles.section}>
      <Text>ForResidents — implemented in Task 4</Text>
    </View>
  );
}

function EluBlock() {
  return (
    <View style={eluStyles.wrapper}>
      <Text>EluBlock — implemented in Task 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { paddingBottom: 32 },
  footnote: { marginTop: 16, textAlign: "center", fontSize: 11, color: colors.textSubtle },
});

const heroStyles = StyleSheet.create({
  wrapper: { paddingTop: 72, paddingBottom: 32, paddingHorizontal: 24 },
});

const howStyles = StyleSheet.create({
  section: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

const residentsStyles = StyleSheet.create({
  section: { paddingVertical: 32, paddingHorizontal: 24, backgroundColor: colors.bg },
});

const eluStyles = StyleSheet.create({
  wrapper: { paddingHorizontal: 24, paddingTop: 8 },
});
```

- [ ] **Step 2: Typecheck**

Run from repo root:

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: exit code 0, no output.

- [ ] **Step 3: Do not commit yet** — intermediate states render placeholder labels, not a shippable screen. We commit once all sections are filled in (Task 7).

---

## Task 2: Implement Hero

**Files:**
- Modify: `apps/mobile/src/app/auth/welcome.tsx` (replace `Hero` component + extend `heroStyles`)

- [ ] **Step 1: Replace the `Hero` function**

Replace the placeholder `Hero` function from Task 1 with:

```tsx
function Hero({ onInvite, onLogin }: { onInvite: () => void; onLogin: () => void }) {
  return (
    <View style={heroStyles.wrapper}>
      <LinearGradient
        colors={["#FBF7F1", "#FDF0EB", "#F5DBC8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={heroStyles.blob} />

      <View style={heroStyles.content}>
        <View style={heroStyles.pill}>
          <Text style={heroStyles.pillText}>🌾 Pour les communes rurales</Text>
        </View>

        <Text style={heroStyles.headlineDark}>Le village dans votre poche.</Text>
        <Text style={heroStyles.headlineAccent}>La mairie en direct.</Text>

        <Text style={heroStyles.sub}>
          Annonces, événements, entraide — une app simple, connectée à votre mairie.
        </Text>

        <Pressable style={heroStyles.primaryBtn} onPress={onInvite}>
          <Text style={heroStyles.primaryBtnText}>J'ai un code d'invitation</Text>
        </Pressable>

        <Pressable style={heroStyles.secondaryBtn} onPress={onLogin}>
          <Text style={heroStyles.secondaryBtnText}>Se connecter</Text>
        </Pressable>

        <Text style={heroStyles.micro}>Démarrage immédiat · Sans engagement</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Replace `heroStyles`**

Replace the small `heroStyles` StyleSheet from Task 1 with the full version:

```tsx
const heroStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
    overflow: "hidden",
    paddingTop: 72,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  blob: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentLight,
    opacity: 0.25,
  },
  content: { position: "relative" },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(228,144,53,0.3)",
  },
  pillText: { fontSize: 11, fontWeight: "600", color: colors.accentStrong },
  headlineDark: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 36,
  },
  headlineAccent: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.accentMid,
    lineHeight: 36,
  },
  sub: {
    marginTop: 14,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryBtn: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentMid,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: colors.accentStrong, fontSize: 15, fontWeight: "600" },
  micro: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 11,
    color: colors.textSubtle,
  },
});
```

Note: the accent headline (`La mairie en direct.`) uses a solid `#D35230` color rather than the web's CSS gradient text — matches the spec's fallback to avoid adding `@react-native-masked-view/masked-view` for a one-off effect.

- [ ] **Step 3: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: exit 0.

---

## Task 3: Implement HowItWorks

**Files:**
- Modify: `apps/mobile/src/app/auth/welcome.tsx` (replace `HowItWorks` + extend `howStyles`, add `HOW_STEPS` const)

- [ ] **Step 1: Add the `HOW_STEPS` constant**

Insert this constant block immediately **before** the `function HowItWorks()` declaration:

```tsx
const HOW_STEPS = [
  {
    badge: "Mairie",
    badgeColor: colors.accentStrong,
    title: "1. Publication",
    body: "Saisie unique depuis le panneau d'admin.",
  },
  {
    badge: "Résidents",
    badgeColor: colors.accentMid,
    title: "2. Fil + notif",
    body: "Visible dans l'app, notification push.",
  },
  {
    badge: "Site public",
    badgeColor: colors.accentLight,
    title: "3. Site web",
    body: "Visible aussi sur le site de la commune.",
  },
];
```

- [ ] **Step 2: Replace the `HowItWorks` function**

Replace the placeholder from Task 1 with:

```tsx
function HowItWorks() {
  return (
    <View style={howStyles.section}>
      <Text style={howStyles.titleLine1}>Une publication.</Text>
      <Text style={howStyles.titleLine2}>Trois destinations.</Text>
      <Text style={howStyles.sub}>La mairie publie une fois — tout est à jour.</Text>

      <View style={howStyles.cards}>
        {HOW_STEPS.map((step) => (
          <View key={step.title} style={howStyles.card}>
            <View style={[howStyles.badge, { backgroundColor: step.badgeColor }]}>
              <Text style={howStyles.badgeText}>{step.badge}</Text>
            </View>
            <Text style={howStyles.cardTitle}>{step.title}</Text>
            <Text style={howStyles.cardBody}>{step.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Replace `howStyles`**

Replace the minimal `howStyles` StyleSheet from Task 1 with:

```tsx
const howStyles = StyleSheet.create({
  section: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  titleLine1: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    lineHeight: 28,
  },
  titleLine2: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.accentMid,
    textAlign: "center",
    lineHeight: 28,
  },
  sub: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  cards: { marginTop: 20, gap: 12 },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  cardBody: { marginTop: 2, fontSize: 13, color: colors.textMuted },
});
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: exit 0.

---

## Task 4: Implement ForResidents

**Files:**
- Modify: `apps/mobile/src/app/auth/welcome.tsx` (replace `ForResidents` + extend `residentsStyles`, add `RESIDENT_FEATURES` const)

- [ ] **Step 1: Add the `RESIDENT_FEATURES` constant**

Insert this block immediately **before** the `function ForResidents()` declaration:

```tsx
const RESIDENT_FEATURES = [
  { emoji: "📰", title: "Le fil du village", body: "Annonces, événements, entraide." },
  { emoji: "🗓️", title: "Événements & RSVP", body: "Confirmez votre présence en un clic." },
  { emoji: "🥕", title: "Producteurs locaux", body: "Annuaire des producteurs de la commune." },
];
```

- [ ] **Step 2: Replace the `ForResidents` function**

Replace the placeholder from Task 1 with:

```tsx
function ForResidents() {
  return (
    <View style={residentsStyles.section}>
      <View style={residentsStyles.pill}>
        <Text style={residentsStyles.pillText}>Pour les résidents</Text>
      </View>
      <Text style={residentsStyles.titleLine1}>Tout ce qui se passe au village,</Text>
      <Text style={residentsStyles.titleLine2}>au creux de la main.</Text>

      <View style={residentsStyles.cards}>
        {RESIDENT_FEATURES.map((f) => (
          <View key={f.title} style={residentsStyles.card}>
            <Text style={residentsStyles.emoji}>{f.emoji}</Text>
            <Text style={residentsStyles.cardTitle}>{f.title}</Text>
            <Text style={residentsStyles.cardBody}>{f.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Replace `residentsStyles`**

Replace the minimal `residentsStyles` StyleSheet from Task 1 with:

```tsx
const residentsStyles = StyleSheet.create({
  section: { paddingVertical: 32, paddingHorizontal: 24, backgroundColor: colors.bg },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.bgSoft,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accentStrong,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titleLine1: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 28,
  },
  titleLine2: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.accentMid,
    lineHeight: 28,
  },
  cards: { marginTop: 20, gap: 12 },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 28 },
  cardTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  cardBody: { marginTop: 2, fontSize: 13, color: colors.textMuted },
});
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: exit 0.

---

## Task 5: Implement EluBlock

**Files:**
- Modify: `apps/mobile/src/app/auth/welcome.tsx` (replace `EluBlock` + extend `eluStyles`)

- [ ] **Step 1: Replace the `EluBlock` function**

Replace the placeholder from Task 1 with:

```tsx
function EluBlock() {
  const openSignup = () => {
    Linking.openURL(`${WEB_URL}/auth/register-commune`);
  };

  return (
    <View style={eluStyles.wrapper}>
      <LinearGradient
        colors={[colors.bgSoft, colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={eluStyles.card}
      >
        <Text style={eluStyles.title}>Vous êtes élu(e) ?</Text>
        <Text style={eluStyles.sub}>Inscrivez votre commune sur la plateforme.</Text>
        <Pressable onPress={openSignup}>
          <Text style={eluStyles.link}>Inscrire ma mairie →</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
```

- [ ] **Step 2: Replace `eluStyles`**

Replace the minimal `eluStyles` StyleSheet from Task 1 with:

```tsx
const eluStyles = StyleSheet.create({
  wrapper: { paddingHorizontal: 24, paddingTop: 8 },
  card: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.text },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
  link: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentStrong,
    textDecorationLine: "underline",
  },
});
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: exit 0.

---

## Task 6: Manual smoke test

**Files:** none (runtime verification only)

- [ ] **Step 1: Start local Supabase** (needed by the mobile app's Supabase client even on the welcome screen, because `auth-context` runs `getSession()` at mount)

Run from repo root:

```bash
npx supabase start
```

Expected: Supabase containers start, no error.

- [ ] **Step 2: Start Expo**

```bash
cd apps/mobile && npx expo start --clear
```

Expected: Metro bundler starts, prints a QR code + dev URL.

- [ ] **Step 3: Open on a simulator or device**

- Press `i` in the Expo terminal to open on iOS simulator, or
- Press `a` for Android emulator, or
- Scan the QR with Expo Go on a physical device.

Expected: app launches, shows the welcome screen (because we're in a fresh session, no Supabase login).

- [ ] **Step 4: Visual checks on the welcome screen**

Verify each of these by scrolling and inspecting:

- Brand pill "🌾 Pour les communes rurales" visible at top with red text on near-white background.
- Headline: line 1 `Le village dans votre poche.` in dark brown, line 2 `La mairie en direct.` in red-orange.
- Below headline: supporting sentence + two buttons ("J'ai un code d'invitation" filled dark, "Se connecter" white with red border).
- Microcopy "Démarrage immédiat · Sans engagement" visible.
- Scrolling down: "Une publication. Trois destinations." section with 3 stacked cards, each with a colored badge.
- Further scroll: "Pour les résidents" pill + headline + 3 emoji cards.
- Bottom: gradient card "Vous êtes élu(e) ?" with underlined "Inscrire ma mairie →" link.
- Footnote: "Hébergé en France · Sans engagement".

- [ ] **Step 5: Navigation checks**

Tap each CTA and confirm:

- "J'ai un code d'invitation" → navigates to the signup screen.
- Use device back / swipe back to return to welcome.
- "Se connecter" → navigates to the login screen.
- Back to welcome.
- "Inscrire ma mairie →" → opens the system browser to `${WEB_URL}/auth/register-commune`. (On simulators without a configured browser, at minimum a `Linking` event should fire — no crash.)

- [ ] **Step 6: Stop Supabase**

```bash
npx supabase stop
```

---

## Task 7: Commit

**Files:** commit the modified file.

- [ ] **Step 1: Check git state**

From repo root:

```bash
git status
git diff apps/mobile/src/app/auth/welcome.tsx
```

Expected: one modified file (`apps/mobile/src/app/auth/welcome.tsx`), no other changes. The diff should show the full rewrite.

- [ ] **Step 2: Stage and commit**

```bash
git add apps/mobile/src/app/auth/welcome.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): redesign welcome screen to match web landing

Replaces the minimal v1 welcome with a scrollable, web-aligned marketing surface: hero + primary CTAs above the fold, how-it-works 3-step block, pour-les-résidents feature cards, élu deep-link to web signup. Uses the web landing's red/orange palette for brand consistency.

Spec: docs/superpowers/specs/2026-04-20-mobile-welcome-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

```bash
git log --oneline -1
git status
```

Expected: the new commit is at HEAD; working tree is clean.

---

## Notes for the implementer

- **Why no tests?** Mobile has zero test infrastructure today (see project CLAUDE.md — Phase 2 of the test-suite roadmap covers this and is not started). Adding a test harness for this single static screen is out of scope.
- **Why one commit at the end?** Intermediate tasks leave the file with stub "implemented in Task N" placeholders. Those aren't a shippable state, so we don't commit them.
- **Gradient text:** the web's CSS gradient text on `La mairie en direct.` is intentionally rendered as solid `#D35230` on mobile. RN gradient text requires `@react-native-masked-view/masked-view` which isn't worth adding for one line. If design later insists, it's a 10-line follow-up.
- **Accessibility:** not explicitly addressed in this spec. The `Pressable` components use default RN touchable semantics; buttons have clear label text. An accessibility pass is a valid follow-up but is not gated here.
