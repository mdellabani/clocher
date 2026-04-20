import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Check, X, UserCheck, Users, ShoppingBag, ShieldCheck, FileText, Copy, Key } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  getPendingUsers, approveUser, rejectUser,
  getPendingProducers, approveProducer, rejectProducer,
  getCommuneMembers, promoteToModerator, demoteToResident,
  getAuditLog, getCommune,
} from "@rural-community-platform/shared";
import { ROLE_LABELS } from "@rural-community-platform/shared";
import type { Role } from "@rural-community-platform/shared";

type PendingUser = { id: string; display_name: string; created_at: string };
type PendingProducer = { id: string; name: string; categories: string[]; created_at: string };
type Member = { id: string; display_name: string; role: string; status: string; created_at: string };
type AuditEntry = { id: string; action: string; target_type: string; created_at: string; profiles: { display_name: string } | null };

type Section = "users" | "producers" | "members" | "audit";

export default function AdminHub() {
  const { profile } = useAuth();
  const theme = useTheme();
  const [activeSection, setActiveSection] = useState<Section>("users");
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingProducers, setPendingProducers] = useState<PendingProducer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile?.commune_id) return;
    const [usersRes, producersRes, membersRes, auditRes, communeRes] = await Promise.all([
      getPendingUsers(supabase, profile.commune_id),
      getPendingProducers(supabase, profile.commune_id),
      getCommuneMembers(supabase, profile.commune_id),
      getAuditLog(supabase, profile.commune_id, 30),
      getCommune(supabase, profile.commune_id),
    ]);
    if (usersRes.data) setPendingUsers(usersRes.data as PendingUser[]);
    if (producersRes.data) setPendingProducers(producersRes.data as PendingProducer[]);
    if (membersRes.data) setMembers(membersRes.data as Member[]);
    if (auditRes.data) setAuditEntries(auditRes.data as AuditEntry[]);
    if (communeRes.data) setInviteCode(communeRes.data.invite_code);
  }, [profile?.commune_id]);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleApproveUser(userId: string, name: string) {
    const { error } = await approveUser(supabase, userId);
    if (error) { Alert.alert("Erreur", "Impossible d'approuver"); return; }
    setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    Alert.alert("Approuvé", `${name} a été approuvé`);
  }

  async function handleRejectUser(userId: string, name: string) {
    Alert.alert("Refuser", `Refuser l'inscription de ${name} ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Refuser", style: "destructive", onPress: async () => {
        const { error } = await rejectUser(supabase, userId);
        if (error) { Alert.alert("Erreur", "Impossible de refuser"); return; }
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      }},
    ]);
  }

  async function handleApproveProducer(id: string, name: string) {
    const { error } = await approveProducer(supabase, id);
    if (error) { Alert.alert("Erreur", "Impossible d'approuver"); return; }
    setPendingProducers((prev) => prev.filter((p) => p.id !== id));
    Alert.alert("Approuvé", `${name} a été approuvé`);
  }

  async function handleRejectProducer(id: string, name: string) {
    Alert.alert("Refuser", `Refuser ${name} ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Refuser", style: "destructive", onPress: async () => {
        const { error } = await rejectProducer(supabase, id);
        if (error) { Alert.alert("Erreur", "Impossible de refuser"); return; }
        setPendingProducers((prev) => prev.filter((p) => p.id !== id));
      }},
    ]);
  }

  async function handleToggleRole(userId: string, currentRole: string, name: string) {
    if (currentRole === "moderator") {
      Alert.alert("Rétrograder", `Retirer le rôle modérateur de ${name} ?`, [
        { text: "Annuler", style: "cancel" },
        { text: "Confirmer", onPress: async () => {
          const { error } = await demoteToResident(supabase, userId);
          if (error) { Alert.alert("Erreur", "Impossible de modifier le rôle"); return; }
          setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role: "resident" } : m));
        }},
      ]);
    } else if (currentRole === "resident") {
      Alert.alert("Promouvoir", `Promouvoir ${name} en modérateur ?`, [
        { text: "Annuler", style: "cancel" },
        { text: "Confirmer", onPress: async () => {
          const { error } = await promoteToModerator(supabase, userId);
          if (error) { Alert.alert("Erreur", "Impossible de modifier le rôle"); return; }
          setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role: "moderator" } : m));
        }},
      ]);
    }
  }

  const sections: { key: Section; label: string; icon: typeof UserCheck; count?: number }[] = [
    { key: "users", label: "Inscriptions", icon: UserCheck, count: pendingUsers.length },
    { key: "producers", label: "Producteurs", icon: ShoppingBag, count: pendingProducers.length },
    { key: "members", label: "Membres", icon: Users },
    { key: "audit", label: "Activité", icon: FileText },
  ];

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  function renderContent() {
    if (activeSection === "users") {
      if (pendingUsers.length === 0) return <Text style={[styles.emptyText, { color: theme.muted }]}>Aucune inscription en attente</Text>;
      return pendingUsers.map((user) => (
        <View key={user.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: theme.pinBg }]}><UserCheck size={16} color={theme.primary} /></View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{user.display_name}</Text>
              <Text style={styles.cardSubtitle}>Inscrit le {formatDate(user.created_at)}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: theme.primary }]} onPress={() => handleApproveUser(user.id, user.display_name)}>
              <Check size={14} color="#fff" strokeWidth={2.5} /><Text style={styles.approveTxt}>Approuver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectUser(user.id, user.display_name)}>
              <X size={14} color="#dc2626" strokeWidth={2.5} /><Text style={styles.rejectTxt}>Refuser</Text>
            </TouchableOpacity>
          </View>
        </View>
      ));
    }

    if (activeSection === "producers") {
      if (pendingProducers.length === 0) return <Text style={[styles.emptyText, { color: theme.muted }]}>Aucun producteur en attente</Text>;
      return pendingProducers.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: "#ecfdf5" }]}><ShoppingBag size={16} color="#16a34a" /></View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{p.name}</Text>
              <Text style={styles.cardSubtitle}>{p.categories?.join(", ")} · {formatDate(p.created_at)}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: "#16a34a" }]} onPress={() => handleApproveProducer(p.id, p.name)}>
              <Check size={14} color="#fff" strokeWidth={2.5} /><Text style={styles.approveTxt}>Approuver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectProducer(p.id, p.name)}>
              <X size={14} color="#dc2626" strokeWidth={2.5} /><Text style={styles.rejectTxt}>Refuser</Text>
            </TouchableOpacity>
          </View>
        </View>
      ));
    }

    if (activeSection === "members") {
      const activeMembers = members.filter((m) => m.status === "active");
      if (activeMembers.length === 0) return <Text style={[styles.emptyText, { color: theme.muted }]}>Aucun membre</Text>;
      return activeMembers.map((m) => (
        <View key={m.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: theme.pinBg }]}>
              <Text style={[styles.initial, { color: theme.primary }]}>{m.display_name?.charAt(0)?.toUpperCase() ?? "?"}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{m.display_name}</Text>
              <Text style={styles.cardSubtitle}>{ROLE_LABELS[m.role as Role] ?? m.role}</Text>
            </View>
            {m.role !== "admin" && (
              <TouchableOpacity
                style={[styles.rolePill, m.role === "moderator" ? { backgroundColor: "#dbeafe" } : { backgroundColor: "#f4f4f5" }]}
                onPress={() => handleToggleRole(m.id, m.role, m.display_name)}
              >
                <ShieldCheck size={12} color={m.role === "moderator" ? "#2563eb" : "#a1a1aa"} />
                <Text style={[styles.rolePillText, m.role === "moderator" ? { color: "#2563eb" } : { color: "#a1a1aa" }]}>
                  {m.role === "moderator" ? "Mod" : "Promouvoir"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ));
    }

    if (activeSection === "audit") {
      if (auditEntries.length === 0) return <Text style={[styles.emptyText, { color: theme.muted }]}>Aucune activité récente</Text>;
      return auditEntries.map((entry) => (
        <View key={entry.id} style={styles.auditRow}>
          <Text style={styles.auditAction}>{entry.action}</Text>
          <Text style={styles.auditMeta}>
            {entry.profiles?.display_name ?? "Système"} · {entry.target_type} · {formatDate(entry.created_at)}
          </Text>
        </View>
      ));
    }

    return null;
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.muted }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Administration", headerBackTitle: "Retour" }} />
      <FlatList
        style={{ backgroundColor: theme.background }}
        data={[{ key: "content" }]}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={() => (
          <View style={styles.content}>
            {renderContent()}
          </View>
        )}
        ListHeaderComponent={
          <>
          {/* Invite code card */}
          {inviteCode ? (
            <View style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <Key size={14} color={theme.primary} />
                <Text style={[styles.inviteLabel, { color: theme.primary }]}>Code d'invitation</Text>
              </View>
              <View style={styles.inviteCodeRow}>
                <Text style={styles.inviteCodeText}>{inviteCode}</Text>
                <TouchableOpacity
                  style={[styles.copyButton, { borderColor: theme.primary + "40" }]}
                  onPress={async () => {
                    await Clipboard.setStringAsync(inviteCode);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  activeOpacity={0.7}
                >
                  <Copy size={14} color={theme.primary} />
                  <Text style={[styles.copyText, { color: theme.primary }]}>{codeCopied ? "Copié !" : "Copier"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inviteHint}>Partagez ce code pour que vos habitants s'inscrivent sans validation.</Text>
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {sections.map((s) => {
              const isActive = activeSection === s.key;
              const Icon = s.icon;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.tab, isActive && { backgroundColor: theme.primary }]}
                  onPress={() => setActiveSection(s.key)}
                  activeOpacity={0.7}
                >
                  <Icon size={14} color={isActive ? "#fff" : "#71717a"} />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{s.label}</Text>
                  {(s.count ?? 0) > 0 && (
                    <View style={[styles.tabBadge, isActive ? { backgroundColor: "rgba(255,255,255,0.3)" } : { backgroundColor: theme.primary }]}>
                      <Text style={styles.tabBadgeText}>{s.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { fontFamily: "DMSans_400Regular", fontSize: 16 },
  emptyText: { fontFamily: "DMSans_500Medium", fontSize: 15, textAlign: "center", paddingVertical: 32 },

  inviteCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  inviteHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  inviteLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  inviteCodeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  inviteCodeText: { fontFamily: "DMSans_600SemiBold", fontSize: 20, letterSpacing: 3, color: "#18181b", flex: 1 },
  copyButton: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  copyText: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  inviteHint: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "#a1a1aa", marginTop: 8 },

  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f4f4f5",
  },
  tabText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#71717a" },
  tabTextActive: { color: "#fff", fontFamily: "DMSans_600SemiBold" },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: "center" },
  tabBadgeText: { fontFamily: "DMSans_600SemiBold", fontSize: 10, color: "#fff" },

  content: { padding: 16, gap: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  initial: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: "#18181b" },
  cardSubtitle: { fontFamily: "DMSans_400Regular", fontSize: 12, color: "#a1a1aa", marginTop: 2 },

  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 10, padding: 10 },
  approveTxt: { fontFamily: "DMSans_600SemiBold", color: "#fff", fontSize: 13 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, padding: 10, backgroundColor: "#fef2f2" },
  rejectTxt: { fontFamily: "DMSans_600SemiBold", color: "#dc2626", fontSize: 13 },

  rolePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  rolePillText: { fontFamily: "DMSans_500Medium", fontSize: 11 },

  auditRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  auditAction: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "#18181b" },
  auditMeta: { fontFamily: "DMSans_400Regular", fontSize: 12, color: "#a1a1aa", marginTop: 2 },
});
