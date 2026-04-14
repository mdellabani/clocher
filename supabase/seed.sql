-- ================================================
-- SEED DATA: Saint-Médard (64) demo
-- ================================================

-- EPCI
INSERT INTO epci (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'CC Lacq-Orthez');

-- Communes
INSERT INTO communes (
  id, epci_id, name, slug, code_postal, invite_code, theme, motto, description,
  infos_pratiques
) VALUES
(
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Saint-Médard',
  'saint-medard-64',
  '64370',
  'stmed1',
  'terre_doc',
  'Entre mer et montagne, au cœur du Béarn',
  'Saint-Médard est un village de 215 habitants perché sur une ligne de crête dominant la vallée du Luy, entre Béarn et Chalosse. La commune s''étend sur 11,26 km² entre 84 et 224 mètres d''altitude, à la frontière des Landes. Riche d''un patrimoine historique remarquable — camp romain, château du Comte d''Abidon, église gothique du XIVe siècle — le village offre un cadre de vie paisible entre traditions vivantes et nature préservée.',
  '{
    "horaires": "Lundi et jeudi\n8h00 – 12h00 / 12h30 – 17h30",
    "contact": "Tél : 05 59 67 56 14\nEmail : contact@saintmedard64.fr\nAdresse : Mairie, 64370 Saint-Médard",
    "services": "Crèche intercommunale (Sault de Navailles) : 05 59 67 90 12\nÉcole primaire Le Hêtre Blanc (Hagetaubin) : 05 59 67 52 04\nCollège Corisande d''Andoins (Arthez-de-Béarn) : 05 59 67 70 74\nLycée Gaston Fébus (Orthez) : 05 59 67 08 00\nTransport à la demande Mobilacq : 0 970 870 870 (2€/trajet)\nGare SNCF Orthez : 3635",
    "associations": "CCAS — Actions sociales, repas des aînés, sorties\nComité des Fêtes — Animations et rassemblements (cdfsaintmedard@gmail.com)\nLes Hippos''Amuz — Supporters du RCSM, sorties rugby\nSaint-Médard Loisirs — Ateliers créatifs, lecture, pétanque, jeux de cartes (06 41 05 06 70)\nRCSM — Rugby Club Saint-Médard",
    "liens": "CC Lacq-Orthez : https://www.cc-lacqorthez.fr\nTransports 64 : https://www.transport64.fr\nDéchèteries CCLO : 05 59 60 95 42",
    "commerces": [
      {"nom": "Café O''Médard", "horaires": "Ven-Sam soir, Dim matin", "emoji": "☕"},
      {"nom": "Bibliothèque ambulante", "horaires": "Mercredi 10h-12h (hors vacances)", "emoji": "📚"}
    ]
  }'::jsonb
),
(
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Arthez-de-Béarn',
  'arthez-de-bearn',
  '64370',
  'arthz1',
  'alpin',
  'Village étape sur le chemin de Compostelle',
  'Arthez-de-Béarn est une bastide de 1 800 habitants sur le chemin de Saint-Jacques-de-Compostelle. Chef-lieu de canton historique, la commune offre un panorama exceptionnel sur la chaîne des Pyrénées et abrite un patrimoine médiéval remarquable, dont la chapelle romane de Caubin. Dotée d''équipements sportifs, d''une médiathèque et d''un espace France Services, elle allie charme patrimonial et services de proximité.',
  '{
    "horaires": "Lundi au vendredi\n9h00 – 12h00 / 13h30 – 17h00\nSamedi : 9h00 – 12h00",
    "contact": "Tél : 05 59 67 70 52 / 05 59 67 49 81\nEmail : mairie.arthezdebearn@wanadoo.fr\nAdresse : 18, La Carrère, 64370 Arthez-de-Béarn",
    "services": "Collège Corisande d''Andoins : 05 59 67 70 74\nÉcole publique maternelle et primaire\nÉcole privée Saint-Joseph\nMédiathèque municipale\nPiscine municipale\nFrance Services (aide aux démarches numériques)\nAgence postale\nCamping L''Orée du Bois\nMaison des pèlerins",
    "associations": "ACPA — Association Culturelle du Pays d''Arthez (salon du livre, expos)\nAPE — Association des Parents d''Élèves (trail, randonnées)\nFC BAAL — Football Club (tournoi international U15)\nTeam Trial 64 — Activités communautaires",
    "liens": "CC Lacq-Orthez : https://www.cc-lacqorthez.fr\nOffice de tourisme Cœur de Béarn : https://www.coeurdebearn.com\nChapelle de Caubin : patrimoine roman du XIIe siècle",
    "commerces": [
      {"nom": "Médiathèque municipale", "horaires": "Mar-Sam 9h-12h / 14h-18h", "emoji": "📚"},
      {"nom": "Piscine municipale", "horaires": "Juin-Sept, horaires affichés", "emoji": "🏊"},
      {"nom": "Camping L''Orée du Bois", "horaires": "Avr-Oct", "emoji": "⛺"}
    ]
  }'::jsonb
),
(
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'Morlanne',
  'morlanne',
  '64370',
  'morl01',
  'atlantique',
  'Au pied du château, entre Béarn et Chalosse',
  'Morlanne est un village béarnais niché autour de son château médiéval du XIVe siècle, classé monument historique. À la croisée du Béarn et de la Chalosse, la commune offre un cadre de vie rural préservé avec son marché de producteurs, ses sentiers de randonnée et un patrimoine bâti remarquable — château, église fortifiée et maisons anciennes.',
  '{
    "horaires": "Lundi, mardi, jeudi, vendredi\n9h00 – 12h00 / 13h30 – 17h00\nJeudi après-midi : jusqu''à 19h00\nFermé le mercredi",
    "contact": "Tél : 05 59 81 61 23\nEmail : mairie.morlanne@orange.fr",
    "services": "Agence postale : lun-mar, jeu-ven 9h-12h / 13h30-17h, mer-sam 9h-12h\nÉcole communale\nMarché de producteurs\nChâteau de Morlanne (visites)\nSentiers de randonnée balisés",
    "associations": "Comité des fêtes\nAssociation patrimoine et culture\nClub de randonnée",
    "liens": "Château de Morlanne : https://www.chateaudemorlanne.fr\nCC Lacq-Orthez : https://www.cc-lacqorthez.fr\nTelegram officiel : https://t.me/morlanne_officiel_telegram",
    "commerces": [
      {"nom": "Château de Morlanne", "horaires": "Mer-Dim 10h30-12h30 / 14h-18h", "tel": "05 59 81 60 27", "emoji": "🏰"},
      {"nom": "Agence postale", "horaires": "Lun-Mar, Jeu-Ven 9h-12h / 13h30-17h, Mer-Sam 9h-12h", "emoji": "📮"}
    ]
  }'::jsonb
);

-- ================================================
-- Demo users
-- ================================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  phone, phone_change, phone_change_token, email_change, reauthentication_token,
  is_sso_user, is_anonymous
)
VALUES
(
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000000',
  'secretaire@saintmedard64.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000000',
  'pierre.m@email.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000000',
  'jeanne.l@email.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
),
-- Arthez-de-Béarn users
(
  '00000000-0000-0000-0000-000000000200',
  '00000000-0000-0000-0000-000000000000',
  'mairie@arthez-de-bearn.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000000',
  'marie.d@email.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000000',
  'jean-paul.b@email.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
),
-- Morlanne users
(
  '00000000-0000-0000-0000-000000000300',
  '00000000-0000-0000-0000-000000000000',
  'mairie@morlanne.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000000',
  'claude.p@email.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000000',
  'martine.s@email.fr',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated',
  '', '', '', '',
  NULL, '', '', '', '',
  false, false
);

-- Identities (required for Supabase GoTrue email/password login)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000100',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000100', 'email', 'secretaire@saintmedard64.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000101',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000101', 'email', 'pierre.m@email.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000102',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000102', 'email', 'jeanne.l@email.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
),
-- Arthez identities
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000200',
  '00000000-0000-0000-0000-000000000200',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000200', 'email', 'mairie@arthez-de-bearn.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000201',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000201', 'email', 'marie.d@email.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000202',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000202', 'email', 'jean-paul.b@email.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
),
-- Morlanne identities
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000300',
  '00000000-0000-0000-0000-000000000300',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000300', 'email', 'mairie@morlanne.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000301',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000301', 'email', 'claude.p@email.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000302',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000302', 'email', 'martine.s@email.fr', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
);

-- Profiles
INSERT INTO profiles (id, commune_id, display_name, role, status) VALUES
  -- Saint-Médard
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'Secrétariat Mairie', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'Pierre Moreau', 'resident', 'active'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 'Jeanne Larrieu', 'resident', 'active'),
  -- Arthez-de-Béarn
  ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000011', 'Secrétariat Mairie', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000011', 'Marie Ducasse', 'resident', 'active'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000011', 'Jean-Paul Bordes', 'resident', 'active'),
  -- Morlanne
  ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000012', 'Secrétariat Mairie', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000012', 'Claude Peyret', 'resident', 'active'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000012', 'Martine Soubirous', 'resident', 'active');

-- ================================================
-- POSTS
-- ================================================

-- Annonce: Mairie fermée
INSERT INTO posts (id, commune_id, author_id, type, title, body, is_pinned, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001001',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Mairie fermée au public — Travaux budget',
  'La mairie sera fermée au public le lundi 14 et le jeudi 17 avril en raison des travaux de préparation du budget communal.

Pour toute urgence, vous pouvez joindre le secrétariat par téléphone au 05 59 67 56 14 ou par email à contact@saintmedard64.fr.

Nous vous remercions de votre compréhension.',
  true,
  now() - interval '2 hours'
);

-- Annonce: Collecte déchets 1er mai
INSERT INTO posts (id, commune_id, author_id, type, title, body, is_pinned, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001002',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Collecte des déchets — 1er mai',
  'En raison du jour férié du 1er mai, la collecte des ordures ménagères prévue le jeudi 1er mai est reportée au vendredi 2 mai.

Merci de sortir vos bacs la veille au soir.

Pour rappel : bac vert (ordures ménagères) le jeudi, bac jaune (recyclables) un mardi sur deux. En cas de doute, contactez le service environnement CCLO au 05 59 60 95 42.',
  false,
  now() - interval '3 days'
);

-- Annonce: Travaux chemin communal
INSERT INTO posts (id, commune_id, author_id, type, title, body, is_pinned, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001003',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Travaux chemin du lavoir — Circulation modifiée',
  'Des travaux de réfection du chemin communal reliant le lavoir à la mairie débuteront le lundi 21 avril pour une durée estimée de 2 semaines.

La circulation sera déviée par le chemin de la crête. Un plan de déviation sera affiché en mairie et aux entrées du chemin.

Merci de votre patience. Ces travaux amélioreront considérablement l''état de cette voie très empruntée par les promeneurs.',
  false,
  now() - interval '1 day'
);

-- Événement: Voyage Paris croisière
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001004',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'evenement',
  'Voyage "Paris croisière" — Génération Mouvements 64',
  'L''association Génération Mouvements 64 organise un voyage à Paris incluant une croisière sur la Seine et la visite de Montmartre.

Dates : du 15 au 18 juin 2026
Tarif : 380€ par personne (transport, hébergement, visites inclus)
Inscriptions avant le 15 mai auprès du CCAS ou en mairie.

Ouvert à tous les habitants de la commune et des communes voisines.',
  '2026-06-15T08:00:00Z',
  'Départ parking mairie — Paris',
  now() - interval '4 days'
);

-- Événement: Repas des aînés
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001005',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'evenement',
  'Repas des aînés du CCAS',
  'Le CCAS de Saint-Médard vous invite au traditionnel repas des aînés.

Un moment de convivialité autour d''un bon repas préparé par un traiteur local. Animation musicale l''après-midi.

Inscription obligatoire avant le 20 avril auprès du secrétariat de mairie.',
  '2026-04-27T12:00:00Z',
  'Salle des fêtes de Saint-Médard',
  now() - interval '5 days'
);

-- Événement: Tournoi rugby RCSM
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001006',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'evenement',
  'Tournoi de printemps du RCSM',
  'Le Rugby Club Saint-Médard organise son tournoi de printemps annuel !

Au programme :
- 9h00 : Tournoi jeunes (catégories M8 à M14)
- 14h00 : Matchs seniors
- 18h00 : Remise des trophées
- 19h00 : Repas au club (réservation obligatoire)

Buvette et restauration sur place toute la journée. Venez nombreux soutenir nos équipes !',
  '2026-05-10T09:00:00Z',
  'Stade du Moulin, Saint-Médard',
  now() - interval '2 days'
);

-- Entraide: Débroussaillage
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001007',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000101',
  'entraide',
  'Cherche coup de main pour débroussaillage',
  'Bonjour à tous,

J''ai un terrain d''environ 500m² à débroussailler avant l''été (derrière le chemin de la crête). J''ai le matériel mais c''est un gros travail seul.

Si quelqu''un est disponible samedi matin, je serais reconnaissant ! Je peux rendre la pareille pour des travaux ou du bricolage.

On pourra faire un casse-croûte ensemble à midi.',
  now() - interval '1 day'
);

-- Entraide: Covoiturage Orthez
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001008',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000102',
  'entraide',
  'Covoiturage Orthez le mercredi — Places disponibles',
  'Bonjour,

Je descends à Orthez tous les mercredis matin (départ 8h30 du parking de la mairie, retour vers 12h30). J''ai 3 places disponibles dans la voiture.

C''est gratuit, juste du bon sens entre voisins ! Si ça intéresse quelqu''un, répondez ici ou venez directement mercredi matin.',
  now() - interval '6 hours'
);

-- Discussion: Chemin communal
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000102',
  'discussion',
  'Des nouvelles du chemin communal vers le lavoir ?',
  'Quelqu''un sait si les travaux du chemin entre le lavoir et la mairie vont reprendre bientôt ? Ça fait des mois que c''est en plan et c''est devenu vraiment impraticable quand il pleut.

Les enfants l''empruntent pour aller au car scolaire et c''est dangereux avec toute cette boue.',
  now() - interval '4 days'
);

-- Discussion: O'Médard horaires
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001010',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000101',
  'discussion',
  'Horaires d''ouverture du café O''Médard ?',
  'Bonjour, est-ce que quelqu''un connaît les horaires actuels du O''Médard ? J''ai essayé d''y passer vendredi après-midi mais c''était fermé.

Merci !',
  now() - interval '2 days'
);

-- ================================================
-- COMMENTS
-- ================================================

INSERT INTO comments (post_id, author_id, body, created_at) VALUES
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000101', 'Je me posais la même question. La dernière fois que j''ai croisé le maire, il m''a dit que le budget était voté et que ça devrait commencer courant avril.', now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000100', 'Bonjour, les travaux sont effectivement programmés à partir du 21 avril. Un avis sera publié prochainement. Merci de votre patience.', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000102', 'Super merci pour l''info ! Ce sera beaucoup plus sûr pour les enfants.', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000102', 'Je peux venir samedi matin, je suis libre jusqu''à 13h. Je ramène ma débroussailleuse aussi !', now() - interval '12 hours'),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000101', 'Parfait Jeanne, merci ! Rendez-vous à 9h chez moi (maison au bout du chemin de la crête, portail vert). Le café sera prêt !', now() - interval '10 hours'),
  ('00000000-0000-0000-0000-000000001010', '00000000-0000-0000-0000-000000000102', 'Normalement c''est ouvert le vendredi et samedi soir, et le dimanche matin. Mais ça change parfois, le mieux c''est d''appeler avant.', now() - interval '1 day');

-- ================================================
-- RSVPs
-- ================================================

INSERT INTO rsvps (post_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000101', 'going'),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000102', 'going'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000101', 'going'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000102', 'maybe'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000102', 'going');

-- ================================================
-- ADDITIONAL POSTS from saintmedard64.fr/actu/
-- ================================================

-- Fermeture O'Médard Pâques
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001011',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Fermeture du O''Médard pour le week-end de Pâques',
  'Le café O''Médard sera exceptionnellement fermé ce vendredi 3 avril et dimanche 5 avril pour le week-end de Pâques.

Réouverture normale le vendredi suivant. Bonnes fêtes à tous !',
  now() - interval '12 days'
);

-- O'Médard changement de régisseur
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001012',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'O''Médard : changement de régisseur',
  'Après plusieurs années de service au café communal O''Médard, Daniel Labielle prend une retraite bien méritée. Nous le remercions chaleureusement pour son engagement et sa bonne humeur qui ont fait du O''Médard un vrai lieu de vie pour le village.

Un nouveau régisseur prendra ses fonctions prochainement. Les horaires d''ouverture seront communiqués dès que possible.

Merci Daniel !',
  now() - interval '44 days'
);

-- Route de Juren fermée
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001013',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Route de Juren fermée — Mercredi 11 février',
  'Le mercredi 11 février 2026 de 13h à 17h, la route de Juren sera fermée à la circulation pour des travaux d''entretien.

Déviation possible par la route de la crête. Merci de votre compréhension.',
  now() - interval '63 days'
);

-- Vœux du maire
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001014',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'evenement',
  'Cérémonie des vœux du maire',
  'Le maire et le conseil municipal vous convient à la cérémonie des vœux pour la nouvelle année.

Au programme : allocution du maire, bilan de l''année écoulée et projets pour 2026, suivis d''un moment de convivialité autour du verre de l''amitié.

Tous les habitants sont les bienvenus !',
  '2026-01-17T18:00:00Z',
  'Salle des fêtes de Saint-Médard',
  now() - interval '87 days'
);

-- Intervention Enedis
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001015',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'annonce',
  'Intervention Enedis — Coupure électrique le 23 décembre',
  'Enedis interviendra le mardi 23 décembre au matin sur le réseau électrique de la commune.

Rues concernées : chemin du Moulin, route de Juren, chemin de la crête.
Horaires : 8h30 à 12h30.

Pensez à éteindre vos appareils sensibles avant la coupure.',
  now() - interval '111 days'
);

-- Entraide: Garde de poules
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001016',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000102',
  'entraide',
  'Qui pourrait garder mes poules pendant les vacances ?',
  'Bonjour,

Je pars en vacances du 28 avril au 5 mai et je cherche quelqu''un qui pourrait passer donner à manger à mes 4 poules (chemin du Moulin).

C''est très simple : un seau de grain le matin et vérifier qu''elles ont de l''eau. En échange vous pouvez garder les œufs !

Merci d''avance.',
  now() - interval '3 hours'
);

-- Discussion: Pétanque
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001017',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000101',
  'discussion',
  'Concours de pétanque Saint-Médard Loisirs — Qui participe ?',
  'Saint-Médard Loisirs organise un concours de pétanque le dimanche 4 mai sur le terrain derrière la salle des fêtes.

Inscription en doublette, 5€ par équipe. Qui est chaud ? On peut monter une équipe ensemble si quelqu''un cherche un partenaire.',
  now() - interval '8 hours'
);

-- Additional comments
INSERT INTO comments (post_id, author_id, body, created_at) VALUES
  ('00000000-0000-0000-0000-000000001016', '00000000-0000-0000-0000-000000000101', 'Je peux passer le matin avant le boulot, c''est sur ma route. Envoie-moi un message pour les détails !', now() - interval '2 hours');

-- Additional RSVPs
INSERT INTO rsvps (post_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-000000001014', '00000000-0000-0000-0000-000000000101', 'going'),
  ('00000000-0000-0000-0000-000000001014', '00000000-0000-0000-0000-000000000102', 'going');

-- ================================================
-- ARTHEZ-DE-BÉARN POSTS
-- ================================================

-- Annonce: Salon du livre ACPA
INSERT INTO posts (id, commune_id, author_id, type, title, body, is_pinned, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002001',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000200',
  'annonce',
  'Salon du livre et de la BD — Samedi 25 avril',
  'L''Association Culturelle du Pays d''Arthez (ACPA) organise son salon annuel du livre et de la bande dessinée le samedi 25 avril à la salle des fêtes.

Entrée libre de 10h à 18h. Une vingtaine d''auteurs et illustrateurs seront présents pour des dédicaces. Ateliers dessin pour les enfants l''après-midi.

Buvette et restauration sur place.',
  true,
  now() - interval '1 day'
);

-- Annonce: Travaux piscine
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002002',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000200',
  'annonce',
  'Piscine municipale — Fermeture pour entretien',
  'La piscine municipale sera fermée du 14 au 28 avril pour les travaux d''entretien annuels.

Réouverture prévue le mardi 29 avril aux horaires habituels. Merci de votre compréhension.',
  now() - interval '3 days'
);

-- Annonce: France Services
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002003',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000200',
  'annonce',
  'France Services — Permanence carte d''identité',
  'Rappel : la permanence pour les demandes de carte d''identité et passeport se tient chaque mardi matin de 9h à 12h à l''espace France Services.

Pensez à prendre rendez-vous au 05 59 67 70 52. Pièces à fournir disponibles sur service-public.fr.',
  now() - interval '5 days'
);

-- Événement: Tournoi U15 FC BAAL
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002004',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000200',
  'evenement',
  'Tournoi international U15 — FC BAAL',
  'Le FC BAAL organise son tournoi international de football en catégorie U15.

8 équipes venues de toute la région et d''Espagne s''affronteront sur les terrains du complexe sportif. Finale à 17h suivie de la remise des trophées.

Entrée gratuite, buvette et grillades sur place.',
  '2026-06-07T09:00:00Z',
  'Complexe sportif, Arthez-de-Béarn',
  now() - interval '2 days'
);

-- Événement: Trail APE
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002005',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000200',
  'evenement',
  'Trail et randonnée — APE École publique',
  'L''association des parents d''élèves organise une journée trail et randonnée ouverte à tous !

Parcours trail : 15 km (dénivelé 350m)
Parcours randonnée : 8 km (accessible à tous)
Départ à 9h30 depuis le gymnase.

Inscription 5€ adulte, gratuit -12 ans. Ravitaillement sur le parcours.',
  '2026-05-31T09:30:00Z',
  'Gymnase municipal, Arthez-de-Béarn',
  now() - interval '4 days'
);

-- Entraide: Pèlerins Compostelle
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002006',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000201',
  'entraide',
  'Accueil pèlerins — Besoin de bénévoles',
  'Bonjour,

La saison des pèlerins reprend sur le chemin de Compostelle et la Maison des pèlerins a besoin de bénévoles pour l''accueil du soir (18h-20h).

Si vous avez une soirée de libre par semaine ou par mois, c''est un moment d''échange vraiment enrichissant. On rencontre des gens du monde entier !

Contactez-moi ou passez à la médiathèque.',
  now() - interval '6 hours'
);

-- Entraide: Covoiturage Pau
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002007',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000202',
  'entraide',
  'Covoiturage Pau — Tous les lundis et jeudis',
  'Je travaille à Pau et je fais le trajet Arthez-Pau les lundis et jeudis (départ 7h30, retour 18h). J''ai 2 places dans ma voiture.

Participation aux frais : 3€ l''aller simple. Intéressé(e) ? Répondez ici.',
  now() - interval '2 days'
);

-- Discussion: Médiathèque horaires d'été
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002008',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000201',
  'discussion',
  'Horaires d''été de la médiathèque ?',
  'Est-ce que quelqu''un sait si la médiathèque change ses horaires pour l''été ? L''année dernière elle fermait le samedi en juillet-août si je me souviens bien.

Je voudrais m''organiser pour les inscriptions aux activités d''été des enfants.',
  now() - interval '1 day'
);

-- Discussion: Camping
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002009',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000202',
  'discussion',
  'Camping L''Orée du Bois — Ouverture cette année ?',
  'Bonjour, quelqu''un a des nouvelles du camping ? J''ai des amis qui voudraient venir en juin mais le site internet n''a pas été mis à jour depuis l''année dernière.

Merci !',
  now() - interval '3 days'
);

-- Arthez comments
INSERT INTO comments (post_id, author_id, body, created_at) VALUES
  ('00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000000202', 'Je suis disponible le mercredi soir, c''est possible ? J''ai fait le chemin moi-même il y a 3 ans, ça me ferait plaisir de rendre la pareille.', now() - interval '4 hours'),
  ('00000000-0000-0000-0000-000000002006', '00000000-0000-0000-0000-000000000201', 'Bien sûr Jean-Paul ! Le mercredi c''est parfait. Passe à la Maison des pèlerins mercredi vers 17h30, je te ferai faire le tour.', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000002008', '00000000-0000-0000-0000-000000000200', 'Bonjour Marie, les horaires d''été seront communiqués fin mai. La médiathèque restera ouverte le samedi matin en juillet cette année.', now() - interval '12 hours'),
  ('00000000-0000-0000-0000-000000002009', '00000000-0000-0000-0000-000000000201', 'J''ai vu de la lumière là-bas la semaine dernière, ils préparent peut-être l''ouverture. Je passerai demander.', now() - interval '2 days');

-- Arthez RSVPs
INSERT INTO rsvps (post_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000000201', 'going'),
  ('00000000-0000-0000-0000-000000002004', '00000000-0000-0000-0000-000000000202', 'going'),
  ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000000201', 'going'),
  ('00000000-0000-0000-0000-000000002005', '00000000-0000-0000-0000-000000000202', 'maybe');

-- ================================================
-- MORLANNE POSTS
-- ================================================

-- Annonce: Marché producteurs
INSERT INTO posts (id, commune_id, author_id, type, title, body, is_pinned, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003001',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000300',
  'annonce',
  'Marché de producteurs — Reprise le 19 avril',
  'Le marché de producteurs de Morlanne reprend chaque samedi matin de 9h à 12h30 sur la place du château à partir du 19 avril.

Fromages, charcuterie, miel, légumes de saison, pain au levain et pâtisseries. Venez soutenir nos producteurs locaux !',
  true,
  now() - interval '2 hours'
);

-- Annonce: Château saison
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003002',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000300',
  'annonce',
  'Château de Morlanne — Ouverture de la saison 2026',
  'Le château de Morlanne ouvre ses portes pour la saison le mercredi 16 avril.

Horaires : mercredi au dimanche, 10h30-12h30 / 14h-18h.
Tarif : 5€ adulte, gratuit -18 ans.

Nouveauté : visite guidée thématique « Gaston Fébus et la chasse au Moyen Âge » les dimanches à 15h.',
  now() - interval '3 days'
);

-- Annonce: Travaux route
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003003',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000300',
  'annonce',
  'Travaux route de Maslacq — Sens unique temporaire',
  'Des travaux de voirie sur la route de Maslacq imposeront un sens unique alterné du 21 au 25 avril.

Circulation régulée par feux tricolores. Prévoir 5 minutes de plus pour vos trajets. Déviation possible par la route d''Arzacq.',
  now() - interval '1 day'
);

-- Événement: Randonnée patrimoine
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003004',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000300',
  'evenement',
  'Randonnée patrimoine — Découverte du village fortifié',
  'Le club de randonnée et l''association patrimoine vous proposent une balade commentée de 6 km à travers le village et ses alentours.

Points d''intérêt : château, église fortifiée, maisons médiévales, lavoir, point de vue sur les Pyrénées.

Accessible à tous. Chaussures de marche conseillées. Goûter offert à l''arrivée.',
  '2026-05-04T14:00:00Z',
  'Départ place du château, Morlanne',
  now() - interval '2 days'
);

-- Événement: Vide-grenier
INSERT INTO posts (id, commune_id, author_id, type, title, body, event_date, event_location, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003005',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000300',
  'evenement',
  'Vide-grenier annuel du comité des fêtes',
  'Le comité des fêtes organise le vide-grenier annuel !

Exposants : 2€ le mètre linéaire, inscription avant le 10 mai auprès de la mairie.
Visiteurs : entrée libre dès 8h.

Restauration sur place : grillades, frites, crêpes. Buvette toute la journée.',
  '2026-05-18T08:00:00Z',
  'Place du château et rues du village, Morlanne',
  now() - interval '4 days'
);

-- Entraide: Tonte moutons
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003006',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000301',
  'entraide',
  'Cherche tondeur de moutons',
  'Bonjour,

J''ai 6 brebis à tondre avant l''été. Mon tondeur habituel a pris sa retraite et je ne trouve personne dans le coin.

Si quelqu''un connaît un tondeur fiable ou sait le faire, je suis preneur. Je peux aussi échanger un service en retour (bricolage, jardin, etc.).

Merci !',
  now() - interval '8 hours'
);

-- Entraide: Légumes potager
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003007',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000302',
  'entraide',
  'Plants de tomates et courgettes à donner',
  'J''ai fait trop de semis cette année ! J''ai une trentaine de plants de tomates (cœur de bœuf, marmande, cerise) et une dizaine de plants de courgettes à donner.

Venez les chercher chez moi (maison face à l''église) avant qu''ils ne montent trop. Premier arrivé, premier servi !',
  now() - interval '4 hours'
);

-- Discussion: Chemin randonnée
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003008',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000301',
  'discussion',
  'Sentier du château — Balisage effacé ?',
  'J''ai fait le sentier du château dimanche avec des amis et on s''est perdus au niveau du croisement après le lavoir. Les marques jaunes sont presque effacées.

Est-ce que quelqu''un sait si un rebalisage est prévu ? C''est dommage parce que c''est une très belle balade.',
  now() - interval '1 day'
);

-- Discussion: Poste
INSERT INTO posts (id, commune_id, author_id, type, title, body, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003009',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000302',
  'discussion',
  'Agence postale fermée mercredi ?',
  'L''agence postale est-elle toujours fermée le mercredi après-midi ? Je dois envoyer un recommandé et je ne peux pas y aller le matin.

Quelqu''un sait si on peut déposer à Arzacq sinon ?',
  now() - interval '2 days'
);

-- Morlanne comments
INSERT INTO comments (post_id, author_id, body, created_at) VALUES
  ('00000000-0000-0000-0000-000000003006', '00000000-0000-0000-0000-000000000302', 'Mon voisin à Arzacq tond encore, il s''appelle Bernard Loustau. Je te retrouve son numéro.', now() - interval '6 hours'),
  ('00000000-0000-0000-0000-000000003006', '00000000-0000-0000-0000-000000000301', 'Merci Martine ! Ce serait super. Il fait les petits troupeaux aussi ?', now() - interval '5 hours'),
  ('00000000-0000-0000-0000-000000003008', '00000000-0000-0000-0000-000000000300', 'Le rebalisage est prévu pour fin avril avec le club de randonnée. Merci du signalement !', now() - interval '12 hours'),
  ('00000000-0000-0000-0000-000000003008', '00000000-0000-0000-0000-000000000302', 'J''avais remarqué la même chose il y a 2 semaines. En attendant, il faut prendre à gauche au croisement après le lavoir.', now() - interval '10 hours'),
  ('00000000-0000-0000-0000-000000003009', '00000000-0000-0000-0000-000000000301', 'Oui le mercredi c''est fermé l''après-midi mais ouvert le matin de 9h à 12h. Sinon Arzacq c''est ouvert tout le mercredi.', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000003007', '00000000-0000-0000-0000-000000000301', 'Je passe demain matin prendre quelques plants de tomates ! Merci Martine, tu es géniale.', now() - interval '3 hours');

-- Morlanne RSVPs
INSERT INTO rsvps (post_id, user_id, status) VALUES
  ('00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000000301', 'going'),
  ('00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000000302', 'going'),
  ('00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000000301', 'going'),
  ('00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000000302', 'maybe');

-- ================================================
-- SERVICE POSTS (all communes)
-- ================================================

-- Saint-Médard: Tonte de pelouse
INSERT INTO posts (id, commune_id, author_id, type, title, body, expires_at, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001018',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000101',
  'service',
  'Tonte de pelouse — Disponible ce week-end',
  'Je propose de tondre votre pelouse ce samedi ou dimanche. J''ai ma propre tondeuse.

Tarif : 20€ pour un terrain standard, 30€ pour les grands terrains.

Contactez-moi ici ou par commentaire.',
  now() + interval '7 days',
  now() - interval '1 hour'
);

-- Saint-Médard: Garde d'enfants
INSERT INTO posts (id, commune_id, author_id, type, title, body, expires_at, created_at) VALUES
(
  '00000000-0000-0000-0000-000000001019',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000102',
  'service',
  'Garde d''enfants mercredi après-midi',
  'Je suis disponible les mercredis après-midi pour garder vos enfants (3-10 ans).

Expérience : maman de 3 enfants, ancienne assistante maternelle.
Tarif : 8€/heure, goûter inclus.

Je me déplace sur Saint-Médard et alentours.',
  now() + interval '7 days',
  now() - interval '3 hours'
);

-- Arthez: Cours de maths
INSERT INTO posts (id, commune_id, author_id, type, title, body, expires_at, created_at) VALUES
(
  '00000000-0000-0000-0000-000000002010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000201',
  'service',
  'Soutien scolaire maths — Collège et lycée',
  'Professeure à la retraite, je propose du soutien en mathématiques pour collégiens et lycéens.

Tarif : 15€/heure, chez moi ou à la médiathèque.
Disponible lundi, mardi et jeudi après-midi.',
  now() + interval '7 days',
  now() - interval '5 hours'
);

-- Morlanne: Petit bricolage
INSERT INTO posts (id, commune_id, author_id, type, title, body, expires_at, created_at) VALUES
(
  '00000000-0000-0000-0000-000000003010',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000301',
  'service',
  'Petit bricolage et réparations — Disponible cette semaine',
  'Bricoleur du dimanche mais efficace ! Je peux vous aider pour :
- Étagères, fixations murales
- Petite plomberie (robinet, joint)
- Montage de meubles

Tarif libre (ce que vous estimez juste). Matériel à votre charge.
Disponible cette semaine, contactez-moi.',
  now() + interval '7 days',
  now() - interval '2 hours'
);
