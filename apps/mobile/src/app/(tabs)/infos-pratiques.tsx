import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  FlatList,
} from "react-native";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Phone, Mail, MapPin, Clock, ExternalLink } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

interface InfosPratiques {
  horaires?: string;
  contact?: string;
  services?: string;
  associations?: string;
  commerces?: Array<{ nom: string; horaires?: string; tel?: string; emoji?: string }>;
  liens?: string;
}

interface ContactInfo {
  tel?: string;
  email?: string;
  adresse?: string;
}

interface Service {
  name: string;
  location?: string;
  phone: string;
}

interface Commerce {
  nom: string;
  horaires?: string;
  tel?: string;
  emoji?: string;
}

interface Lien {
  label: string;
  url: string;
}

function parseContact(contactStr?: string): ContactInfo {
  if (!contactStr) return {};

  const result: ContactInfo = {};
  const lines = contactStr.split("\n");

  for (const line of lines) {
    if (/tél/i.test(line)) {
      const match = line.match(/tél\s*:\s*(.+)$/i);
      if (match) result.tel = match[1].trim();
    } else if (/email/i.test(line)) {
      const match = line.match(/email\s*:\s*(.+)$/i);
      if (match) result.email = match[1].trim();
    } else if (/adresse/i.test(line)) {
      const match = line.match(/adresse\s*:\s*(.+)$/i);
      if (match) result.adresse = match[1].trim();
    }
  }

  return result;
}

function parseServices(servicesStr?: string): Service[] {
  if (!servicesStr) return [];

  const lines = servicesStr.split("\n").filter((l) => l.trim());
  const regex = /^(.+?)(?:\s*\((.+?)\))?\s*:\s*(.+)$/;

  return lines
    .map((line) => {
      const match = line.match(regex);
      if (!match) return null;
      return {
        name: match[1].trim(),
        location: match[2]?.trim(),
        phone: match[3].trim(),
      };
    })
    .filter((s): s is Service => s !== null);
}

function parseAssociations(assocStr?: string): Array<{ name: string; description: string }> {
  if (!assocStr) return [];

  const lines = assocStr.split("\n").filter((l) => l.trim());

  return lines.map((line) => {
    const parts = line.split(/\s*—\s*/);
    return {
      name: parts[0].trim(),
      description: parts[1]?.trim() || "",
    };
  });
}

function parseLinks(linksStr?: string): Lien[] {
  if (!linksStr) return [];

  const lines = linksStr.split("\n").filter((l) => l.trim());

  return lines
    .map((line) => {
      const match = line.match(/^(.+?)\s*:\s*(.+)$/);
      if (!match) return null;
      const url = match[2].trim();
      if (url.match(/^https?:\/\//)) {
        return { label: match[1].trim(), url };
      }
      return null;
    })
    .filter((l): l is Lien => l !== null);
}

function parseHours(hoursStr?: string): string[] {
  if (!hoursStr) return [];
  return hoursStr.split("\n").filter((l) => l.trim());
}

export default function InfosPratiquesScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const [infos, setInfos] = useState<InfosPratiques>({});
  const [communeName, setCommuneName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInfos = useCallback(async () => {
    if (!profile?.commune_id) return;

    const { data } = await supabase
      .from("communes")
      .select("name, infos_pratiques")
      .eq("id", profile.commune_id)
      .single();

    if (data) {
      setCommuneName(data.name ?? "");
      setInfos((data.infos_pratiques as InfosPratiques) ?? {});
    }
  }, [profile?.commune_id]);

  useEffect(() => {
    loadInfos().then(() => setLoading(false));
  }, [loadInfos]);

  async function onRefresh() {
    setRefreshing(true);
    await loadInfos();
    setRefreshing(false);
  }

  const contact = parseContact(infos.contact);
  const services = parseServices(infos.services);
  const associations = parseAssociations(infos.associations);
  const commerces = infos.commerces ?? [];
  const links = parseLinks(infos.liens);
  const hours = parseHours(infos.horaires);

  const hasHeroContent = hours.length > 0 || contact.tel || contact.email || contact.adresse;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.muted }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Infos pratiques" }} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.pageTitle, { color: "#18181b" }]}>
          Infos pratiques{communeName ? ` — ${communeName}` : ""}
        </Text>

        {hasHeroContent && (
          <LinearGradient
            colors={theme.gradient as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              {/* Hours Section */}
              {hours.length > 0 && (
                <View style={styles.heroSection}>
                  <View style={styles.heroHeaderRow}>
                    <Clock size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.heroTitle}>🏛️ {communeName}</Text>
                  </View>
                  <View style={styles.hoursContent}>
                    {hours.map((hour, idx) => (
                      <Text key={idx} style={styles.hourText}>
                        {hour}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Contact Section */}
              {(contact.tel || contact.email || contact.adresse) && (
                <View style={styles.heroSection}>
                  {contact.tel && (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => Linking.openURL(`tel:${contact.tel!.replace(/\s/g, "")}`)}
                    >
                      <Phone size={14} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.contactText}>{contact.tel}</Text>
                    </TouchableOpacity>
                  )}
                  {contact.email && (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                    >
                      <Mail size={14} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.contactText}>{contact.email}</Text>
                    </TouchableOpacity>
                  )}
                  {contact.adresse && (
                    <View style={styles.contactRow}>
                      <MapPin size={14} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.contactText}>{contact.adresse}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </LinearGradient>
        )}

        {/* Services de proximité */}
        {services.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.sectionHeader, { color: theme.primary }]}>
              📍 Services de proximité
            </Text>
            <View style={styles.sectionContent}>
              {services.map((service, idx) => (
                <View
                  key={idx}
                  style={[styles.serviceRow, { backgroundColor: theme.background }]}
                >
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.location && (
                      <Text style={[styles.serviceLocation, { color: theme.muted }]}>
                        {service.location}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${service.phone.replace(/\s/g, "")}`)}
                  >
                    <Text style={[styles.servicePhone, { color: theme.primary }]}>
                      {service.phone}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Associations */}
        {associations.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.sectionHeader, { color: theme.primary }]}>
              🤝 Associations
            </Text>
            <View style={styles.pillContainer}>
              {associations.map((assoc, idx) => (
                <View
                  key={idx}
                  style={[styles.pill, { backgroundColor: theme.pinBg }]}
                  title={assoc.description}
                >
                  <Text style={[styles.pillText, { color: theme.primary }]}>
                    {assoc.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Commerces & services */}
        {commerces.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.sectionHeader, { color: theme.primary }]}>
              🏪 Commerces & services
            </Text>
            <View style={styles.sectionContent}>
              {commerces.map((commerce, idx) => (
                <View
                  key={idx}
                  style={[styles.commerceRow, { backgroundColor: theme.background }]}
                >
                  {commerce.emoji && (
                    <View style={styles.commerceEmoji}>
                      <Text style={styles.emojiText}>{commerce.emoji}</Text>
                    </View>
                  )}
                  <View style={styles.commerceInfo}>
                    <Text style={styles.commerceName}>{commerce.nom}</Text>
                    {commerce.horaires && (
                      <Text style={[styles.commerceDetail, { color: theme.muted }]}>
                        {commerce.horaires}
                      </Text>
                    )}
                    {commerce.tel && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${commerce.tel!.replace(/\s/g, "")}`)}
                      >
                        <Text style={[styles.commercePhone, { color: theme.primary }]}>
                          {commerce.tel}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Liens utiles */}
        {links.length > 0 && (
          <View style={styles.card}>
            <Text style={[styles.sectionHeader, { color: theme.primary }]}>
              🔗 Liens utiles
            </Text>
            <View style={styles.sectionContent}>
              {links.map((link, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.linkRow, { backgroundColor: theme.background }]}
                  onPress={() => Linking.openURL(link.url)}
                >
                  <Text style={[styles.linkLabel, { color: theme.primary }]}>
                    {link.label}
                  </Text>
                  <ExternalLink size={14} color={theme.primary} strokeWidth={2} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {!hasHeroContent &&
          services.length === 0 &&
          associations.length === 0 &&
          commerces.length === 0 &&
          links.length === 0 && (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                Aucune information pratique disponible pour le moment.
              </Text>
            </View>
          )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    minHeight: 200,
  },
  loadingText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
  },
  pageTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 20,
    marginBottom: 4,
  },
  heroCard: {
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContent: {
    gap: 16,
  },
  heroSection: {
    gap: 8,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  hoursContent: {
    gap: 4,
    marginLeft: 26,
  },
  hourText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#FFFFFF",
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
  },
  sectionContent: {
    gap: 12,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#18181b",
  },
  serviceLocation: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  servicePhone: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  commerceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  commerceEmoji: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  emojiText: {
    fontSize: 18,
  },
  commerceInfo: {
    flex: 1,
  },
  commerceName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#18181b",
  },
  commerceDetail: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  commercePhone: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    marginTop: 4,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  linkLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
  },
  emptyText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    textAlign: "center",
  },
});
